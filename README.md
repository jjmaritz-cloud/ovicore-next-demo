# OviCore Next — Breeder / Hatchery / Broiler Planning Starter

This starter is the fastest clean path toward a real OviCore platform using:

- Next.js frontend
- FastAPI backend
- PostgreSQL database
- Breeder → Hatchery → Broiler planning-first structure

## Recommended build order

1. Flock Planning
2. Breeder Daily Entry
3. Egg Room / Hatchery Forecast
4. Broiler Placement Planning
5. Reports / Graphs / Manager Briefing
6. Feed and cost integration

## Why start with planning?

Planning is the backbone. Once the system knows:

- breeder flock placements
- female and male numbers
- expected production curve
- fertility %
- hatchability %
- hatch egg output
- chick availability
- broiler placement demand

then production entry, hatchery, broiler placement and reporting can all hang off the same structure.

## Quick local start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### PostgreSQL

Use `docker-compose.yml` from the project root:

```bash
docker compose up -d
```

The starter backend includes mock in-memory data first, so the planning UI can work quickly before the real database migration is wired up.

## Suggested live demo domains

- Website: www.ovicore.com.au
- Demo: demo.ovicore.com.au
- App: app.ovicore.com.au
- Staging: staging.ovicore.com.au
