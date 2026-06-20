-- OviCore Next starter schema
-- Focus: Breeder -> Hatchery -> Broiler planning

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    company_type TEXT NOT NULL DEFAULT 'broiler_integrated',
    enable_layers BOOLEAN NOT NULL DEFAULT FALSE,
    enable_breeders BOOLEAN NOT NULL DEFAULT TRUE,
    enable_egg_room BOOLEAN NOT NULL DEFAULT TRUE,
    enable_hatchery BOOLEAN NOT NULL DEFAULT TRUE,
    enable_broilers BOOLEAN NOT NULL DEFAULT TRUE,
    enable_processing BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farms (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    farm_name TEXT NOT NULL,
    farm_type TEXT NOT NULL,
    region TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    farm_id INTEGER NOT NULL REFERENCES farms(id),
    location_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sheds (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    farm_id INTEGER NOT NULL REFERENCES farms(id),
    location_id INTEGER REFERENCES locations(id),
    shed_code TEXT NOT NULL,
    shed_type TEXT NOT NULL,
    capacity_female INTEGER,
    capacity_male INTEGER,
    capacity_broilers INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS breeder_flock_plans (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    plan_name TEXT NOT NULL,
    flock_code TEXT NOT NULL,
    farm_id INTEGER NOT NULL REFERENCES farms(id),
    shed_id INTEGER NOT NULL REFERENCES sheds(id),
    placement_date DATE NOT NULL,
    planned_females INTEGER NOT NULL,
    planned_males INTEGER NOT NULL,
    transfer_age_weeks NUMERIC(5,2) NOT NULL DEFAULT 20,
    depletion_age_weeks NUMERIC(5,2) NOT NULL DEFAULT 64,
    expected_peak_hen_day NUMERIC(5,2) NOT NULL DEFAULT 86,
    expected_fertility_pct NUMERIC(5,2) NOT NULL DEFAULT 88,
    expected_hatchability_pct NUMERIC(5,2) NOT NULL DEFAULT 82,
    status TEXT NOT NULL DEFAULT 'planned',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hatchery_forecasts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    breeder_flock_plan_id INTEGER NOT NULL REFERENCES breeder_flock_plans(id),
    forecast_week_start DATE NOT NULL,
    hatch_eggs INTEGER NOT NULL,
    fertility_pct NUMERIC(5,2) NOT NULL,
    hatchability_pct NUMERIC(5,2) NOT NULL,
    chicks_available INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broiler_placement_plans (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    hatchery_forecast_id INTEGER REFERENCES hatchery_forecasts(id),
    broiler_farm_id INTEGER REFERENCES farms(id),
    broiler_shed_id INTEGER REFERENCES sheds(id),
    placement_date DATE NOT NULL,
    planned_chicks INTEGER NOT NULL,
    target_processing_age_days INTEGER NOT NULL DEFAULT 42,
    status TEXT NOT NULL DEFAULT 'planned',
    notes TEXT
);
