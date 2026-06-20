from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_name: Mapped[str] = mapped_column(String, nullable=False)
    company_type: Mapped[str] = mapped_column(String, default="broiler_integrated")
    enable_layers: Mapped[bool] = mapped_column(Boolean, default=False)
    enable_breeders: Mapped[bool] = mapped_column(Boolean, default=True)
    enable_egg_room: Mapped[bool] = mapped_column(Boolean, default=True)
    enable_hatchery: Mapped[bool] = mapped_column(Boolean, default=True)
    enable_broilers: Mapped[bool] = mapped_column(Boolean, default=True)
    enable_processing: Mapped[bool] = mapped_column(Boolean, default=False)


class Farm(Base):
    __tablename__ = "farms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    farm_name: Mapped[str] = mapped_column(String, nullable=False)
    farm_type: Mapped[str] = mapped_column(String, nullable=False)
    region: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Shed(Base):
    __tablename__ = "sheds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), nullable=False)
    shed_code: Mapped[str] = mapped_column(String, nullable=False)
    shed_type: Mapped[str] = mapped_column(String, nullable=False)
    capacity_female: Mapped[int | None] = mapped_column(Integer, nullable=True)
    capacity_male: Mapped[int | None] = mapped_column(Integer, nullable=True)
    capacity_broilers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class BreederFlockPlan(Base):
    __tablename__ = "breeder_flock_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    plan_name: Mapped[str] = mapped_column(String, nullable=False)
    flock_code: Mapped[str] = mapped_column(String, nullable=False)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), nullable=False)
    shed_id: Mapped[int] = mapped_column(ForeignKey("sheds.id"), nullable=False)
    placement_date: Mapped[str] = mapped_column(Date, nullable=False)
    planned_females: Mapped[int] = mapped_column(Integer, nullable=False)
    planned_males: Mapped[int] = mapped_column(Integer, nullable=False)
    transfer_age_weeks: Mapped[float] = mapped_column(Numeric(5, 2), default=20)
    depletion_age_weeks: Mapped[float] = mapped_column(Numeric(5, 2), default=64)
    expected_peak_hen_day: Mapped[float] = mapped_column(Numeric(5, 2), default=86)
    expected_fertility_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=88)
    expected_hatchability_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=82)
    status: Mapped[str] = mapped_column(String, default="planned")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
