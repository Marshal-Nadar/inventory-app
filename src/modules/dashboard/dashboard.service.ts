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
    cumulativeSales,
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
  SELECT
    COALESCE(SUM(p.total_cost), 0) AS total_purchase_amount,

    COALESCE(
      SUM(COALESCE(paid.total_paid, 0)),
      0
    ) AS total_amount_paid,

    COALESCE(
      SUM(
        CASE
          WHEN p.total_cost > COALESCE(paid.total_paid, 0)
          THEN p.total_cost - COALESCE(paid.total_paid, 0)
          ELSE 0
        END
      ),
      0
    ) AS total_amount_due

  FROM purchases p
  LEFT JOIN (
    SELECT
      purchase_id,
      SUM(amount) AS total_paid
    FROM vendor_payments
    GROUP BY purchase_id
  ) paid ON paid.purchase_id = p.id

  ${!isSuperAdmin ? "WHERE p.restaurant_id = $1" : ""}
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

    // cumulative sales — all time for branch
    // cumulative sales minus vendor payments
    (() => {
      if (isSuperAdmin) {
        return pool.query(`
      SELECT
        COALESCE(SUM(ds.cash), 0)
          - COALESCE((
              SELECT SUM(vp.amount)
              FROM vendor_payments vp
              JOIN purchases p ON vp.purchase_id = p.id
              WHERE vp.payment_mode = 'cash'
            ), 0)
          - COALESCE((
              SELECT SUM(me.amount)
              FROM misc_expenses me
              JOIN users u ON me.created_by = u.id
              JOIN roles r ON u.role_id = r.id
              WHERE me.payment_method = 'cash'
              AND r.can_manage_store = true
            ), 0) AS total_cash,
        COALESCE(SUM(ds.upi), 0)
          - COALESCE((
              SELECT SUM(vp.amount)
              FROM vendor_payments vp
              JOIN purchases p ON vp.purchase_id = p.id
              WHERE vp.payment_mode IN ('upi','bank_transfer','cheque')
            ), 0)
          - COALESCE((
              SELECT SUM(me.amount)
              FROM misc_expenses me
              JOIN users u ON me.created_by = u.id
              JOIN roles r ON u.role_id = r.id
              WHERE me.payment_method = 'upi'
              AND r.can_manage_store = true
            ), 0) AS total_upi,
        COALESCE(SUM(ds.net_sales), 0) AS total_net_sales,
        COALESCE(SUM(ds.net_counter), 0) AS total_net_counter
      FROM daily_sales ds
    `);
      } else if (canManageStore) {
        return pool.query(
          `
      SELECT
        COALESCE(SUM(ds.cash), 0)
          - COALESCE((
              SELECT SUM(vp.amount)
              FROM vendor_payments vp
              JOIN purchases p ON vp.purchase_id = p.id
              WHERE vp.payment_mode = 'cash'
              AND p.restaurant_id = $1
            ), 0)
          - COALESCE((
              SELECT SUM(me.amount)
              FROM misc_expenses me
              JOIN users u ON me.created_by = u.id
              JOIN roles r ON u.role_id = r.id
              WHERE me.payment_method = 'cash'
              AND me.restaurant_id = $1
              AND r.can_manage_store = true
            ), 0) AS total_cash,
        COALESCE(SUM(ds.upi), 0)
          - COALESCE((
              SELECT SUM(vp.amount)
              FROM vendor_payments vp
              JOIN purchases p ON vp.purchase_id = p.id
              WHERE vp.payment_mode IN ('upi','bank_transfer','cheque')
              AND p.restaurant_id = $1
            ), 0)
          - COALESCE((
              SELECT SUM(me.amount)
              FROM misc_expenses me
              JOIN users u ON me.created_by = u.id
              JOIN roles r ON u.role_id = r.id
              WHERE me.payment_method = 'upi'
              AND me.restaurant_id = $1
              AND r.can_manage_store = true
            ), 0) AS total_upi,
        COALESCE(SUM(ds.net_sales), 0) AS total_net_sales,
        COALESCE(SUM(ds.net_counter), 0) AS total_net_counter
      FROM daily_sales ds
      WHERE ds.restaurant_id = $1
    `,
          [restaurantId],
        );
      } else {
        // branch manager — misc expenses already in daily_sales
        return pool.query(
          `
      SELECT
        COALESCE(SUM(ds.cash), 0)
          - COALESCE((
              SELECT SUM(vp.amount)
              FROM vendor_payments vp
              JOIN purchases p ON vp.purchase_id = p.id
              WHERE vp.payment_mode = 'cash'
              AND p.restaurant_id = $2
            ), 0) AS total_cash,
        COALESCE(SUM(ds.upi), 0)
          - COALESCE((
              SELECT SUM(vp.amount)
              FROM vendor_payments vp
              JOIN purchases p ON vp.purchase_id = p.id
              WHERE vp.payment_mode IN ('upi','bank_transfer','cheque')
              AND p.restaurant_id = $2
            ), 0) AS total_upi,
        COALESCE(SUM(ds.net_sales), 0) AS total_net_sales,
        COALESCE(SUM(ds.net_counter), 0) AS total_net_counter
      FROM daily_sales ds
      WHERE ds.branch_id = $1
    `,
          [branchId, restaurantId],
        );
      }
    })(),
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
    cumulative_sales: {
      total_net_sales: Number(cumulativeSales.rows[0].total_net_sales),
      total_net_counter: Number(cumulativeSales.rows[0].total_net_counter),
      total_cash: Number(cumulativeSales.rows[0].total_cash),
      total_upi: Number(cumulativeSales.rows[0].total_upi),
    },
    vendor_stats: {
      total_purchase_amount: Number(
        pendingVendorBalance.rows[0].total_purchase_amount,
      ),
      total_amount_paid: Number(pendingVendorBalance.rows[0].total_amount_paid),
      total_amount_due: Number(pendingVendorBalance.rows[0].total_amount_due),
    },
  };
};

