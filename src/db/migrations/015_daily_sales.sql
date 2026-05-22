CREATE TABLE daily_sales (
  id                    SERIAL PRIMARY KEY,
  restaurant_id         INT NOT NULL REFERENCES restaurants(id),
  branch_id             INT NOT NULL REFERENCES branches(id),
  sale_date             DATE NOT NULL,
  petpooja_total        NUMERIC(10,2) NOT NULL DEFAULT 0,
  ns_total              NUMERIC(10,2) NOT NULL DEFAULT 0,
  outdoor_catering      NUMERIC(10,2) NOT NULL DEFAULT 0,
  upi                   NUMERIC(10,2) NOT NULL DEFAULT 0,
  cash                  NUMERIC(10,2) NOT NULL DEFAULT 0,
  misc_expense          NUMERIC(10,2) NOT NULL DEFAULT 0,
  swiggy                NUMERIC(10,2) NOT NULL DEFAULT 0,
  zomato                NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_sales             NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_counter           NUMERIC(10,2) NOT NULL DEFAULT 0,
  difference            NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_by            INT REFERENCES users(id),
  updated_by            INT REFERENCES users(id),
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, sale_date)
);

CREATE INDEX idx_daily_sales_branch   ON daily_sales(branch_id);
CREATE INDEX idx_daily_sales_date     ON daily_sales(sale_date);
CREATE INDEX idx_daily_sales_restaurant ON daily_sales(restaurant_id);

CREATE TRIGGER trg_daily_sales_updated_at
  BEFORE UPDATE ON daily_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();