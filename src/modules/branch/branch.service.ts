import pool from "../../config/db";

export const getAllBranches = async () => {
  const result = await pool.query(
    `SELECT b.*, r.name AS restaurant_name 
     FROM branches b
     JOIN restaurants r ON b.restaurant_id = r.id
     WHERE b.is_active = true 
     ORDER BY b.created_at DESC`,
  );
  return result.rows;
};

export const getBranchesByRestaurant = async (restaurantId: number) => {
  const result = await pool.query(
    `SELECT b.*, r.name AS restaurant_name 
     FROM branches b
     JOIN restaurants r ON b.restaurant_id = r.id
     WHERE b.restaurant_id = $1 AND b.is_active = true
     ORDER BY b.created_at DESC`,
    [restaurantId],
  );
  return result.rows;
};

export const getBranchById = async (id: number) => {
  const result = await pool.query(
    `SELECT b.*, r.name AS restaurant_name 
     FROM branches b
     JOIN restaurants r ON b.restaurant_id = r.id
     WHERE b.id = $1`,
    [id],
  );
  return result.rows[0];
};

export const createBranch = async (
  restaurantId: number,
  name: string,
  address: string,
  phone: string,
) => {
  const result = await pool.query(
    `INSERT INTO branches (restaurant_id, name, address, phone)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [restaurantId, name, address, phone],
  );
  return result.rows[0];
};

export const updateBranch = async (
  id: number,
  name: string,
  address: string,
  phone: string,
) => {
  const result = await pool.query(
    `UPDATE branches SET name = $1, address = $2, phone = $3
     WHERE id = $4 RETURNING *`,
    [name, address, phone, id],
  );
  return result.rows[0];
};

export const deleteBranch = async (id: number) => {
  const result = await pool.query(
    `UPDATE branches SET is_active = false WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};
