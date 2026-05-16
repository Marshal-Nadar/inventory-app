import pool from "../../config/db";

export const getVendorPaymentSummary = async (
  isSuperAdmin: boolean,
  restaurantId: number,
) => {
  const whereClause = isSuperAdmin ? "" : "WHERE p.restaurant_id = $1";
  const params = isSuperAdmin ? [] : [restaurantId];

  const result = await pool.query(
    `SELECT
       v.id AS vendor_id,
       v.name AS vendor_name,
       v.phone AS vendor_phone,
       COUNT(DISTINCT p.id) AS total_invoices,
       COALESCE(SUM(p.total_cost), 0) AS total_purchases,
       COALESCE(SUM(vp.amount), 0) AS amount_paid,
       COALESCE(SUM(p.total_cost), 0) - COALESCE(SUM(vp.amount), 0) AS outstanding_balance
     FROM vendors v
     JOIN purchases p ON p.vendor_id = v.id
     LEFT JOIN vendor_payments vp ON vp.purchase_id = p.id
     ${whereClause}
     GROUP BY v.id, v.name, v.phone
     ORDER BY outstanding_balance DESC`,
    params,
  );
  return result.rows;
};

export const getVendorInvoices = async (
  vendorId: number,
  restaurantId: number,
  isSuperAdmin: boolean,
) => {
  const restaurantCondition = isSuperAdmin ? "" : "AND p.restaurant_id = $2";
  const params = isSuperAdmin ? [vendorId] : [vendorId, restaurantId];

  const result = await pool.query(
    `SELECT
       p.id AS purchase_id,
       p.invoice_number,
       p.purchase_date,
       p.total_cost AS invoice_amount,
       COALESCE(SUM(vp.amount), 0) AS amount_paid,
       p.total_cost - COALESCE(SUM(vp.amount), 0) AS balance_due
     FROM purchases p
     LEFT JOIN vendor_payments vp ON vp.purchase_id = p.id
     WHERE p.vendor_id = $1
       ${restaurantCondition}
     GROUP BY p.id, p.invoice_number, p.purchase_date, p.total_cost
     ORDER BY p.purchase_date DESC`,
    params,
  );
  return result.rows;
};

export const createPayments = async (
  restaurantId: number,
  vendorId: number,
  payments: {
    purchase_id: number;
    amount: number;
    payment_mode: string;
    payment_date: string;
    notes?: string;
  }[],
  createdBy: number,
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const created = [];

    for (const payment of payments) {
      if (!payment.amount || payment.amount <= 0) continue;

      // validate amount doesn't exceed balance due
      const balanceResult = await client.query(
        `SELECT
           p.total_cost - COALESCE(SUM(vp.amount), 0) AS balance_due
         FROM purchases p
         LEFT JOIN vendor_payments vp ON vp.purchase_id = p.id
         WHERE p.id = $1
         GROUP BY p.total_cost`,
        [payment.purchase_id],
      );

      const balanceDue = Number(balanceResult.rows[0]?.balance_due || 0);

      if (payment.amount > balanceDue) {
        throw {
          status: 400,
          message: `Payment amount (₹${payment.amount}) exceeds balance due (₹${balanceDue.toFixed(2)}) for one of the invoices`,
        };
      }

      const result = await client.query(
        `INSERT INTO vendor_payments
          (restaurant_id, vendor_id, purchase_id, amount, payment_mode, payment_date, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          restaurantId,
          vendorId,
          payment.purchase_id,
          payment.amount,
          payment.payment_mode,
          payment.payment_date,
          payment.notes || "",
          createdBy,
        ],
      );
      created.push(result.rows[0]);
    }

    await client.query("COMMIT");
    return created;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const getPaymentReceipts = async (
  isSuperAdmin: boolean,
  restaurantId: number,
  filters: {
    vendor_id?: number;
    date_from?: string;
    date_to?: string;
    payment_mode?: string;
  },
) => {
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (!isSuperAdmin) {
    conditions.push(`vp.restaurant_id = $${idx++}`);
    params.push(restaurantId);
  }

  if (filters.vendor_id) {
    conditions.push(`vp.vendor_id = $${idx++}`);
    params.push(filters.vendor_id);
  }

  if (filters.date_from) {
    conditions.push(`vp.payment_date >= $${idx++}`);
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    conditions.push(`vp.payment_date <= $${idx++}`);
    params.push(filters.date_to);
  }

  // cash stays cash, online = upi + bank_transfer + cheque
  if (filters.payment_mode === "cash") {
    conditions.push(`vp.payment_mode = 'cash'`);
  } else if (filters.payment_mode === "online") {
    conditions.push(`vp.payment_mode IN ('upi', 'bank_transfer', 'cheque')`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query(
    `SELECT
       vp.id AS payment_id,
       vp.payment_date,
       vp.amount,
       vp.payment_mode,
       vp.notes,
       v.name AS vendor_name,
       v.phone AS vendor_phone,
       p.invoice_number,
       p.purchase_date,
       p.total_cost AS invoice_amount,
       u.name AS recorded_by
     FROM vendor_payments vp
     JOIN vendors v ON vp.vendor_id = v.id
     JOIN purchases p ON vp.purchase_id = p.id
     LEFT JOIN users u ON vp.created_by = u.id
     ${whereClause}
     ORDER BY vp.payment_date DESC, vp.created_at DESC`,
    params,
  );

  const rows = result.rows;
  const totalAmount = rows.reduce(
    (sum: number, row: any) => sum + Number(row.amount),
    0,
  );

  return { receipts: rows, total_amount: totalAmount };
};

export const getPendingPayments = async (
  isSuperAdmin: boolean,
  restaurantId: number,
  vendorId?: number,
) => {
  const conditions: string[] = [`p.total_cost > COALESCE(paid.amount_paid, 0)`];
  const params: any[] = [];
  let idx = 1;

  if (!isSuperAdmin) {
    conditions.push(`p.restaurant_id = $${idx++}`);
    params.push(restaurantId);
  }

  if (vendorId) {
    conditions.push(`p.vendor_id = $${idx++}`);
    params.push(vendorId);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const result = await pool.query(
    `SELECT
       v.name AS vendor_name,
       v.phone AS vendor_phone,
       p.id AS purchase_id,
       p.invoice_number,
       p.purchase_date,
       p.total_cost AS purchase_amount,
       COALESCE(paid.amount_paid, 0) AS amount_paid,
       p.total_cost - COALESCE(paid.amount_paid, 0) AS amount_due
     FROM purchases p
     JOIN vendors v ON p.vendor_id = v.id
     LEFT JOIN (
       SELECT purchase_id, SUM(amount) AS amount_paid
       FROM vendor_payments
       GROUP BY purchase_id
     ) paid ON paid.purchase_id = p.id
     ${whereClause}
     ORDER BY p.purchase_date ASC`,
    params,
  );

  const rows = result.rows;
  const totalDue = rows.reduce(
    (sum: number, row: any) => sum + Number(row.amount_due),
    0,
  );

  return { pending: rows, total_due: totalDue };
};
