CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id),
  name          VARCHAR(255) NOT NULL,
  price         NUMERIC(10, 2) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();