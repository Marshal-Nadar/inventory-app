import pool from "../../config/db";
import { addLedgerEntry } from "../stockLedger/stockLedger.service";

export const getAllTransferRequests = async (
  isSuperAdmin: boolean,
  canManageStore: boolean,
  restaurantId: number,
  branchId: number | null,
) => {
  if (isSuperAdmin || canManageStore) {
    const result = await pool.query(
      `SELECT tr.*,
              b.name AS branch_name,
              r.name AS restaurant_name,
              u1.name AS requested_by_name,
              u2.name AS actioned_by_name
       FROM transfer_requests tr
       JOIN branches b ON tr.branch_id = b.id
       JOIN restaurants r ON tr.restaurant_id = r.id
       JOIN users u1 ON tr.requested_by = u1.id
       LEFT JOIN users u2 ON tr.actioned_by = u2.id
       ${!isSuperAdmin ? "WHERE tr.restaurant_id = $1" : ""}
       ORDER BY
         CASE tr.status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END,
         tr.created_at DESC`,
      !isSuperAdmin ? [restaurantId] : [],
    );

    // fetch items for each request
    const requests = result.rows;
    for (const req of requests) {
      const items = await pool.query(
        `SELECT tri.*,
          rm.name AS raw_material_name,
          rm.category AS raw_material_category,
          rm.current_stock,
          COALESCE(
            SUM(pi.quantity * pi.price_per_unit) / NULLIF(SUM(pi.quantity), 0),
            0
          ) AS avg_price
   FROM transfer_request_items tri
   JOIN raw_materials rm ON tri.raw_material_id = rm.id
   LEFT JOIN purchase_items pi ON pi.raw_material_id = rm.id
   WHERE tri.transfer_request_id = $1
   GROUP BY tri.id, rm.name, rm.category, rm.current_stock`,
        [req.id],
      );
      req.items = items.rows;
    }
    return requests;
  }

  const result = await pool.query(
    `SELECT tr.*,
            b.name AS branch_name,
            r.name AS restaurant_name,
            u1.name AS requested_by_name,
            u2.name AS actioned_by_name
     FROM transfer_requests tr
     JOIN branches b ON tr.branch_id = b.id
     JOIN restaurants r ON tr.restaurant_id = r.id
     JOIN users u1 ON tr.requested_by = u1.id
     LEFT JOIN users u2 ON tr.actioned_by = u2.id
     WHERE tr.branch_id = $1
     ORDER BY
       CASE tr.status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END,
       tr.created_at DESC`,
    [branchId],
  );

  const requests = result.rows;
  for (const req of requests) {
    const items = await pool.query(
      `SELECT tri.*,
          rm.name AS raw_material_name,
          rm.category AS raw_material_category,
          rm.current_stock,
          COALESCE(
            SUM(pi.quantity * pi.price_per_unit) / NULLIF(SUM(pi.quantity), 0),
            0
          ) AS avg_price
   FROM transfer_request_items tri
   JOIN raw_materials rm ON tri.raw_material_id = rm.id
   LEFT JOIN purchase_items pi ON pi.raw_material_id = rm.id
   WHERE tri.transfer_request_id = $1
   GROUP BY tri.id, rm.name, rm.category, rm.current_stock`,
      [req.id],
    );
    req.items = items.rows;
  }
  return requests;
};

