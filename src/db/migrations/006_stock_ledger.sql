CREATE TABLE stock_ledger (
  id              SERIAL PRIMARY KEY,
  restaurant_id   INT NOT NULL REFERENCES restaurants(id),
  raw_material_id INT NOT NULL REFERENCES raw_materials(id),
  entry_type      VARCHAR(50) NOT NULL CHECK (
                    entry_type IN ('purchase_in', 'transfer_out', 'transfer_in', 'adjustment')
                  ),
  quantity        NUMERIC(10, 3) NOT NULL,
  reference_id    INT,
  reference_type  VARCHAR(50),
  notes           TEXT,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_ledger_raw_material ON stock_ledger(raw_material_id);
CREATE INDEX idx_stock_ledger_restaurant   ON stock_ledger(restaurant_id);
CREATE INDEX idx_stock_ledger_entry_type   ON stock_ledger(entry_type);
CREATE INDEX idx_stock_ledger_created_at   ON stock_ledger(created_at);