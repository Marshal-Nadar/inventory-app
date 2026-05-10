import pool from "../../config/db";
import { PoolClient } from "pg";

export const addLedgerEntry = async (
  client: PoolClient,
  restaurantId: number,
  rawMaterialId: number,
  entryType: "purchase_in" | "transfer_out" | "transfer_in" | "adjustment",
  quantity: number,
  referenceId: number | null,
  referenceType: string | null,
  notes: string,
  createdBy: number,
) => {
  const result = await client.query(
    `INSERT INTO stock_ledger
      (restaurant_id, raw_material_id, entry_type, quantity,
       reference_id, reference_type, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      restaurantId,
      rawMaterialId,
      entryType,
      quantity,
      referenceId,
      referenceType,
      notes,
      createdBy,
    ],
  );
  return result.rows[0];
};

export const getCurrentStock = async (
  rawMaterialId: number,
): Promise<number> => {
  const result = await pool.query(
    `SELECT
       COALESCE(
         SUM(CASE
           WHEN entry_type IN ('purchase_in', 'transfer_in') THEN quantity
           WHEN entry_type IN ('transfer_out') THEN -quantity
           WHEN entry_type = 'adjustment' THEN quantity
           ELSE 0
         END), 0
       ) AS current_stock
     FROM stock_ledger
     WHERE raw_material_id = $1`,
    [rawMaterialId],
  );
  return Number(result.rows[0].current_stock);
};

export const getLedgerByRawMaterial = async (
  rawMaterialId: number,
  restaurantId: number,
  isSuperAdmin: boolean,
) => {
  const whereClause = isSuperAdmin
    ? "WHERE sl.raw_material_id = $1"
    : "WHERE sl.raw_material_id = $1 AND sl.restaurant_id = $2";

  const params = isSuperAdmin ? [rawMaterialId] : [rawMaterialId, restaurantId];

  const result = await pool.query(
    `SELECT
       sl.*,
       rm.name AS raw_material_name,
       rm.metric,
       u.name AS created_by_name
     FROM stock_ledger sl
     JOIN raw_materials rm ON sl.raw_material_id = rm.id
     LEFT JOIN users u ON sl.created_by = u.id
     ${whereClause}
     ORDER BY sl.created_at DESC`,
    params,
  );
  return result.rows;
};

export const getLedgerByRestaurant = async (
  restaurantId: number,
  isSuperAdmin: boolean,
) => {
  if (isSuperAdmin) {
    const result = await pool.query(
      `SELECT
         sl.*,
         rm.name AS raw_material_name,
         rm.category,
         rm.metric,
         r.name AS restaurant_name,
         u.name AS created_by_name
       FROM stock_ledger sl
       JOIN raw_materials rm ON sl.raw_material_id = rm.id
       JOIN restaurants r ON sl.restaurant_id = r.id
       LEFT JOIN users u ON sl.created_by = u.id
       ORDER BY sl.created_at DESC
       LIMIT 100`,
    );
    return result.rows;
  } else {
    const result = await pool.query(
      `SELECT
         sl.*,
         rm.name AS raw_material_name,
         rm.category,
         rm.metric,
         r.name AS restaurant_name,
         u.name AS created_by_name
       FROM stock_ledger sl
       JOIN raw_materials rm ON sl.raw_material_id = rm.id
       JOIN restaurants r ON sl.restaurant_id = r.id
       LEFT JOIN users u ON sl.created_by = u.id
       WHERE sl.restaurant_id = $1
       ORDER BY sl.created_at DESC
       LIMIT 100`,
      [restaurantId],
    );
    return result.rows;
  }
};
