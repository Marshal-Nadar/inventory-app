CREATE TABLE restaurants (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  slug                VARCHAR(255) NOT NULL UNIQUE,
  timezone            VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  storage_room_name   VARCHAR(255) NOT NULL DEFAULT 'Main Store',
  print_company_name  VARCHAR(200),
  print_address       TEXT,
  print_contact       VARCHAR(50),
  print_footer_note   VARCHAR(300),
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE branches (
  id            SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id),
  name          VARCHAR(255) NOT NULL,
  address       TEXT,
  phone         VARCHAR(20),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
  id            SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id),
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  is_default    BOOLEAN NOT NULL DEFAULT false,
  can_manage_store BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  restaurant_id INT REFERENCES restaurants(id),
  branch_id     INT REFERENCES branches(id),
  role_id       INT REFERENCES roles(id),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();