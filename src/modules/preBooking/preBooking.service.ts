import pool from "../../config/db";

const generateOrderId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) FROM pre_bookings WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year],
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `ORD-${year}-${String(count).padStart(4, "0")}`;
};

const computePaymentStatus = (
  amountPaid: number,
  finalAmount: number,
): string => {
  if (amountPaid <= 0) return "unpaid";
  if (amountPaid >= finalAmount) return "paid";
  return "partial";
};

export const getAllPreBookings = async (
  isSuperAdmin: boolean,
  restaurantId: number,
  branchId: number | null,
  canManageStore: boolean,
) => {
  let whereClause = "";
  const params: any[] = [];
  let idx = 1;

  if (isSuperAdmin) {
    whereClause = "";
  } else if (canManageStore) {
    whereClause = `WHERE pb.restaurant_id = $${idx++}`;
    params.push(restaurantId);
  } else {
    whereClause = `WHERE pb.branch_id = $${idx++}`;
    params.push(branchId);
  }

  const result = await pool.query(
    `SELECT
       pb.*,
       TO_CHAR(pb.delivery_date, 'YYYY-MM-DD') AS delivery_date,
       b.name AS branch_name,
       r.name AS restaurant_name,
       u.name AS created_by_name
     FROM pre_bookings pb
     JOIN branches b ON pb.branch_id = b.id
     JOIN restaurants r ON pb.restaurant_id = r.id
     LEFT JOIN users u ON pb.created_by = u.id
     ${whereClause}
     ORDER BY pb.delivery_date ASC, pb.created_at DESC`,
    params,
  );
  return result.rows;
};

export const getPreBookingById = async (id: number) => {
  const booking = await pool.query(
    `SELECT
       pb.id, pb.order_id, pb.restaurant_id, pb.branch_id,
       pb.customer_name, pb.mobile, pb.email, pb.delivery_address,
       pb.subtotal, pb.product_discount_total, pb.overall_discount,
       pb.final_amount, pb.amount_paid, pb.pending_balance,
       pb.payment_method, pb.payment_status, pb.order_status,
       TO_CHAR(pb.delivery_date, 'YYYY-MM-DD') AS delivery_date,
       pb.delivery_time, pb.remarks, pb.notes,
       pb.created_by, pb.created_at, pb.updated_at,
       b.name AS branch_name,
       r.name AS restaurant_name,
       u.name AS created_by_name
     FROM pre_bookings pb
     JOIN branches b ON pb.branch_id = b.id
     JOIN restaurants r ON pb.restaurant_id = r.id
     LEFT JOIN users u ON pb.created_by = u.id
     WHERE pb.id = $1`,
    [id],
  );

  if (!booking.rows[0]) return null;

  const items = await pool.query(
    `SELECT * FROM pre_booking_items WHERE booking_id = $1 ORDER BY id`,
    [id],
  );

  const payments = await pool.query(
    `SELECT
       pbp.*,
       u.name AS created_by_name
     FROM pre_booking_payments pbp
     LEFT JOIN users u ON pbp.created_by = u.id
     WHERE pbp.booking_id = $1
     ORDER BY pbp.created_at ASC`,
    [id],
  );

  return {
    ...booking.rows[0],
    items: items.rows,
    payment_history: payments.rows,
  };
};

