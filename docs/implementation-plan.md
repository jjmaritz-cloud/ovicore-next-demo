# OviCore Next Implementation Plan

## Product direction

Build the new system as a proper SaaS-style platform, starting with:

Breeders -> Hatchery -> Broilers

Do not start by copying the Streamlit layer app screen-for-screen. The new build should start with the future architecture and only bring across proven Streamlit logic where it helps.

## First module: Flock Planning

The first working module should be:

Planning > Breeder Flock Planning

Why:
- It defines breeder placements.
- It creates the future production schedule.
- It drives hatch egg forecasts.
- It drives chick availability.
- It drives broiler placement planning.
- It becomes the backbone for daily breeder entry.

## Minimum viable planning table

Columns:
- Plan name
- Flock code
- Farm
- Shed
- Placement date
- Planned females
- Planned males
- Male %
- Transfer age
- Depletion age
- Expected peak hen day %
- Expected fertility %
- Expected hatchability %
- Projected hatch eggs
- Projected chicks
- Planning flag
- Status
- Notes

## Build phases

### Phase 1 — Demo planning UI
- Next.js app
- Mock API data from FastAPI
- Excel-like planning table
- KPI cards
- Planning flags
- demo.ovicore.com.au deployment

### Phase 2 — PostgreSQL persistence
- Add actual database tables
- Add Alembic migrations
- Add CRUD endpoints
- Add row-level save

### Phase 3 — Breeder daily production entry
- Daily female pen entry
- Separate male section per pen
- Opening stock auto-fill from previous closing
- Fertility / hatchability data capture
- Hatch egg output

### Phase 4 — Hatchery forecast
- Hatch eggs received
- Eggs set
- Fertility %
- Hatchability %
- Chicks available
- Placement availability calendar

### Phase 5 — Broiler planning
- Chick placements
- Farm/shed capacity
- Target processing age
- Broiler flock lifecycle
- Processing forecast later

## Fastest deployment route

Frontend:
- Vercel
- domain: demo.ovicore.com.au first, app.ovicore.com.au later

Backend:
- Azure App Service or Azure Container Apps

Database:
- Azure PostgreSQL Flexible Server

## Important design principle

The new OviCore should feel like a premium poultry command system, not a dashboard. The Excel-like production and planning tables are a core differentiator.
