from datetime import date
from fastapi import APIRouter
from app.domain.schemas import BreederFlockPlanCreate, BreederFlockPlanRead

router = APIRouter()

# Mock data first.
# This allows the Next.js planning screen to work immediately before database wiring.
PLANS: list[dict] = [
    {
        "id": 1,
        "plan_name": "FY27 Breeder Placement Plan",
        "flock_code": "BR-2701",
        "farm_name": "Breeder Farm 1",
        "shed_code": "BR Shed 01",
        "placement_date": date(2026, 7, 6),
        "planned_females": 6200,
        "planned_males": 620,
        "transfer_age_weeks": 20,
        "depletion_age_weeks": 64,
        "expected_peak_hen_day": 86,
        "expected_fertility_pct": 88,
        "expected_hatchability_pct": 82,
        "status": "planned",
        "notes": "Base planning flock",
    },
    {
        "id": 2,
        "plan_name": "FY27 Breeder Placement Plan",
        "flock_code": "BR-2702",
        "farm_name": "Breeder Farm 1",
        "shed_code": "BR Shed 02",
        "placement_date": date(2026, 7, 13),
        "planned_females": 6100,
        "planned_males": 580,
        "transfer_age_weeks": 20,
        "depletion_age_weeks": 64,
        "expected_peak_hen_day": 84,
        "expected_fertility_pct": 86,
        "expected_hatchability_pct": 81,
        "status": "review",
        "notes": "Male ratio slightly low",
    },
    {
        "id": 3,
        "plan_name": "FY27 Breeder Placement Plan",
        "flock_code": "BR-2703",
        "farm_name": "Breeder Farm 2",
        "shed_code": "BR Shed 03",
        "placement_date": date(2026, 7, 20),
        "planned_females": 6400,
        "planned_males": 640,
        "transfer_age_weeks": 20,
        "depletion_age_weeks": 65,
        "expected_peak_hen_day": 87,
        "expected_fertility_pct": 89,
        "expected_hatchability_pct": 83,
        "status": "planned",
        "notes": "Strong capacity fit",
    },
]


def enrich_plan(plan: dict) -> dict:
    females = plan["planned_females"]
    males = plan["planned_males"]
    male_percent = (males / females * 100) if females else 0

    # Very simple starter projection:
    # week 30 = female count x peak hen day x 7 days x settable assumption.
    weekly_eggs = int(females * (plan["expected_peak_hen_day"] / 100) * 7)
    hatch_eggs = int(weekly_eggs * 0.92)
    chicks = int(hatch_eggs * (plan["expected_fertility_pct"] / 100) * (plan["expected_hatchability_pct"] / 100))

    flags = []
    if male_percent < 9.5:
        flags.append("Male ratio low")
    if plan["expected_fertility_pct"] < 87:
        flags.append("Fertility assumption low")
    if plan["depletion_age_weeks"] > 64:
        flags.append("Long depletion age")

    return {
        **plan,
        "male_percent": round(male_percent, 1),
        "projected_hatch_eggs_week_30": hatch_eggs,
        "projected_chicks_week_30": chicks,
        "planning_flag": ", ".join(flags) if flags else "Within planning range",
    }


@router.get("/breeder-flock-plans", response_model=list[BreederFlockPlanRead])
def list_breeder_flock_plans():
    return [enrich_plan(plan) for plan in PLANS]


@router.post("/breeder-flock-plans", response_model=BreederFlockPlanRead)
def create_breeder_flock_plan(payload: BreederFlockPlanCreate):
    new_plan = {
        "id": max(plan["id"] for plan in PLANS) + 1 if PLANS else 1,
        **payload.model_dump(),
    }
    PLANS.append(new_plan)
    return enrich_plan(new_plan)


@router.get("/summary")
def planning_summary():
    enriched = [enrich_plan(plan) for plan in PLANS]

    return {
        "active_plans": len(enriched),
        "planned_females": sum(plan["planned_females"] for plan in enriched),
        "planned_males": sum(plan["planned_males"] for plan in enriched),
        "projected_hatch_eggs_week_30": sum(plan["projected_hatch_eggs_week_30"] for plan in enriched),
        "projected_chicks_week_30": sum(plan["projected_chicks_week_30"] for plan in enriched),
        "review_items": sum(1 for plan in enriched if plan["planning_flag"] != "Within planning range"),
    }
