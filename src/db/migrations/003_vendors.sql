CREATE TABLE vendors (
  id            SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id),
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(10) NOT NULL,
  address       TEXT,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, phone)
);

CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();