import pool from "../../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const login = async (email: string, password: string) => {
  const result = await pool.query(
    `SELECT u.*,
          r.name AS role_name,
          r.can_manage_store,
          b.name AS branch_name
   FROM users u
   LEFT JOIN roles r ON u.role_id = r.id
   LEFT JOIN branches b ON u.branch_id = b.id
   WHERE u.email = $1 AND u.is_active = true`,
    [email],
  );

  const user = result.rows[0];

  if (!user) {
    throw { status: 401, message: "Invalid email or password" };
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw { status: 401, message: "Invalid email or password" };
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role_name || "super_admin",
      branch_id: user.branch_id || null,
      restaurant_id: user.restaurant_id || null,
      is_super_admin: user.is_super_admin,
      can_manage_store: user.can_manage_store || false,
    },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: "1d" },
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name || "super_admin",
      branch: user.branch_name || null,
      branch_id: user.branch_id || null,
      restaurant_id: user.restaurant_id || null,
      is_super_admin: user.is_super_admin,
      can_manage_store: user.can_manage_store || false,
    },
  };
};

export const impersonate = async (
  requestingUserId: number,
  targetUserId: number,
) => {
  const requestingUser = await pool.query(
    `SELECT u.*, r.name AS role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1 AND u.is_active = true`,
    [requestingUserId],
  );

  if (!requestingUser.rows[0]) {
    throw { status: 401, message: "Unauthorized" };
  }

  if (requestingUser.rows[0].role_name !== "admin") {
    throw { status: 403, message: "Only admin can impersonate users" };
  }

  const targetUser = await pool.query(
    `SELECT u.*, r.name AS role_name, b.name AS branch_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     JOIN branches b ON u.branch_id = b.id
     WHERE u.id = $1 AND u.is_active = true`,
    [targetUserId],
  );

  if (!targetUser.rows[0]) {
    throw { status: 404, message: "Target user not found" };
  }

  const target = targetUser.rows[0];

  const token = jwt.sign(
    {
      id: target.id,
      email: target.email,
      role: target.role_name,
      branch_id: target.branch_id,
      restaurant_id: target.restaurant_id,
      is_super_admin: target.is_super_admin,
      can_manage_store: target.can_manage_store || false,
      impersonated: true,
      impersonated_by: requestingUserId,
    },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: "2h" },
  );

  return {
    token,
    user: {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role_name,
      branch: target.branch_name,
      branch_id: target.branch_id,
      restaurant_id: target.restaurant_id,
      can_manage_store: target.can_manage_store || false,
      impersonated: true,
      impersonated_by: requestingUserId,
    },
  };
};
