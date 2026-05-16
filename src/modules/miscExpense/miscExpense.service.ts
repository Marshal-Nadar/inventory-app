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
