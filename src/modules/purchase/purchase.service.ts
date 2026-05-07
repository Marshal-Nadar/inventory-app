import pool from "../../config/db";

export const getAllPurchases = async (
  isSuperAdmin: boolean,
  restaurantId: number,
  filters: {
    vendor_id?: number;
    invoice_number?: string;
    date_from?: string;
    date_to?: string;
  },
) => {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (!isSuperAdmin) {
    conditions.push(`p.restaurant_id = $${paramIndex++}`);
    params.push(restaurantId);
  }

  if (filters.vendor_id) {
    conditions.push(`p.vendor_id = $${paramIndex++}`);
    params.push(filters.vendor_id);
  }

  if (filters.invoice_number) {
    conditions.push(`p.invoice_number ILIKE $${paramIndex++}`);
    params.push(`%${filters.invoice_number}%`);
  }

  if (filters.date_from) {
    conditions.push(`p.purchase_date >= $${paramIndex++}`);
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    conditions.push(`p.purchase_date <= $${paramIndex++}`);
    params.push(filters.date_to);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query(
    `SELECT p.*,
            v.name AS vendor_name,
            r.name AS restaurant_name,
            r.storage_room_name,
            u.name AS created_by_name
     FROM purchases p
     JOIN vendors v ON p.vendor_id = v.id
     JOIN restaurants r ON p.restaurant_id = r.id
     LEFT JOIN users u ON p.created_by = u.id
     ${whereClause}
     ORDER BY p.purchase_date DESC, p.created_at DESC`,
    params,
  );

  // aggregate stats from same filtered result
  const totalCount = result.rows.length;
  const totalSpend = result.rows.reduce(
    (sum: number, row: any) => sum + Number(row.total_cost),
    0,
  );

  return {
    purchases: result.rows,
    stats: {
      total_count: totalCount,
      total_spend: Number(totalSpend.toFixed(2)),
    },
  };
};

export const getVendorReport = async (
  restaurantId: number,
  isSuperAdmin: boolean,
  vendorId: number,
  dateFrom: string,
  dateTo: string,
) => {
  const restaurantCondition = isSuperAdmin ? "" : "AND p.restaurant_id = $4";

  const params: any[] = isSuperAdmin
    ? [vendorId, dateFrom, dateTo]
    : [vendorId, dateFrom, dateTo, restaurantId];

  // summary
  const summary = await pool.query(
    `SELECT
       v.id AS vendor_id,
       v.name AS vendor_name,
       v.phone AS vendor_phone,
       COUNT(p.id) AS total_purchases,
       SUM(p.total_cost) AS total_spend,
       MIN(p.purchase_date) AS first_purchase,
       MAX(p.purchase_date) AS last_purchase
     FROM purchases p
     JOIN vendors v ON p.vendor_id = v.id
     WHERE p.vendor_id = $1
       AND p.purchase_date >= $2
       AND p.purchase_date <= $3
       ${restaurantCondition}
     GROUP BY v.id, v.name, v.phone`,
    params,
  );

  // purchases list in range
  const purchases = await pool.query(
    `SELECT
       p.id,
       p.invoice_number,
       p.purchase_date,
       p.total_cost,
       r.name AS restaurant_name,
       r.storage_room_name
     FROM purchases p
     JOIN restaurants r ON p.restaurant_id = r.id
     WHERE p.vendor_id = $1
       AND p.purchase_date >= $2
       AND p.purchase_date <= $3
       ${restaurantCondition}
     ORDER BY p.purchase_date DESC`,
    params,
  );

  // raw materials purchased from this vendor in range
  const materials = await pool.query(
    `SELECT
       rm.name AS raw_material_name,
       rm.category,
       SUM(pi.quantity) AS total_quantity,
       pi.metric,
       SUM(pi.total_cost) AS total_cost
     FROM purchase_items pi
     JOIN purchases p ON pi.purchase_id = p.id
     JOIN raw_materials rm ON pi.raw_material_id = rm.id
     WHERE p.vendor_id = $1
       AND p.purchase_date >= $2
       AND p.purchase_date <= $3
       ${restaurantCondition}
     GROUP BY rm.name, rm.category, pi.metric
     ORDER BY total_cost DESC`,
    params,
  );

  return {
    summary: summary.rows[0] || null,
    purchases: purchases.rows,
    materials: materials.rows,
  };
};

export const getPurchaseById = async (id: number) => {
  const purchase = await pool.query(
    `SELECT p.*,
            v.name AS vendor_name,
            r.name AS restaurant_name,
            r.storage_room_name,
            u.name AS created_by_name
     FROM purchases p
     JOIN vendors v ON p.vendor_id = v.id
     JOIN restaurants r ON p.restaurant_id = r.id
     LEFT JOIN users u ON p.created_by = u.id
     WHERE p.id = $1`,
    [id],
  );

  if (!purchase.rows[0]) return null;

  const items = await pool.query(
    `SELECT pi.*,
            rm.name AS raw_material_name,
            rm.category AS raw_material_category
     FROM purchase_items pi
     JOIN raw_materials rm ON pi.raw_material_id = rm.id
     WHERE pi.purchase_id = $1
     ORDER BY pi.id`,
    [id],
  );

  return {
    ...purchase.rows[0],
    items: items.rows,
  };
};

export const createPurchase = async (
  restaurantId: number,
  vendorId: number,
  invoiceNumber: string,
  purchaseDate: string,
  notes: string,
  items: {
    raw_material_id: number;
    quantity: number;
    metric: string;
    price_per_unit: number;
    total_cost: number;
  }[],
  createdBy: number,
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // calculate overall total
    const totalCost = items.reduce((sum, item) => sum + item.total_cost, 0);

    // insert purchase header
    const purchaseResult = await client.query(
      `INSERT INTO purchases
        (restaurant_id, vendor_id, invoice_number, purchase_date, total_cost, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        restaurantId,
        vendorId,
        invoiceNumber,
        purchaseDate,
        totalCost,
        notes,
        createdBy,
      ],
    );

    const purchase = purchaseResult.rows[0];

    // insert line items
    for (const item of items) {
      await client.query(
        `INSERT INTO purchase_items
          (purchase_id, raw_material_id, quantity, metric, price_per_unit, total_cost)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          purchase.id,
          item.raw_material_id,
          item.quantity,
          item.metric,
          item.price_per_unit,
          item.total_cost,
        ],
      );
    }

    await client.query("COMMIT");
    return getPurchaseById(purchase.id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const deletePurchase = async (id: number) => {
  // purchase_items deleted via ON DELETE CASCADE
  const result = await pool.query(
    `DELETE FROM purchases WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};
