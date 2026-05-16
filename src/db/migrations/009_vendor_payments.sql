CREATE TABLE vendor_payments (
  id              SERIAL PRIMARY KEY,
  restaurant_id   INT NOT NULL REFERENCES restaurants(id),
  vendor_id       INT NOT NULL REFERENCES vendors(id),
  purchase_id     INT NOT NULL REFERENCES purchases(id),
  amount          NUMERIC(10, 2) NOT NULL,
  payment_mode    VARCHAR(20) NOT NULL CHECK (
                    payment_mode IN ('cash', 'upi', 'bank_transfer', 'cheque')
                  ),
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_by      INT REFERENCES users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_payments_vendor     ON vendor_payments(vendor_id);
CREATE INDEX idx_vendor_payments_purchase   ON vendor_payments(purchase_id);
CREATE INDEX idx_vendor_payments_restaurant ON vendor_payments(restaurant_id);