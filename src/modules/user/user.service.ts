import pool from "../../config/db";
import bcrypt from "bcryptjs";

export const getAllUsers = async () => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.is_active, u.created_at,
            r.name AS role_name,
            b.name AS branch_name,
            res.name AS restaurant_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     JOIN branches b ON u.branch_id = b.id
     JOIN restaurants res ON u.restaurant_id = res.id
     WHERE u.is_active = true
     ORDER BY u.created_at DESC`,
  );
  return result.rows;
};

export const getUsersByBranch = async (branchId: number) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.is_active, u.created_at,
            r.name AS role_name,
            b.name AS branch_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     JOIN branches b ON u.branch_id = b.id
     WHERE u.branch_id = $1 AND u.is_active = true
     ORDER BY u.created_at DESC`,
    [branchId],
  );
  return result.rows;
};

export const getUserById = async (id: number) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.is_active, u.created_at,
            r.name AS role_name,
            b.name AS branch_name,
            res.name AS restaurant_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     JOIN branches b ON u.branch_id = b.id
     JOIN restaurants res ON u.restaurant_id = res.id
     WHERE u.id = $1`,
    [id],
  );
  return result.rows[0];
};

export const createUser = async (
  restaurantId: number,
  branchId: number,
  roleId: number,
  name: string,
  email: string,
  password: string,
) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (restaurant_id, branch_id, role_id, name, email, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING 
     id, name, email, is_active, created_at`,
    [restaurantId, branchId, roleId, name, email, passwordHash],
  );
  return result.rows[0];
};

export const updateUser = async (
  id: number,
  branchId: number,
  roleId: number,
  name: string,
  email: string,
) => {
  const result = await pool.query(
    `UPDATE users SET branch_id = $1, role_id = $2, name = $3, email = $4
     WHERE id = $5 RETURNING id, name, email, is_active, created_at`,
    [branchId, roleId, name, email, id],
  );
  return result.rows[0];
};

export const deleteUser = async (id: number) => {
  const result = await pool.query(
    `UPDATE users SET is_active = false WHERE id = $1 
     RETURNING id, name, email, is_active`,
    [id],
  );
  return result.rows[0];
};
