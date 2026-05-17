CREATE TABLE pre_booking_payments (
  id          SERIAL PRIMARY KEY,
  booking_id  INT NOT NULL REFERENCES pre_bookings(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  remarks     TEXT,
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pre_booking_payments_booking ON pre_booking_payments(booking_id);