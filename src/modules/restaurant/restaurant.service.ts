import pool from "../../config/db";

export const getAllRestaurants = async (isSuperAdmin: boolean) => {
  const result = await pool.query(
    `SELECT * FROM restaurants
     ${!isSuperAdmin ? "WHERE is_active = true" : ""}
     ORDER BY created_at DESC`,
  );
  return result.rows;
};

export const getRestaurantById = async (id: number) => {
  const result = await pool.query(`SELECT * FROM restaurants WHERE id = $1`, [
    id,
  ]);
  return result.rows[0];
};

export const createRestaurant = async (
  name: string,
  slug: string,
  timezone: string,
) => {
  const result = await pool.query(
    `INSERT INTO restaurants (name, slug, timezone)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, slug, timezone],
  );
  return result.rows[0];
};

export const updateRestaurant = async (
  id: number,
  name: string,
  slug: string,
  timezone: string,
) => {
  const result = await pool.query(
    `UPDATE restaurants SET name = $1, slug = $2, timezone = $3
     WHERE id = $4 RETURNING *`,
    [name, slug, timezone, id],
  );
  return result.rows[0];
};

export const deleteRestaurant = async (id: number) => {
  const result = await pool.query(
    `UPDATE restaurants SET is_active = false WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};

export const activateRestaurant = async (id: number) => {
  const result = await pool.query(
    `UPDATE restaurants SET is_active = true WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};
