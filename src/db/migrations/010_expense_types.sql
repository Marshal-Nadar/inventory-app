CREATE TABLE expense_types (
  id            SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id),
  name          VARCHAR(255) NOT NULL,
  has_subcategory BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

CREATE TABLE expense_subcategories (
  id              SERIAL PRIMARY KEY,
  expense_type_id INT NOT NULL REFERENCES expense_types(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(expense_type_id, name)
);

CREATE TRIGGER trg_expense_types_updated_at
  BEFORE UPDATE ON expense_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();