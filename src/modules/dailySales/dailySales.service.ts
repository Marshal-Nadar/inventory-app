import pool from "../../config/db";

export const getAutoValues = async (branchId: number, date: string) => {
  // outdoor catering = payments made on this date for this branch's pre-bookings
  const outdoorResult = await pool.query(
    `SELECT COALESCE(SUM(pbp.amount), 0) AS outdoor_catering
     FROM pre_booking_payments pbp
     JOIN pre_bookings pb ON pbp.booking_id = pb.id
     WHERE pb.branch_id = $1
       AND pbp.created_at::date = $2::date`,
    [branchId, date],
  );

  // misc expense = expenses for this branch on this date
  const miscResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS misc_expense
     FROM misc_expenses
     WHERE branch_id = $1
       AND expense_date = $2::date`,
    [branchId, date],
  );

  return {
    outdoor_catering: Number(outdoorResult.rows[0].outdoor_catering),
    misc_expense: Number(miscResult.rows[0].misc_expense),
  };
};

export const getByBranchAndDate = async (branchId: number, date: string) => {
  const result = await pool.query(
    `SELECT
     ds.*,
     TO_CHAR(ds.sale_date, 'YYYY-MM-DD') AS sale_date,
     b.name AS branch_name,
     r.name AS restaurant_name,
     u1.name AS created_by_name,
     u2.name AS updated_by_name
   FROM daily_sales ds
   JOIN branches b ON ds.branch_id = b.id
   JOIN restaurants r ON ds.restaurant_id = r.id
   LEFT JOIN users u1 ON ds.created_by = u1.id
   LEFT JOIN users u2 ON ds.updated_by = u2.id
   WHERE ds.branch_id = $1
     AND ds.sale_date = $2::date`,
    [branchId, date],
  );
  return result.rows[0] || null;
};

export const getAllDailySales = async (
  isSuperAdmin: boolean,
  restaurantId: number,
  canManageStore: boolean,
  branchId: number | null,
  filters: {
    branch_id?: number;
    date_from?: string;
    date_to?: string;
  },
) => {
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (!isSuperAdmin) {
    conditions.push(`ds.restaurant_id = $${idx++}`);
    params.push(restaurantId);
  }

  // branch-level users only see their own branch
  if (!isSuperAdmin && !canManageStore && branchId) {
    conditions.push(`ds.branch_id = $${idx++}`);
    params.push(branchId);
  } else if (filters.branch_id) {
    conditions.push(`ds.branch_id = $${idx++}`);
    params.push(filters.branch_id);
  }

  if (filters.date_from) {
    conditions.push(`ds.sale_date >= $${idx++}::date`);
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    conditions.push(`ds.sale_date <= $${idx++}::date`);
    params.push(filters.date_to);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query(
    `SELECT
     ds.id, ds.restaurant_id, ds.branch_id,
     TO_CHAR(ds.sale_date, 'YYYY-MM-DD') AS sale_date,
     ds.petpooja_total, ds.ns_total, ds.outdoor_catering,
     ds.upi, ds.cash, ds.misc_expense, ds.swiggy, ds.zomato,
     ds.net_sales, ds.net_counter, ds.difference,
     ds.created_by, ds.updated_by, ds.created_at, ds.updated_at,
     b.name AS branch_name,
     r.name AS restaurant_name,
     u1.name AS created_by_name
   FROM daily_sales ds
   JOIN branches b ON ds.branch_id = b.id
   JOIN restaurants r ON ds.restaurant_id = r.id
   LEFT JOIN users u1 ON ds.created_by = u1.id
   ${whereClause}
   ORDER BY ds.sale_date DESC, b.name ASC`,
    params,
  );
  return result.rows;
};

export const upsertDailySales = async (
  restaurantId: number,
  branchId: number,
  saleDate: string,
  data: {
    petpooja_total: number;
    ns_total: number;
    outdoor_catering: number;
    upi: number;
    cash: number;
    misc_expense: number;
    swiggy: number;
    zomato: number;
    net_sales: number;
    net_counter: number;
    difference: number;
  },
  userId: number,
) => {
  const result = await pool.query(
    `INSERT INTO daily_sales (
       restaurant_id, branch_id, sale_date,
       petpooja_total, ns_total, outdoor_catering,
       upi, cash, misc_expense, swiggy, zomato,
       net_sales, net_counter, difference,
       created_by, updated_by
     ) VALUES (
       $1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15
     )
     ON CONFLICT (branch_id, sale_date)
     DO UPDATE SET
       petpooja_total  = EXCLUDED.petpooja_total,
       ns_total        = EXCLUDED.ns_total,
       outdoor_catering = EXCLUDED.outdoor_catering,
       upi             = EXCLUDED.upi,
       cash            = EXCLUDED.cash,
       misc_expense    = EXCLUDED.misc_expense,
       swiggy          = EXCLUDED.swiggy,
       zomato          = EXCLUDED.zomato,
       net_sales       = EXCLUDED.net_sales,
       net_counter     = EXCLUDED.net_counter,
       difference      = EXCLUDED.difference,
       updated_by      = EXCLUDED.updated_by
     RETURNING *`,
    [
      restaurantId,
      branchId,
      saleDate,
      data.petpooja_total,
      data.ns_total,
      data.outdoor_catering,
      data.upi,
      data.cash,
      data.misc_expense,
      data.swiggy,
      data.zomato,
      data.net_sales,
      data.net_counter,
      data.difference,
      userId,
    ],
  );
  return result.rows[0];
};

export const deleteDailySales = async (id: number) => {
  const result = await pool.query(
    `DELETE FROM daily_sales WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};
