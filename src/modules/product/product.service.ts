import pool from "../../config/db";

export const getAllProducts = async (
  isSuperAdmin: boolean,
  restaurantId: number,
) => {
  const whereClause = isSuperAdmin ? "" : "WHERE p.restaurant_id = $1";
  const params = isSuperAdmin ? [] : [restaurantId];

  const result = await pool.query(
    `SELECT p.*, r.name AS restaurant_name, u.name AS created_by_name
     FROM products p
     JOIN restaurants r ON p.restaurant_id = r.id
     LEFT JOIN users u ON p.created_by = u.id
     ${whereClause}
     ORDER BY p.name ASC`,
    params,
  );
  return result.rows;
};

export const createProduct = async (
  restaurantId: number,
  name: string,
  price: number,
  isActive: boolean,
  createdBy: number,
) => {
  const result = await pool.query(
    `INSERT INTO products (restaurant_id, name, price, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [restaurantId, name.trim(), price, isActive, createdBy],
  );
  return result.rows[0];
};

export const updateProduct = async (
  id: number,
  name: string,
  price: number,
  isActive: boolean,
) => {
  const result = await pool.query(
    `UPDATE products
     SET name = $1, price = $2, is_active = $3
     WHERE id = $4 RETURNING *`,
    [name.trim(), price, isActive, id],
  );
  return result.rows[0];
};

export const deleteProduct = async (id: number) => {
  const result = await pool.query(
    `DELETE FROM products WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};
