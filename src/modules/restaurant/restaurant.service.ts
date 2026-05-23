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
  data: {
    name?: string;
    slug?: string;
    timezone?: string;
    storage_room_name?: string;
    print_company_name?: string;
    print_address?: string;
    print_contact?: string;
    print_footer_note?: string;
  },
) => {
  const result = await pool.query(
    `UPDATE restaurants SET
       name = COALESCE($1, name),
       storage_room_name = COALESCE($2, storage_room_name),
       print_company_name = $3,
       print_address = $4,
       print_contact = $5,
       print_footer_note = $6
     WHERE id = $7
     RETURNING *`,
    [
      data.name,
      data.storage_room_name,
      data.print_company_name ?? null,
      data.print_address ?? null,
      data.print_contact ?? null,
      data.print_footer_note ?? null,
      id,
    ],
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
