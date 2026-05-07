import pool from "../../config/db";

export const getAllVendors = async (
  isSuperAdmin: boolean,
  restaurantId: number,
) => {
  if (isSuperAdmin) {
    const result = await pool.query(
      `SELECT v.*, r.name AS restaurant_name,
              u.name AS created_by_name
       FROM vendors v
       JOIN restaurants r ON v.restaurant_id = r.id
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.is_active = true
       ORDER BY v.name`,
    );
    return result.rows;
  } else {
    const result = await pool.query(
      `SELECT v.*, r.name AS restaurant_name,
              u.name AS created_by_name
       FROM vendors v
       JOIN restaurants r ON v.restaurant_id = r.id
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.restaurant_id = $1 AND v.is_active = true
       ORDER BY v.name`,
      [restaurantId],
    );
    return result.rows;
  }
};

export const getVendorById = async (id: number) => {
  const result = await pool.query(
    `SELECT v.*, r.name AS restaurant_name
     FROM vendors v
     JOIN restaurants r ON v.restaurant_id = r.id
     WHERE v.id = $1`,
    [id],
  );
  return result.rows[0];
};

export const createVendor = async (
  restaurantId: number,
  name: string,
  phone: string,
  address: string,
  description: string,
  createdBy: number,
) => {
  const result = await pool.query(
    `INSERT INTO vendors (restaurant_id, name, phone, address, description, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [restaurantId, name.trim(), phone, address, description, createdBy],
  );
  return result.rows[0];
};

export const updateVendor = async (
  id: number,
  name: string,
  phone: string,
  address: string,
  description: string,
) => {
  const result = await pool.query(
    `UPDATE vendors
     SET name = $1, phone = $2, address = $3, description = $4
     WHERE id = $5 RETURNING *`,
    [name.trim(), phone, address, description, id],
  );
  return result.rows[0];
};

export const deleteVendor = async (id: number) => {
  const result = await pool.query(
    `UPDATE vendors SET is_active = false
     WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};
