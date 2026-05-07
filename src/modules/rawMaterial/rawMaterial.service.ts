import pool from "../../config/db";

export const getAllRawMaterials = async (
  isSuperAdmin: boolean,
  restaurantId: number,
) => {
  if (isSuperAdmin) {
    const result = await pool.query(
      `SELECT rm.*, r.name AS restaurant_name,
              u.name AS created_by_name
       FROM raw_materials rm
       JOIN restaurants r ON rm.restaurant_id = r.id
       LEFT JOIN users u ON rm.created_by = u.id
       WHERE rm.is_active = true
       ORDER BY rm.category, rm.name`,
    );
    return result.rows;
  } else {
    const result = await pool.query(
      `SELECT rm.*, r.name AS restaurant_name,
              u.name AS created_by_name
       FROM raw_materials rm
       JOIN restaurants r ON rm.restaurant_id = r.id
       LEFT JOIN users u ON rm.created_by = u.id
       WHERE rm.restaurant_id = $1 AND rm.is_active = true
       ORDER BY rm.category, rm.name`,
      [restaurantId],
    );
    return result.rows;
  }
};

export const getRawMaterialById = async (id: number) => {
  const result = await pool.query(
    `SELECT rm.*, r.name AS restaurant_name
     FROM raw_materials rm
     JOIN restaurants r ON rm.restaurant_id = r.id
     WHERE rm.id = $1`,
    [id],
  );
  return result.rows[0];
};

export const createRawMaterials = async (
  items: {
    category: string;
    name: string;
    metric: string;
  }[],
  restaurantId: number,
  createdBy: number,
) => {
  const created = [];
  for (const item of items) {
    const result = await pool.query(
      `INSERT INTO raw_materials (restaurant_id, category, name, metric, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        restaurantId,
        item.category.trim(),
        item.name.trim(),
        item.metric,
        createdBy,
      ],
    );
    created.push(result.rows[0]);
  }
  return created;
};

export const updateRawMaterial = async (
  id: number,
  category: string,
  name: string,
  metric: string,
) => {
  const result = await pool.query(
    `UPDATE raw_materials
     SET category = $1, name = $2, metric = $3
     WHERE id = $4 RETURNING *`,
    [category.trim(), name.trim(), metric, id],
  );
  return result.rows[0];
};

export const deleteRawMaterial = async (id: number) => {
  const result = await pool.query(
    `UPDATE raw_materials SET is_active = false
     WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};
