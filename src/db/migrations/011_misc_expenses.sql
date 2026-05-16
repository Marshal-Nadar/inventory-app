CREATE TABLE misc_expenses (
  id              SERIAL PRIMARY KEY,
  restaurant_id   INT NOT NULL REFERENCES restaurants(id),
  branch_id       INT NOT NULL REFERENCES branches(id),
  expense_type_id INT NOT NULL REFERENCES expense_types(id),
  subcategory_id  INT REFERENCES expense_subcategories(id),
  amount          NUMERIC(10, 2) NOT NULL,
  payment_method  VARCHAR(20) NOT NULL CHECK (
                    payment_method IN ('cash', 'upi')
                  ),
  expense_date    DATE NOT NULL,
  notes           TEXT,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_misc_expenses_restaurant ON misc_expenses(restaurant_id);
CREATE INDEX idx_misc_expenses_branch     ON misc_expenses(branch_id);
CREATE INDEX idx_misc_expenses_date       ON misc_expenses(expense_date);

CREATE TRIGGER trg_misc_expenses_updated_at
  BEFORE UPDATE ON misc_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();