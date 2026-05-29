CREATE TABLE raw_materials (
  id            SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id),
  category      VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  metric        VARCHAR(20) NOT NULL CHECK (metric IN ('kg', 'g', 'l', 'ml', 'unit')),
  current_stock NUMERIC(10, 3) NOT NULL DEFAULT 0,
  min_stock     NUMERIC(10, 3) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

CREATE TRIGGER trg_raw_materials_updated_at
  BEFORE UPDATE ON raw_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();