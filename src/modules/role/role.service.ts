import pool from "../../config/db";

export const getAllRoles = async (
  isSuperAdmin: boolean,
  restaurantId: number,
) => {
  if (isSuperAdmin) {
    const result = await pool.query(
      `SELECT r.*, res.name AS restaurant_name
       FROM roles r
       JOIN restaurants res ON r.restaurant_id = res.id
       ORDER BY r.created_at DESC`,
    );
    return result.rows;
  } else {
    const result = await pool.query(
      `SELECT r.*, res.name AS restaurant_name
       FROM roles r
       JOIN restaurants res ON r.restaurant_id = res.id
       WHERE r.restaurant_id = $1
       ORDER BY r.created_at DESC`,
      [restaurantId],
    );
    return result.rows;
  }
};

export const getRolesByRestaurant = async (restaurantId: number) => {
  const result = await pool.query(
    `SELECT r.*, res.name AS restaurant_name
     FROM roles r
     JOIN restaurants res ON r.restaurant_id = res.id
     WHERE r.restaurant_id = $1
     ORDER BY r.created_at DESC`,
    [restaurantId],
  );
  return result.rows;
};

export const getRoleById = async (id: number) => {
  const result = await pool.query(
    `SELECT r.*, res.name AS restaurant_name
     FROM roles r
     JOIN restaurants res ON r.restaurant_id = res.id
     WHERE r.id = $1`,
    [id],
  );
  return result.rows[0];
};

export const createRole = async (
  restaurantId: number,
  name: string,
  description: string,
) => {
  const result = await pool.query(
    `INSERT INTO roles (restaurant_id, name, description)
     VALUES ($1, $2, $3) RETURNING *`,
    [restaurantId, name, description],
  );
  return result.rows[0];
};

export const updateRole = async (
  id: number,
  name: string,
  description: string,
) => {
  const result = await pool.query(
    `UPDATE roles SET name = $1, description = $2
     WHERE id = $3 RETURNING *`,
    [name, description, id],
  );
  return result.rows[0];
};

export const deleteRole = async (id: number) => {
  // check if default role
  const role = await pool.query(`SELECT * FROM roles WHERE id = $1`, [id]);

  if (!role.rows[0]) {
    throw { status: 404, message: "Role not found" };
  }

  if (role.rows[0].is_default) {
    throw { status: 400, message: "Cannot delete a default role" };
  }

  // check if any active users are assigned to this role
  const usersWithRole = await pool.query(
    `SELECT COUNT(*) FROM users WHERE role_id = $1 AND is_active = true`,
    [id],
  );

  if (parseInt(usersWithRole.rows[0].count) > 0) {
    throw {
      status: 400,
      message: "Cannot delete role — active users are assigned to it",
    };
  }

  const result = await pool.query(
    `DELETE FROM roles WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};
