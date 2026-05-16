import pool from "../../config/db";

export const getAllExpenseTypes = async (
  isSuperAdmin: boolean,
  restaurantId: number,
) => {
  const whereClause = isSuperAdmin ? "" : "WHERE et.restaurant_id = $1";
  const params = isSuperAdmin ? [] : [restaurantId];

  const result = await pool.query(
    `SELECT
       et.*,
       r.name AS restaurant_name,
       COUNT(es.id) AS subcategory_count
     FROM expense_types et
     JOIN restaurants r ON et.restaurant_id = r.id
     LEFT JOIN expense_subcategories es ON es.expense_type_id = et.id
       AND es.is_active = true
     ${whereClause}
     GROUP BY et.id, r.name
     ORDER BY et.name`,
    params,
  );
  return result.rows;
};

export const getExpenseTypeById = async (id: number) => {
  const type = await pool.query(
    `SELECT et.*, r.name AS restaurant_name
     FROM expense_types et
     JOIN restaurants r ON et.restaurant_id = r.id
     WHERE et.id = $1`,
    [id],
  );

  const subcategories = await pool.query(
    `SELECT * FROM expense_subcategories
     WHERE expense_type_id = $1
     ORDER BY name`,
    [id],
  );

  return {
    ...type.rows[0],
    subcategories: subcategories.rows,
  };
};

export const createExpenseType = async (
  restaurantId: number,
  name: string,
  hasSubcategory: boolean,
  subcategories: string[],
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO expense_types (restaurant_id, name, has_subcategory)
       VALUES ($1, $2, $3) RETURNING *`,
      [restaurantId, name.trim().toUpperCase(), hasSubcategory],
    );

    const expenseType = result.rows[0];

    if (hasSubcategory && subcategories.length > 0) {
      for (const sub of subcategories) {
        if (!sub.trim()) continue;
        await client.query(
          `INSERT INTO expense_subcategories (expense_type_id, name)
           VALUES ($1, $2)`,
          [expenseType.id, sub.trim().toUpperCase()],
        );
      }
    }

    await client.query("COMMIT");
    return getExpenseTypeById(expenseType.id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const updateExpenseType = async (
  id: number,
  name: string,
  hasSubcategory: boolean,
) => {
  const result = await pool.query(
    `UPDATE expense_types
     SET name = $1, has_subcategory = $2
     WHERE id = $3 RETURNING *`,
    [name.trim().toUpperCase(), hasSubcategory, id],
  );
  return result.rows[0];
};

export const deleteExpenseType = async (id: number) => {
  // check if used in expenses
  const used = await pool
    .query(`SELECT COUNT(*) FROM misc_expenses WHERE expense_type_id = $1`, [
      id,
    ])
    .catch(() => ({ rows: [{ count: "0" }] }));

  if (parseInt(used.rows[0].count) > 0) {
    throw {
      status: 400,
      message: "Cannot delete — this expense type is used in expenses",
    };
  }

  const result = await pool.query(
    `UPDATE expense_types SET is_active = false WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};

export const addSubcategory = async (expenseTypeId: number, name: string) => {
  const result = await pool.query(
    `INSERT INTO expense_subcategories (expense_type_id, name)
     VALUES ($1, $2) RETURNING *`,
    [expenseTypeId, name.trim().toUpperCase()],
  );
  return result.rows[0];
};

export const updateSubcategory = async (id: number, name: string) => {
  const result = await pool.query(
    `UPDATE expense_subcategories SET name = $1 WHERE id = $2 RETURNING *`,
    [name.trim().toUpperCase(), id],
  );
  return result.rows[0];
};

export const deleteSubcategory = async (id: number) => {
  const result = await pool.query(
    `UPDATE expense_subcategories SET is_active = false
     WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};
