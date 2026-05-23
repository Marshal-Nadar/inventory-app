-- src/db/migrations/016_restaurant_print_settings.sql
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS print_company_name  VARCHAR(200),
  ADD COLUMN IF NOT EXISTS print_address       TEXT,
  ADD COLUMN IF NOT EXISTS print_contact       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS print_footer_note   VARCHAR(300);