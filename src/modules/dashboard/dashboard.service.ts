import pool from "../../config/db";

export const getDashboardStats = async (
  isSuperAdmin: boolean,
  restaurantId: number,
  branchId: number | null,
  canManageStore: boolean,
) => {
  const today = new Date().toLocaleDateString("en-CA");

  const [
    restaurants,
    branches,
    users,
    roles,
    pendingTransfers,
    lowStock,
    todaySales,
    pendingPreBookings,
    pendingVendorBalance,
    recentPurchases,
  ] = await Promise.all([
    // restaurants
    pool.query(
      `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active) AS active
      FROM restaurants
      ${!isSuperAdmin ? "WHERE id = $1" : "WHERE 1=1"}
    `,
      !isSuperAdmin ? [restaurantId] : [],
    ),

    // branches
    pool.query(
      `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active) AS active
      FROM branches
      WHERE ${isSuperAdmin ? "1=1" : canManageStore ? "restaurant_id = $1" : "id = $1"}
    `,
      isSuperAdmin ? [] : [canManageStore ? restaurantId : branchId],
    ),

    // users
    pool.query(
      `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active) AS active
      FROM users
      ${!isSuperAdmin ? "WHERE restaurant_id = $1" : ""}
    `,
      !isSuperAdmin ? [restaurantId] : [],
    ),

    // roles
    pool.query(
      `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE NOT is_default) AS custom
      FROM roles
      ${!isSuperAdmin ? "WHERE restaurant_id = $1" : ""}
    `,
      !isSuperAdmin ? [restaurantId] : [],
    ),

    // pending transfer requests
    pool.query(
      `
      SELECT COUNT(*) AS count
      FROM transfer_requests
      WHERE status = 'pending'
      ${!isSuperAdmin ? "AND restaurant_id = $1" : ""}
    `,
      !isSuperAdmin ? [restaurantId] : [],
    ),

    // low/out of stock
    pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE current_stock = 0) AS out_of_stock,
        COUNT(*) FILTER (WHERE current_stock > 0 AND current_stock <= min_stock) AS low_stock
      FROM raw_materials
      ${!isSuperAdmin ? "WHERE restaurant_id = $1" : ""}
    `,
      !isSuperAdmin ? [restaurantId] : [],
    ),

    // today's sales
    pool.query(
      `
      SELECT
        COUNT(*) AS branches_reported,
        COALESCE(SUM(net_sales), 0) AS total_net_sales,
        COALESCE(SUM(net_counter), 0) AS total_net_counter
      FROM daily_sales
      WHERE sale_date = $1
      ${!isSuperAdmin ? "AND restaurant_id = $2" : ""}
    `,
      !isSuperAdmin ? [today, restaurantId] : [today],
    ),

    // pre-bookings
    pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE order_status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE order_status = 'confirmed') AS confirmed,
        COUNT(*) FILTER (
          WHERE delivery_date = $1::date
          AND order_status NOT IN ('delivered','cancelled')
        ) AS today_deliveries
      FROM pre_bookings
      WHERE 1=1
      ${!isSuperAdmin ? "AND restaurant_id = $2" : ""}
    `,
      !isSuperAdmin ? [today, restaurantId] : [today],
    ),

    // vendor outstanding
    pool.query(
      `
      SELECT COALESCE(SUM(
        p.total_cost - COALESCE(paid.total_paid, 0)
      ), 0) AS outstanding
      FROM purchases p
      LEFT JOIN (
        SELECT purchase_id, SUM(amount) AS total_paid
        FROM vendor_payments
        GROUP BY purchase_id
      ) paid ON paid.purchase_id = p.id
      WHERE p.total_cost > COALESCE(paid.total_paid, 0)
      ${!isSuperAdmin ? "AND p.restaurant_id = $1" : ""}
    `,
      !isSuperAdmin ? [restaurantId] : [],
    ),

    // recent purchases
    pool.query(
      `
      SELECT
        p.id,
        TO_CHAR(p.purchase_date, 'YYYY-MM-DD') AS purchase_date,
        p.invoice_number,
        p.total_cost,
        v.name AS vendor_name
      FROM purchases p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      ${!isSuperAdmin ? "WHERE p.restaurant_id = $1" : ""}
      ORDER BY p.created_at DESC
      LIMIT 5
    `,
      !isSuperAdmin ? [restaurantId] : [],
    ),
  ]);

  return {
    restaurants: {
      total: Number(restaurants.rows[0].total),
      active: Number(restaurants.rows[0].active),
    },
    branches: {
      total: Number(branches.rows[0].total),
      active: Number(branches.rows[0].active),
    },
    users: {
      total: Number(users.rows[0].total),
      active: Number(users.rows[0].active),
    },
    roles: {
      total: Number(roles.rows[0].total),
      custom: Number(roles.rows[0].custom),
    },
    operations: {
      pending_transfers: Number(pendingTransfers.rows[0].count),
      out_of_stock: Number(lowStock.rows[0].out_of_stock),
      low_stock: Number(lowStock.rows[0].low_stock),
      pending_prebookings: Number(pendingPreBookings.rows[0].pending),
      confirmed_prebookings: Number(pendingPreBookings.rows[0].confirmed),
      today_deliveries: Number(pendingPreBookings.rows[0].today_deliveries),
      vendor_outstanding: Number(pendingVendorBalance.rows[0].outstanding),
    },
    today_sales: {
      branches_reported: Number(todaySales.rows[0].branches_reported),
      total_net_sales: Number(todaySales.rows[0].total_net_sales),
      total_net_counter: Number(todaySales.rows[0].total_net_counter),
    },
    recent_purchases: recentPurchases.rows,
  };
};
