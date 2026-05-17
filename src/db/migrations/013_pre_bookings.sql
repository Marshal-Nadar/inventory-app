CREATE TABLE pre_bookings (
  id                    SERIAL PRIMARY KEY,
  order_id              VARCHAR(20) NOT NULL UNIQUE,
  restaurant_id         INT NOT NULL REFERENCES restaurants(id),
  branch_id             INT NOT NULL REFERENCES branches(id),
  customer_name         VARCHAR(255) NOT NULL,
  mobile                VARCHAR(15) NOT NULL,
  email                 VARCHAR(255),
  delivery_address      TEXT NOT NULL,
  subtotal              NUMERIC(10,2) NOT NULL DEFAULT 0,
  product_discount_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  overall_discount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid           NUMERIC(10,2) NOT NULL DEFAULT 0,
  pending_balance       NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method        VARCHAR(20) CHECK (
                          payment_method IN ('cash','upi','card')
                        ),
  payment_status        VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (
                          payment_status IN ('unpaid','partial','paid')
                        ),
  order_status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
                          order_status IN ('pending','confirmed','delivered','cancelled')
                        ),
  delivery_date         DATE NOT NULL,
  delivery_time         TIME NOT NULL,
  remarks               TEXT,
  notes                 TEXT,
  created_by            INT REFERENCES users(id),
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE pre_booking_items (
  id               SERIAL PRIMARY KEY,
  booking_id       INT NOT NULL REFERENCES pre_bookings(id) ON DELETE CASCADE,
  product_id       INT NOT NULL REFERENCES products(id),
  product_name     VARCHAR(255) NOT NULL,
  unit_price       NUMERIC(10,2) NOT NULL,
  quantity         INT NOT NULL DEFAULT 1,
  product_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  item_total       NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pre_bookings_restaurant ON pre_bookings(restaurant_id);
CREATE INDEX idx_pre_bookings_branch     ON pre_bookings(branch_id);
CREATE INDEX idx_pre_bookings_status     ON pre_bookings(order_status);
CREATE INDEX idx_pre_bookings_delivery   ON pre_bookings(delivery_date);

CREATE TRIGGER trg_pre_bookings_updated_at
  BEFORE UPDATE ON pre_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();