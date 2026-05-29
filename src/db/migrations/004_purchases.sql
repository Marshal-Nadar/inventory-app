CREATE TABLE purchases (
  id             SERIAL PRIMARY KEY,
  restaurant_id  INT NOT NULL REFERENCES restaurants(id),
  vendor_id      INT NOT NULL REFERENCES vendors(id),
  invoice_number VARCHAR(255) NOT NULL,
  purchase_date  DATE NOT NULL,
  total_cost     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes          TEXT,
  created_by     INT REFERENCES users(id),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, invoice_number, purchase_date)
);

CREATE TABLE purchase_items (
  id              SERIAL PRIMARY KEY,
  purchase_id     INT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  raw_material_id INT NOT NULL REFERENCES raw_materials(id),
  quantity        NUMERIC(10, 3) NOT NULL,
  metric          VARCHAR(20) NOT NULL CHECK (metric IN ('kg', 'g', 'l', 'ml', 'unit')),
  price_per_unit  NUMERIC(10, 2) NOT NULL,
  total_cost      NUMERIC(10, 2) NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();