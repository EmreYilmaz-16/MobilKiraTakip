-- ============================================================
-- Mülk Kira Takip Sistemi - PostgreSQL Init Script
-- ============================================================

-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS (Kullanıcılar)
-- ============================================================
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'owner'
                  CHECK (role IN ('owner','accountant','agent','admin')),
    phone       VARCHAR(20),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BUILDINGS (Binalar / Siteler)
-- ============================================================
CREATE TABLE buildings (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(150) NOT NULL,
    address       TEXT NOT NULL,
    city          VARCHAR(80),
    district      VARCHAR(80),
    total_floors  INT,
    total_units   INT,
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROPERTIES (Mülkler / Bağımsız Bölümler)
-- ============================================================
CREATE TABLE properties (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id     UUID REFERENCES buildings(id) ON DELETE SET NULL,
    name            VARCHAR(150) NOT NULL,
  site_name       VARCHAR(150),
    type            VARCHAR(20) NOT NULL DEFAULT 'residential'
                      CHECK (type IN ('residential','commercial','parking','other')),
    floor           INT,
    unit_number     VARCHAR(20),
    area_sqm        NUMERIC(8,2),
    deed_info       TEXT,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'available'
                      CHECK (status IN ('available','rented','maintenance','for_sale')),
    purchase_price  NUMERIC(14,2),
    market_value    NUMERIC(14,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TENANTS (Kiracılar)
-- ============================================================
CREATE TABLE tenants (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name        VARCHAR(80) NOT NULL,
    last_name         VARCHAR(80) NOT NULL,
    tc_no             VARCHAR(11),
    phone             VARCHAR(20) NOT NULL,
    email             VARCHAR(150),
    emergency_contact VARCHAR(100),
    emergency_phone   VARCHAR(20),
    findeks_score     INT,
    notes             TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONTRACTS (Kira Sözleşmeleri)
-- ============================================================
CREATE TABLE contracts (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    start_date       DATE NOT NULL,
    end_date         DATE NOT NULL,
    monthly_rent     NUMERIC(12,2) NOT NULL,
    deposit_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
    increase_type    VARCHAR(20) NOT NULL DEFAULT 'tüfe'
                       CHECK (increase_type IN ('tüfe','sabit','anlaşma')),
    increase_rate    NUMERIC(6,2),
    special_terms    TEXT,
    eviction_date    DATE,
    status           VARCHAR(20) NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','expired','terminated')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS (Ödemeler / Kira Tahsilatları)
-- ============================================================
CREATE TABLE payments (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id    UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    amount         NUMERIC(12,2) NOT NULL,
    due_date       DATE NOT NULL,
    payment_date   DATE,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','late','partial','cancelled')),
    method         VARCHAR(30) CHECK (method IN ('bank_transfer','cash','eft','other')),
    reference_no   VARCHAR(100),
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXPENSES (Giderler)
-- ============================================================
CREATE TABLE expenses (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id  UUID REFERENCES properties(id) ON DELETE SET NULL,
    category     VARCHAR(40) NOT NULL
                   CHECK (category IN ('maintenance','tax','insurance','dask','utility',
                                       'management_fee','renovation','other')),
    amount       NUMERIC(12,2) NOT NULL,
    date         DATE NOT NULL,
    vendor       VARCHAR(150),
    description  TEXT,
    receipt_url  VARCHAR(500),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MAINTENANCE_REQUESTS (Bakım & Arıza Talepleri)
-- ============================================================
CREATE TABLE maintenance_requests (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id    UUID REFERENCES tenants(id) ON DELETE SET NULL,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    priority     VARCHAR(20) NOT NULL DEFAULT 'normal'
                   CHECK (priority IN ('low','normal','high','urgent')),
    status       VARCHAR(20) NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','in_progress','completed','cancelled')),
    assigned_to  VARCHAR(150),
    cost         NUMERIC(12,2),
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INSURANCE_POLICIES (Sigorta / DASK Poliçeleri)
-- ============================================================
CREATE TABLE insurance_policies (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    type          VARCHAR(20) NOT NULL CHECK (type IN ('dask','kasko','konut','other')),
    company       VARCHAR(150),
    policy_no     VARCHAR(100),
    start_date    DATE NOT NULL,
    end_date      DATE NOT NULL,
    premium       NUMERIC(12,2),
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_building ON properties(building_id);
CREATE INDEX idx_contracts_property ON contracts(property_id);
CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_payments_contract ON payments(contract_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_expenses_property ON expenses(property_id);
CREATE INDEX idx_maintenance_property ON maintenance_requests(property_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);

-- ============================================================
-- UPDATED_AT auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','buildings','properties','tenants','contracts',
    'payments','expenses','maintenance_requests','insurance_policies'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- SEED: Varsayılan admin kullanıcısı
-- Şifre: Admin123! (bcrypt hash - uygulama üzerinden değiştirin)
-- ============================================================
INSERT INTO users (name, email, password, role)
VALUES (
  'Admin',
  'admin@kiratakip.local',
  '$2a$12$AQYte6kA1j/h60TNRuvk7.KizR7jB5l5HP2/qNNjLonH80885kxN6',
  'admin'
);