export const createTransferRequest = async (
  restaurantId: number,
  branchId: number,
  items: {
    raw_material_id: number;
    quantity: number;
    metric: string;
  }[],
  notes: string,
  requestedBy: number,
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // validate all items stock
    for (const item of items) {
      const stockResult = await client.query(
        `SELECT current_stock, name FROM raw_materials WHERE id = $1`,
        [item.raw_material_id],
      );

      if (!stockResult.rows[0]) {
        throw {
          status: 404,
          message: `Raw material ID ${item.raw_material_id} not found`,
        };
      }

      const currentStock = Number(stockResult.rows[0].current_stock);

      if (currentStock <= 0) {
        throw {
          status: 400,
          message: `${stockResult.rows[0].name} is out of stock`,
        };
      }

      if (item.quantity > currentStock) {
        throw {
          status: 400,
          message: `${stockResult.rows[0].name}: requested ${item.quantity} but only ${currentStock} ${item.metric} available`,
        };
      }
    }

    // create request header
    const reqResult = await client.query(
      `INSERT INTO transfer_requests
        (restaurant_id, branch_id, notes, requested_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurantId, branchId, notes, requestedBy],
    );

    const request = reqResult.rows[0];

    // insert items
    for (const item of items) {
      await client.query(
        `INSERT INTO transfer_request_items
          (transfer_request_id, raw_material_id, quantity, metric)
         VALUES ($1, $2, $3, $4)`,
        [request.id, item.raw_material_id, item.quantity, item.metric],
      );
    }

    await client.query("COMMIT");
    return request;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const approveTransferRequest = async (
  id: number,
  actionedBy: number,
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const reqResult = await client.query(
      `SELECT * FROM transfer_requests WHERE id = $1 AND status = 'pending'`,
      [id],
    );

    if (!reqResult.rows[0]) {
      throw { status: 404, message: "Pending transfer request not found" };
    }

    const req = reqResult.rows[0];

    // get all items
    const itemsResult = await client.query(
      `SELECT tri.*, rm.name, rm.current_stock
       FROM transfer_request_items tri
       JOIN raw_materials rm ON tri.raw_material_id = rm.id
       WHERE tri.transfer_request_id = $1`,
      [id],
    );

    // validate stock for all items before approving
    for (const item of itemsResult.rows) {
      if (item.quantity > Number(item.current_stock)) {
        throw {
          status: 400,
          message: `Insufficient stock for ${item.name}. Available: ${item.current_stock} ${item.metric}, Requested: ${item.quantity} ${item.metric}`,
        };
      }
    }

    // update status
    await client.query(
      `UPDATE transfer_requests
       SET status = 'approved', actioned_by = $1, actioned_at = NOW()
       WHERE id = $2`,
      [actionedBy, id],
    );

    // deduct stock for each item
    for (const item of itemsResult.rows) {
      await addLedgerEntry(
        client,
        req.restaurant_id,
        item.raw_material_id,
        "transfer_out",
        item.quantity,
        id,
        "transfer_request",
        `Transfer to branch — request #${id}`,
        actionedBy,
      );

      // sync current_stock
      await client.query(
        `UPDATE raw_materials
         SET current_stock = (
           SELECT COALESCE(SUM(CASE
             WHEN entry_type IN ('purchase_in', 'transfer_in') THEN quantity
             WHEN entry_type = 'transfer_out' THEN -quantity
             WHEN entry_type = 'adjustment' THEN quantity
             ELSE 0
           END), 0)
           FROM stock_ledger WHERE raw_material_id = $1
         )
         WHERE id = $1`,
        [item.raw_material_id],
      );
    }

    await client.query("COMMIT");

    // return full request with items
    const updated = await pool.query(
      `SELECT tr.*,
              b.name AS branch_name,
              u1.name AS requested_by_name,
              u2.name AS actioned_by_name
       FROM transfer_requests tr
       JOIN branches b ON tr.branch_id = b.id
       JOIN users u1 ON tr.requested_by = u1.id
       LEFT JOIN users u2 ON tr.actioned_by = u2.id
       WHERE tr.id = $1`,
      [id],
    );
    return updated.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const rejectTransferRequest = async (
  id: number,
  actionedBy: number,
  rejectionReason: string,
) => {
  const result = await pool.query(
    `UPDATE transfer_requests
     SET status = 'rejected',
         actioned_by = $1,
         actioned_at = NOW(),
         rejection_reason = $2
     WHERE id = $3 AND status = 'pending'
     RETURNING *`,
    [actionedBy, rejectionReason, id],
  );

  if (!result.rows[0]) {
    throw { status: 404, message: "Pending transfer request not found" };
  }

  return result.rows[0];
};
