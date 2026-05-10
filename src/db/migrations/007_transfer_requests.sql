CREATE TABLE transfer_requests (
  id                SERIAL PRIMARY KEY,
  restaurant_id     INT NOT NULL REFERENCES restaurants(id),
  branch_id         INT NOT NULL REFERENCES branches(id),
  raw_material_id   INT NOT NULL REFERENCES raw_materials(id),
  quantity          NUMERIC(10, 3) NOT NULL,
  metric            VARCHAR(20) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  notes             TEXT,
  rejection_reason  TEXT,
  requested_by      INT NOT NULL REFERENCES users(id),
  actioned_by       INT REFERENCES users(id),
  actioned_at       TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transfer_requests_restaurant ON transfer_requests(restaurant_id);
CREATE INDEX idx_transfer_requests_branch     ON transfer_requests(branch_id);
CREATE INDEX idx_transfer_requests_status     ON transfer_requests(status);

CREATE TRIGGER trg_transfer_requests_updated_at
  BEFORE UPDATE ON transfer_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

 