export const createPreBooking = async (
  restaurantId: number,
  branchId: number,
  customerName: string,
  mobile: string,
  email: string,
  deliveryAddress: string,
  items: {
    product_id: number;
    product_name: string;
    unit_price: number;
    quantity: number;
    product_discount: number;
    item_total: number;
  }[],
  subtotal: number,
  productDiscountTotal: number,
  overallDiscount: number,
  finalAmount: number,
  amountPaid: number,
  paymentMethod: string | null,
  deliveryDate: string,
  deliveryTime: string,
  remarks: string,
  notes: string,
  createdBy: number,
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderId = await generateOrderId();
    const pendingBalance = finalAmount - amountPaid;
    const paymentStatus = computePaymentStatus(amountPaid, finalAmount);

    const result = await client.query(
      `INSERT INTO pre_bookings (
        order_id, restaurant_id, branch_id,
        customer_name, mobile, email, delivery_address,
        subtotal, product_discount_total, overall_discount,
        final_amount, amount_paid, pending_balance,
        payment_method, payment_status, order_status,
        delivery_date, delivery_time, remarks, notes, created_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,'pending',$16,$17,$18,$19,$20
      ) RETURNING *`,
      [
        orderId,
        restaurantId,
        branchId,
        customerName,
        mobile,
        email,
        deliveryAddress,
        subtotal,
        productDiscountTotal,
        overallDiscount,
        finalAmount,
        amountPaid,
        pendingBalance,
        paymentMethod || null,
        paymentStatus,
        deliveryDate,
        deliveryTime,
        remarks,
        notes,
        createdBy,
      ],
    );

    const booking = result.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO pre_booking_items
          (booking_id, product_id, product_name, unit_price,
           quantity, product_discount, item_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          booking.id,
          item.product_id,
          item.product_name,
          item.unit_price,
          item.quantity,
          item.product_discount,
          item.item_total,
        ],
      );
    }

    await client.query("COMMIT");
    return getPreBookingById(booking.id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const updatePreBookingPayment = async (
  id: number,
  additionalPayment: number,
  paymentMethod: string,
  remarks: string,
  createdBy: number,
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const booking = await client.query(
      `SELECT final_amount, amount_paid FROM pre_bookings WHERE id = $1`,
      [id],
    );

    if (!booking.rows[0]) throw { status: 404, message: "Order not found" };

    const currentPaid = Number(booking.rows[0].amount_paid);
    const finalAmount = Number(booking.rows[0].final_amount);
    const newAmountPaid = currentPaid + additionalPayment;

    if (newAmountPaid > finalAmount) {
      throw {
        status: 400,
        message: `Payment exceeds final amount. Max: ₹${(finalAmount - currentPaid).toFixed(2)}`,
      };
    }

    const newPendingBalance = finalAmount - newAmountPaid;
    const newPaymentStatus = computePaymentStatus(newAmountPaid, finalAmount);

    await client.query(
      `UPDATE pre_bookings
       SET amount_paid = $1,
           pending_balance = $2,
           payment_status = $3,
           payment_method = $4
       WHERE id = $5`,
      [newAmountPaid, newPendingBalance, newPaymentStatus, paymentMethod, id],
    );

    // insert payment history entry
    await client.query(
      `INSERT INTO pre_booking_payments
        (booking_id, amount, payment_method, remarks, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, additionalPayment, paymentMethod, remarks, createdBy],
    );

    await client.query("COMMIT");
    return getPreBookingById(id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const updatePreBooking = async (
  id: number,
  data: {
    customer_name: string;
    mobile: string;
    email: string;
    delivery_address: string;
    items: {
      product_id: number;
      product_name: string;
      unit_price: number;
      quantity: number;
      product_discount: number;
      item_total: number;
    }[];
    subtotal: number;
    product_discount_total: number;
    overall_discount: number;
    final_amount: number;
    additional_payment: number;
    payment_method?: string;
    order_status: string;
    delivery_date: string;
    delivery_time: string;
    remarks: string;
    notes: string;
  },
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT amount_paid FROM pre_bookings WHERE id = $1`,
      [id],
    );
    if (!existing.rows[0]) throw { status: 404, message: "Order not found" };

    const currentPaid = Number(existing.rows[0].amount_paid);
    const newAmountPaid = currentPaid + (data.additional_payment || 0);
    const pendingBalance = Math.max(0, data.final_amount - newAmountPaid);
    const paymentStatus = computePaymentStatus(
      newAmountPaid,
      data.final_amount,
    );

    // update header
    await client.query(
      `UPDATE pre_bookings SET
         customer_name = $1, mobile = $2, email = $3,
         delivery_address = $4, subtotal = $5,
         product_discount_total = $6, overall_discount = $7,
         final_amount = $8, amount_paid = $9, pending_balance = $10,
         payment_method = COALESCE($11, payment_method),
         payment_status = $12, order_status = $13,
         delivery_date = $14, delivery_time = $15,
         remarks = $16, notes = $17
       WHERE id = $18`,
      [
        data.customer_name,
        data.mobile,
        data.email,
        data.delivery_address,
        data.subtotal,
        data.product_discount_total,
        data.overall_discount,
        data.final_amount,
        newAmountPaid,
        pendingBalance,
        data.payment_method || null,
        paymentStatus,
        data.order_status,
        data.delivery_date,
        data.delivery_time,
        data.remarks,
        data.notes,
        id,
      ],
    );

    // replace items
    await client.query(`DELETE FROM pre_booking_items WHERE booking_id = $1`, [
      id,
    ]);

    for (const item of data.items) {
      await client.query(
        `INSERT INTO pre_booking_items
          (booking_id, product_id, product_name, unit_price,
           quantity, product_discount, item_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          item.product_id,
          item.product_name,
          item.unit_price,
          item.quantity,
          item.product_discount,
          item.item_total,
        ],
      );
    }

    await client.query("COMMIT");
    return getPreBookingById(id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const deletePreBooking = async (id: number) => {
  const result = await pool.query(
    `DELETE FROM pre_bookings WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};

export const getProductReport = async (
  isSuperAdmin: boolean,
  restaurantId: number,
  filters: {
    branch_id?: number;
    product_id: number;
    date_from: string;
    date_to: string;
  },
) => {
  const conditions: string[] = [
    `pbi.product_id = $1`,
    `TO_CHAR(pb.delivery_date, 'YYYY-MM-DD') >= $2`,
    `TO_CHAR(pb.delivery_date, 'YYYY-MM-DD') <= $3`,
  ];
  const params: any[] = [
    filters.product_id,
    filters.date_from,
    filters.date_to,
  ];
  let idx = 4;

  if (!isSuperAdmin) {
    conditions.push(`pb.restaurant_id = $${idx++}`);
    params.push(restaurantId);
  }

  if (filters.branch_id) {
    conditions.push(`pb.branch_id = $${idx++}`);
    params.push(filters.branch_id);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const result = await pool.query(
    `SELECT
       pb.id AS booking_id,
       pb.order_id,
       pb.customer_name,
       pb.mobile,
       b.name AS branch_name,
       TO_CHAR(pb.delivery_date, 'YYYY-MM-DD') AS delivery_date,
       pbi.product_name,
       pbi.quantity,
       pbi.unit_price,
       pbi.product_discount,
       pbi.item_total,
       pb.final_amount AS order_total,
       pb.amount_paid,
       pb.payment_status,
       pb.order_status
     FROM pre_booking_items pbi
     JOIN pre_bookings pb ON pbi.booking_id = pb.id
     JOIN branches b ON pb.branch_id = b.id
     ${whereClause}
     ORDER BY pb.delivery_date ASC`,
    params,
  );

  const rows = result.rows;
  const totalQty = rows.reduce(
    (sum: number, r: any) => sum + Number(r.quantity),
    0,
  );
  const totalItemValue = rows.reduce(
    (sum: number, r: any) => sum + Number(r.item_total),
    0,
  );
  const totalPaid = rows.reduce(
    (sum: number, r: any) => sum + Number(r.amount_paid),
    0,
  );

  return {
    rows,
    stats: {
      total_orders: rows.length,
      total_qty: totalQty,
      total_item_value: totalItemValue,
      total_paid: totalPaid,
    },
  };
};
