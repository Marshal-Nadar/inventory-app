import pool from "../../config/db";

export const createMiscExpense = async (
  restaurantId: number,
  branchId: number,
  expenseTypeId: number,
  subcategoryId: number | null,
  amount: number,
  paymentMethod: string,
  expenseDate: string,
  notes: string,
  createdBy: number,
) => {
  const result = await pool.query(
    `INSERT INTO misc_expenses
      (restaurant_id, branch_id, expense_type_id, subcategory_id,
       amount, payment_method, expense_date, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      restaurantId,
      branchId,
      expenseTypeId,
      subcategoryId,
      amount,
      paymentMethod,
      expenseDate,
      notes,
      createdBy,
    ],
  );
  return result.rows[0];
};

export const updateMiscExpense = async (
  id: number,
  expenseTypeId: number,
  subcategoryId: number | null,
  amount: number,
  paymentMethod: string,
  expenseDate: string,
  notes: string,
) => {
  const result = await pool.query(
    `UPDATE misc_expenses
     SET expense_type_id = $1,
         subcategory_id = $2,
         amount = $3,
         payment_method = $4,
         expense_date = $5,
         notes = $6
     WHERE id = $7
     RETURNING *`,
    [
      expenseTypeId,
      subcategoryId,
      amount,
      paymentMethod,
      expenseDate,
      notes,
      id,
    ],
  );
  return result.rows[0];
};

export const getAllMiscExpenses = async (
  isSuperAdmin: boolean,
  restaurantId: number,
  branchId: number | null,
  canManageStore: boolean,
) => {
  if (isSuperAdmin) {
    const result = await pool.query(
      `SELECT
         me.*,
         et.name AS expense_type_name,
         es.name AS subcategory_name,
         b.name AS branch_name,
         r.name AS restaurant_name,
         u.name AS created_by_name
       FROM misc_expenses me
       JOIN expense_types et ON me.expense_type_id = et.id
       LEFT JOIN expense_subcategories es ON me.subcategory_id = es.id
       JOIN branches b ON me.branch_id = b.id
       JOIN restaurants r ON me.restaurant_id = r.id
       LEFT JOIN users u ON me.created_by = u.id
       ORDER BY me.expense_date DESC, me.created_at DESC`,
    );
    return result.rows;
  }

  if (canManageStore || branchId === null) {
    // admin/storekeeper sees all branches in their restaurant
    const result = await pool.query(
      `SELECT
         me.*,
         et.name AS expense_type_name,
         es.name AS subcategory_name,
         b.name AS branch_name,
         r.name AS restaurant_name,
         u.name AS created_by_name
       FROM misc_expenses me
       JOIN expense_types et ON me.expense_type_id = et.id
       LEFT JOIN expense_subcategories es ON me.subcategory_id = es.id
       JOIN branches b ON me.branch_id = b.id
       JOIN restaurants r ON me.restaurant_id = r.id
       LEFT JOIN users u ON me.created_by = u.id
       WHERE me.restaurant_id = $1
       ORDER BY me.expense_date DESC, me.created_at DESC`,
      [restaurantId],
    );
    return result.rows;
  }

  // branch level — see only their branch
  const result = await pool.query(
    `SELECT
       me.*,
       et.name AS expense_type_name,
       es.name AS subcategory_name,
       b.name AS branch_name,
       r.name AS restaurant_name,
       u.name AS created_by_name
     FROM misc_expenses me
     JOIN expense_types et ON me.expense_type_id = et.id
     LEFT JOIN expense_subcategories es ON me.subcategory_id = es.id
     JOIN branches b ON me.branch_id = b.id
     JOIN restaurants r ON me.restaurant_id = r.id
     LEFT JOIN users u ON me.created_by = u.id
     WHERE me.branch_id = $1
     ORDER BY me.expense_date DESC, me.created_at DESC`,
    [branchId],
  );
  return result.rows;
};

export const deleteMiscExpense = async (id: number) => {
  const result = await pool.query(
    `DELETE FROM misc_expenses WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};

export const getMiscExpenseReport = async (
  isSuperAdmin: boolean,
  restaurantId: number,
  filters: {
    date_from: string;
    date_to: string;
    branch_id?: number;
    payment_method?: string;
  },
) => {
  const conditions: string[] = [
    `me.expense_date >= $1`,
    `me.expense_date <= $2`,
  ];
  const params: any[] = [filters.date_from, filters.date_to];
  let idx = 3;

  if (!isSuperAdmin) {
    conditions.push(`me.restaurant_id = $${idx++}`);
    params.push(restaurantId);
  }

  if (filters.branch_id) {
    conditions.push(`me.branch_id = $${idx++}`);
    params.push(filters.branch_id);
  }

  if (filters.payment_method) {
    conditions.push(`me.payment_method = $${idx++}`);
    params.push(filters.payment_method);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const result = await pool.query(
    `SELECT
       me.*,
       et.name AS expense_type_name,
       es.name AS subcategory_name,
       b.name AS branch_name,
       r.name AS restaurant_name,
       u.name AS created_by_name
     FROM misc_expenses me
     JOIN expense_types et ON me.expense_type_id = et.id
     LEFT JOIN expense_subcategories es ON me.subcategory_id = es.id
     JOIN branches b ON me.branch_id = b.id
     JOIN restaurants r ON me.restaurant_id = r.id
     LEFT JOIN users u ON me.created_by = u.id
     ${whereClause}
     ORDER BY me.expense_date DESC, me.created_at DESC`,
    params,
  );

  const rows = result.rows;
  const totalAmount = rows.reduce(
    (sum: number, r: any) => sum + Number(r.amount),
    0,
  );
  const cashTotal = rows
    .filter((r: any) => r.payment_method === "cash")
    .reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  const upiTotal = rows
    .filter((r: any) => r.payment_method === "upi")
    .reduce((sum: number, r: any) => sum + Number(r.amount), 0);

  return {
    expenses: rows,
    stats: { total: totalAmount, cash: cashTotal, upi: upiTotal },
  };
};
