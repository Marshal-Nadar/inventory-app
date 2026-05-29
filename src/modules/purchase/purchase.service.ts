import pool from "../../config/db";
import { addLedgerEntry } from "../stockLedger/stockLedger.service";

export const getAllPurchases = async (
  isSuperAdmin: boolean,
  restaurantId: number,
  filters: {
    vendor_id?: number;
    invoice_number?: string;
    date_from?: string;
    date_to?: string;
    page: number;
    limit: number;
  },
) => {
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (!isSuperAdmin) {
    conditions.push(`p.restaurant_id = $${idx++}`);
    params.push(restaurantId);
  }
  if (filters.vendor_id) {
    conditions.push(`p.vendor_id = $${idx++}`);
    params.push(filters.vendor_id);
  }
  if (filters.invoice_number) {
    conditions.push(`p.invoice_number ILIKE $${idx++}`);
    params.push(`%${filters.invoice_number}%`);
  }
  if (filters.date_from) {
    conditions.push(`p.purchase_date >= $${idx++}::date`);
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push(`p.purchase_date <= $${idx++}::date`);
    params.push(filters.date_to);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // total count
  const countResult = await pool.query(
    `SELECT COUNT(*) 
   FROM purchases p
   LEFT JOIN vendors v ON p.vendor_id = v.id
   LEFT JOIN restaurants r ON p.restaurant_id = r.id
   ${whereClause}`,
    params,
  );

  const total = Number(countResult.rows[0].count);

  // paginated data
  const offset = (filters.page - 1) * filters.limit;
  const dataResult = await pool.query(
    `SELECT 
     p.*,
     v.name AS vendor_name,
     r.name AS restaurant_name,
     r.storage_room_name AS storage_room_name
   FROM purchases p
   LEFT JOIN vendors v ON p.vendor_id = v.id
   LEFT JOIN restaurants r ON p.restaurant_id = r.id
   ${whereClause}
   ORDER BY p.purchase_date DESC, p.id DESC
   LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, filters.limit, offset],
  );

  return {
    data: dataResult.rows,
    pagination: {
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
};

export const getPurchaseReport = async (
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
     TO_CHAR(p.purchase_date, 'YYYY-MM-DD') AS purchase_date,
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

  // fetch items for each purchase
  const purchasesWithItems = await Promise.all(
    purchases.rows.map(async (p) => {
      const items = await pool.query(
        `SELECT
         pi.quantity,
         pi.metric,
         pi.price_per_unit,
         pi.total_cost,
         rm.name AS raw_material_name,
         rm.category
       FROM purchase_items pi
       JOIN raw_materials rm ON pi.raw_material_id = rm.id
       WHERE pi.purchase_id = $1
       ORDER BY pi.id`,
        [p.id],
      );
      return { ...p, items: items.rows };
    }),
  );

  return {
    summary: summary.rows[0] || null,
    purchases: purchasesWithItems,
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

      // write ledger entry instead of direct stock update
      await addLedgerEntry(
        client,
        restaurantId,
        item.raw_material_id,
        "purchase_in",
        item.quantity,
        purchase.id,
        "purchase",
        `Purchase from invoice ${invoiceNumber}`,
        createdBy,
      );

      // sync current_stock from ledger
      await client.query(
        `UPDATE raw_materials
     SET current_stock = (
       SELECT COALESCE(
         SUM(CASE
           WHEN entry_type IN ('purchase_in', 'transfer_in') THEN quantity
           WHEN entry_type = 'transfer_out' THEN -quantity
           WHEN entry_type = 'adjustment' THEN quantity
           ELSE 0
         END), 0)
       FROM stock_ledger
       WHERE raw_material_id = $1
     )
     WHERE id = $1`,
        [item.raw_material_id],
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

export const updatePurchase = async (
  id: number,
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

    const totalCost = items.reduce((sum, item) => sum + item.total_cost, 0);

    // update header
    await client.query(
      `UPDATE purchases
       SET vendor_id = $1,
           invoice_number = $2,
           purchase_date = $3,
           notes = $4,
           total_cost = $5
       WHERE id = $6`,
      [vendorId, invoiceNumber, purchaseDate, notes, totalCost, id],
    );

    // get old items
    const oldItems = await client.query(
      `SELECT raw_material_id, quantity FROM purchase_items WHERE purchase_id = $1`,
      [id],
    );

    // reverse old stock via adjustment ledger entry
    for (const old of oldItems.rows) {
      await addLedgerEntry(
        client,
        restaurantId,
        old.raw_material_id,
        "adjustment",
        -old.quantity,
        id,
        "purchase_update_reversal",
        `Reversal for purchase update on invoice ${invoiceNumber}`,
        createdBy,
      );
    }

    // delete old items
    await client.query(`DELETE FROM purchase_items WHERE purchase_id = $1`, [
      id,
    ]);

    // insert new items with ledger entries
    for (const item of items) {
      await client.query(
        `INSERT INTO purchase_items
      (purchase_id, raw_material_id, quantity, metric, price_per_unit, total_cost)
     VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          item.raw_material_id,
          item.quantity,
          item.metric,
          item.price_per_unit,
          item.total_cost,
        ],
      );

      await addLedgerEntry(
        client,
        restaurantId,
        item.raw_material_id,
        "purchase_in",
        item.quantity,
        id,
        "purchase",
        `Purchase update on invoice ${invoiceNumber}`,
        createdBy,
      );

      // sync current_stock
      await client.query(
        `UPDATE raw_materials
     SET current_stock = (
       SELECT COALESCE(
         SUM(CASE
           WHEN entry_type IN ('purchase_in', 'transfer_in') THEN quantity
           WHEN entry_type = 'transfer_out' THEN -quantity
           WHEN entry_type = 'adjustment' THEN quantity
           ELSE 0
         END), 0)
       FROM stock_ledger
       WHERE raw_material_id = $1
     )
     WHERE id = $1`,
        [item.raw_material_id],
      );
    }

    await client.query("COMMIT");
    return getPurchaseById(id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const deletePurchase = async (id: number) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const purchaseData = await client.query(
      `SELECT restaurant_id, invoice_number, created_by FROM purchases WHERE id = $1`,
      [id],
    );
    const purchase = purchaseData.rows[0];

    const items = await client.query(
      `SELECT raw_material_id, quantity FROM purchase_items WHERE purchase_id = $1`,
      [id],
    );

    for (const item of items.rows) {
      await addLedgerEntry(
        client,
        purchase.restaurant_id,
        item.raw_material_id,
        "adjustment",
        -item.quantity,
        id,
        "purchase_deletion",
        `Purchase deleted — invoice ${purchase.invoice_number}`,
        purchase.created_by,
      );

      // sync current_stock
      await client.query(
        `UPDATE raw_materials
         SET current_stock = (
           SELECT COALESCE(
             SUM(CASE
               WHEN entry_type IN ('purchase_in', 'transfer_in') THEN quantity
               WHEN entry_type = 'transfer_out' THEN -quantity
               WHEN entry_type = 'adjustment' THEN quantity
               ELSE 0
             END), 0)
           FROM stock_ledger
           WHERE raw_material_id = $1
         )
         WHERE id = $1`,
        [item.raw_material_id],
      );
    }

    const result = await client.query(
      `DELETE FROM purchases WHERE id = $1 RETURNING *`,
      [id],
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const getStockSummary = async (
  isSuperAdmin: boolean,
  restaurantId: number,
) => {
  if (isSuperAdmin) {
    const result = await pool.query(
      `SELECT
         rm.id,
         rm.name,
         rm.category,
         rm.metric,
         rm.current_stock,
         rm.min_stock,
         r.name AS restaurant_name,
         COALESCE(
           SUM(pi.quantity * pi.price_per_unit) / NULLIF(SUM(pi.quantity), 0),
           0
         ) AS avg_price_per_unit,
         COALESCE(SUM(pi.quantity), 0) AS total_qty_purchased,
         COALESCE(SUM(pi.total_cost), 0) AS total_spend
       FROM raw_materials rm
       JOIN restaurants r ON rm.restaurant_id = r.id
       LEFT JOIN purchase_items pi ON pi.raw_material_id = rm.id
       LEFT JOIN purchases p ON pi.purchase_id = p.id
       WHERE rm.is_active = true
       GROUP BY rm.id, rm.name, rm.category, rm.metric,
                rm.current_stock, rm.min_stock, r.name
       ORDER BY rm.category, rm.name`,
    );
    return result.rows;
  } else {
    const result = await pool.query(
      `SELECT
         rm.id,
         rm.name,
         rm.category,
         rm.metric,
         rm.current_stock,
         rm.min_stock,
         r.name AS restaurant_name,
         COALESCE(
           SUM(pi.quantity * pi.price_per_unit) / NULLIF(SUM(pi.quantity), 0),
           0
         ) AS avg_price_per_unit,
         COALESCE(SUM(pi.quantity), 0) AS total_qty_purchased,
         COALESCE(SUM(pi.total_cost), 0) AS total_spend
       FROM raw_materials rm
       JOIN restaurants r ON rm.restaurant_id = r.id
       LEFT JOIN purchase_items pi ON pi.raw_material_id = rm.id
       LEFT JOIN purchases p ON pi.purchase_id = p.id
       WHERE rm.is_active = true
         AND rm.restaurant_id = $1
       GROUP BY rm.id, rm.name, rm.category, rm.metric,
                rm.current_stock, rm.min_stock, r.name
       ORDER BY rm.category, rm.name`,
      [restaurantId],
    );
    return result.rows;
  }
};
