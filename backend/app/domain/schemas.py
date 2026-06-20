from datetime import date
from pydantic import BaseModel, Field


class BreederFlockPlanBase(BaseModel):
    plan_name: str
    flock_code: str
    farm_name: str
    shed_code: str
    placement_date: date
    planned_females: int = Field(ge=0)
    planned_males: int = Field(ge=0)
    transfer_age_weeks: float = 20
    depletion_age_weeks: float = 64
    expected_peak_hen_day: float = 86
    expected_fertility_pct: float = 88
    expected_hatchability_pct: float = 82
    status: str = "planned"
    notes: str | None = None


class BreederFlockPlanCreate(BreederFlockPlanBase):
    pass


class BreederFlockPlanRead(BreederFlockPlanBase):
    id: int
    male_percent: float
    projected_hatch_eggs_week_30: int
    projected_chicks_week_30: int
    planning_flag: str