export const getSuperAdminStats = async () => {
  const today = new Date().toLocaleDateString("en-CA");

  // platform-wide totals
  const totals = await pool.query(
    `
    SELECT
      (SELECT COUNT(*) FROM restaurants WHERE is_active) AS total_restaurants,
      (SELECT COUNT(*) FROM branches WHERE is_active) AS total_branches,
      (SELECT COUNT(*) FROM users WHERE is_active) AS total_users,
      (SELECT COALESCE(SUM(net_sales),0) FROM daily_sales
        WHERE sale_date = $1) AS today_sales,
      (SELECT COUNT(*) FROM pre_bookings
        WHERE order_status = 'pending') AS pending_prebookings,
      (SELECT COUNT(*) FROM transfer_requests
        WHERE status = 'pending') AS pending_transfers
  `,
    [today],
  );

  // per-restaurant breakdown
  const restaurants = await pool.query(
    `
    SELECT
      r.id,
      r.name,
      r.is_active,
      (SELECT COUNT(*) FROM branches b
        WHERE b.restaurant_id = r.id AND b.is_active) AS active_branches,
      (SELECT COUNT(*) FROM users u
        WHERE u.restaurant_id = r.id AND u.is_active) AS active_users,
      (SELECT COALESCE(SUM(net_sales),0) FROM daily_sales ds
        WHERE ds.restaurant_id = r.id
        AND ds.sale_date = $1) AS today_sales,
      (SELECT COALESCE(SUM(net_sales),0) FROM daily_sales ds
        WHERE ds.restaurant_id = r.id
        AND ds.sale_date >= date_trunc('month', CURRENT_DATE)) AS month_sales,
      (SELECT COUNT(*) FROM pre_bookings pb
        WHERE pb.restaurant_id = r.id
        AND pb.order_status = 'pending') AS pending_prebookings,
      (SELECT COUNT(*) FROM transfer_requests tr
        WHERE tr.restaurant_id = r.id
        AND tr.status = 'pending') AS pending_transfers,
      (SELECT COUNT(*) FROM purchases p
        WHERE p.restaurant_id = r.id) AS total_purchases
    FROM restaurants r
    ORDER BY r.name
  `,
    [today],
  );

  return {
    totals: totals.rows[0],
    restaurants: restaurants.rows,
  };
};
