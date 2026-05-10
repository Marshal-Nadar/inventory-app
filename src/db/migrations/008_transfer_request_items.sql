-- remove raw_material_id, quantity, metric from header
-- they move to items table
ALTER TABLE transfer_requests
  DROP COLUMN IF EXISTS raw_material_id,
  DROP COLUMN IF EXISTS quantity,
  DROP COLUMN IF EXISTS metric;

-- create items table
CREATE TABLE transfer_request_items (
  id                SERIAL PRIMARY KEY,
  transfer_request_id INT NOT NULL REFERENCES transfer_requests(id) ON DELETE CASCADE,
  raw_material_id   INT NOT NULL REFERENCES raw_materials(id),
  quantity          NUMERIC(10, 3) NOT NULL,
  metric            VARCHAR(20) NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transfer_request_items_request 
  ON transfer_request_items(transfer_request_id);