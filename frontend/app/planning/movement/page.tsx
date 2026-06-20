"use client";

import { useEffect, useMemo, useState } from "react";
import { createBreederFlockPlan, getBreederFlockPlans } from "@/lib/api";

type Plan = {
  id: number;
  plan_name: string;
  flock_code: string;
  farm_name: string;
  shed_code: string;
  placement_date: string;
  planned_females: number;
  planned_males: number;
  male_percent: number;
  transfer_age_weeks: number;
  depletion_age_weeks: number;
  expected_peak_hen_day: number;
  expected_fertility_pct: number;
  expected_hatchability_pct: number;
  projected_hatch_eggs_week_30: number;
  projected_chicks_week_30: number;
  planning_flag: string;
  status: string;
  notes?: string;
};

type WeeklySupplyDemand = {
  weekIndex: number;
  weekLabel: string;
  dateLabel: string;
  chicksAvailable: number;
  broilerDemand: number;
  gap: number;
  status: "covered" | "tight" | "short";
};

type SegmentType = "development" | "production" | "hatchery" | "broiler";

type WeeklyOutputPoint = {
  weekIndex: number;
  hatchEggs: number;
  chicks: number;
};

type ShedConflict = {
  planId: number;
  conflictingPlanId: number;
  message: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const TIMELINE_WEEKS = 34;

function getMockBroilerDemand(weekIndex: number) {
  const demandByWeek: Record<number, number> = {
    24: 68000,
    25: 72000,
    26: 76000,
    27: 78000,
    28: 74000,
    29: 80000,
    30: 82000,
    31: 79000,
    32: 76000,
    33: 84000,
  };

  return demandByWeek[weekIndex] ?? 0;
}

export default function BirdMovementPlannerPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [showAddPlacementModal, setShowAddPlacementModal] = useState(false);
  const [savingPlacement, setSavingPlacement] = useState(false);
	const [dirtyPlanIds, setDirtyPlanIds] = useState<Set<number>>(new Set());
	const [lockedTimelineStart, setLockedTimelineStart] = useState<Date | null>(null);

  const [settableEggPct, setSettableEggPct] = useState(92);
  const [broilerDemandAdjustmentPct, setBroilerDemandAdjustmentPct] = useState(0);
  const [fertilityStressPct, setFertilityStressPct] = useState(0);
  const [hatchabilityStressPct, setHatchabilityStressPct] = useState(0);
  const [showAdvancedAssumptions, setShowAdvancedAssumptions] = useState(false);
	const [showLifecycleBoard, setShowLifecycleBoard] = useState(true);

  async function refreshPlans(selectId?: number) {
		const plansData = await getBreederFlockPlans();
		setPlans(plansData);

		if (!lockedTimelineStart && plansData.length) {
			const earliestPlacement = plansData
				.map((plan) => new Date(plan.placement_date))
				.sort((a, b) => a.getTime() - b.getTime())[0];

			setLockedTimelineStart(startOfWeek(earliestPlacement));
		}

    if (selectId) {
      setSelectedPlanId(selectId);
    } else {
      setSelectedPlanId((current) => current ?? plansData[0]?.id ?? null);
    }
  }

  useEffect(() => {
    refreshPlans();
  }, []);

  async function handleCreatePlacement(payload: Record<string, unknown>) {
    try {
      setSavingPlacement(true);

      const createdPlan = await createBreederFlockPlan(payload);

      await refreshPlans(createdPlan.id);

      setShowAddPlacementModal(false);
    } finally {
      setSavingPlacement(false);
    }
  }
	
	function handleMovePlanPlacement(planId: number, newPlacementDate: string) {
  setPlans((currentPlans) =>
    currentPlans.map((plan) =>
      plan.id === planId
        ? {
            ...plan,
            placement_date: newPlacementDate,
          }
        : plan
    )
  );

  setDirtyPlanIds((current) => {
    const next = new Set(current);
    next.add(planId);
    return next;
  });

  setSelectedPlanId(planId);
}

	const timelineStart = lockedTimelineStart ?? startOfWeek(new Date());

  const weeks = useMemo(() => {
    return Array.from({ length: TIMELINE_WEEKS }, (_, index) => {
      const start = addDays(timelineStart, index * 7);
      const end = addDays(start, 6);

      return {
        index,
        start,
        end,
        label: `W${index + 1}`,
        dateLabel: formatWeekLabel(start),
      };
    });
  }, [timelineStart]);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];
	
	const shedConflicts = useMemo<ShedConflict[]>(() => {
		const conflicts: ShedConflict[] = [];

		for (let i = 0; i < plans.length; i++) {
			const planA = plans[i];

			const planAStart = new Date(planA.placement_date);
			const planAEnd = addDays(planAStart, planA.depletion_age_weeks * 7);

			for (let j = i + 1; j < plans.length; j++) {
				const planB = plans[j];

				const sameFarm =
					planA.farm_name.trim().toLowerCase() ===
					planB.farm_name.trim().toLowerCase();

				const sameShed =
					planA.shed_code.trim().toLowerCase() ===
					planB.shed_code.trim().toLowerCase();

				if (!sameFarm || !sameShed) continue;

				const planBStart = new Date(planB.placement_date);
				const planBEnd = addDays(planBStart, planB.depletion_age_weeks * 7);

				const overlaps = planAStart <= planBEnd && planBStart <= planAEnd;

				if (overlaps) {
					conflicts.push({
						planId: planA.id,
						conflictingPlanId: planB.id,
						message: `${planA.flock_code} overlaps ${planB.flock_code} in ${planA.farm_name} / ${planA.shed_code}`,
					});

					conflicts.push({
						planId: planB.id,
						conflictingPlanId: planA.id,
						message: `${planB.flock_code} overlaps ${planA.flock_code} in ${planB.farm_name} / ${planB.shed_code}`,
					});
				}
			}
		}

		return conflicts;
	}, [plans]);

	const selectedPlanConflicts = selectedPlan
		? shedConflicts.filter((conflict) => conflict.planId === selectedPlan.id)
		: [];

	const conflictPlanIds = new Set(shedConflicts.map((conflict) => conflict.planId));

  const weeklySupplyDemand = useMemo<WeeklySupplyDemand[]>(() => {
    return weeks.map((week) => {
      const chicksAvailable = plans.reduce((total, plan) => {
        const placementDate = new Date(plan.placement_date);
  
		const flockAgeWeeks = Math.floor(
		  (week.start.getTime() - placementDate.getTime()) / WEEK_MS
		);

		if (
		  flockAgeWeeks < plan.transfer_age_weeks ||
		  flockAgeWeeks > plan.depletion_age_weeks
		) {
		  return total;
		}

		const weeklyHenDayPct = getBreederHenDayCurve(
		  flockAgeWeeks,
		  plan.expected_peak_hen_day
		);

		const weeklyEggs = plan.planned_females * (weeklyHenDayPct / 100) * 7;

		const hatchEggs = weeklyEggs * (settableEggPct / 100);

		const adjustedFertilityPct = Math.max(
			0,
			plan.expected_fertility_pct - fertilityStressPct
		);

		const adjustedHatchabilityPct = Math.max(
			0,
			plan.expected_hatchability_pct - hatchabilityStressPct
		);

		const chicks =
			hatchEggs *
			(adjustedFertilityPct / 100) *
			(adjustedHatchabilityPct / 100);

		return total + Math.round(chicks);
      }, 0);
  
      const broilerDemand = Math.round(
				getMockBroilerDemand(week.index) * (1 + broilerDemandAdjustmentPct / 100)
			);
      const gap = chicksAvailable - broilerDemand;
  
      let status: WeeklySupplyDemand["status"] = "covered";
  
      if (broilerDemand > 0 && gap < 0) {
        status = "short";
      } else if (broilerDemand > 0 && gap <= broilerDemand * 0.05) {
        status = "tight";
      }
  
      return {
        weekIndex: week.index,
        weekLabel: week.label,
        dateLabel: week.dateLabel,
        chicksAvailable,
        broilerDemand,
        gap,
        status,
      };
    });
  }, [
		plans,
		weeks,
		timelineStart,
		settableEggPct,
		broilerDemandAdjustmentPct,
		fertilityStressPct,
		hatchabilityStressPct,
	]);

  const totalFemales = plans.reduce((sum, plan) => sum + plan.planned_females, 0);
  const totalMales = plans.reduce((sum, plan) => sum + plan.planned_males, 0);
  const totalChicks = plans.reduce(
    (sum, plan) => sum + plan.projected_chicks_week_30,
    0
  );
  const reviewItems = plans.filter(
    (plan) => plan.planning_flag !== "Within planning range"
  ).length;
	
	const selectedFlowSummary = useMemo(() => {
		if (!selectedPlan) return null;

		const weeklyEggs =
			selectedPlan.planned_females *
			(selectedPlan.expected_peak_hen_day / 100) *
			7;

		const hatchEggs = weeklyEggs * (settableEggPct / 100);

		const adjustedFertilityPct = Math.max(
			0,
			selectedPlan.expected_fertility_pct - fertilityStressPct
		);

		const adjustedHatchabilityPct = Math.max(
			0,
			selectedPlan.expected_hatchability_pct - hatchabilityStressPct
		);

		const chicks =
			hatchEggs *
			(adjustedFertilityPct / 100) *
			(adjustedHatchabilityPct / 100);

		const nextDemandWeek =
			weeklySupplyDemand.find((week) => week.broilerDemand > 0) ??
			weeklySupplyDemand.find((week) => week.chicksAvailable > 0);

		return {
			females: selectedPlan.planned_females,
			males: selectedPlan.planned_males,
			malePercent:
				selectedPlan.planned_females > 0
					? (selectedPlan.planned_males / selectedPlan.planned_females) * 100
					: 0,
			weeklyEggs: Math.round(weeklyEggs),
			hatchEggs: Math.round(hatchEggs),
			chicks: Math.round(chicks),
			fertilityPct: adjustedFertilityPct,
			hatchabilityPct: adjustedHatchabilityPct,
			coverWeek: nextDemandWeek,
		};
	}, [
		selectedPlan,
		weeklySupplyDemand,
		settableEggPct,
		fertilityStressPct,
		hatchabilityStressPct,
	]);

  return (
    <main className="min-h-screen p-5">
      <div className="grid min-h-[calc(100vh-40px)] grid-cols-[86px_minmax(0,1fr)] overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <aside className="bg-ovicore-emerald p-4 text-white">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-yellow-400 text-2xl font-black text-emerald-950">
            O
          </div>

          <div className="space-y-3">
            {["⌂", "↗", "▦", "◇", "⌁", "⚙"].map((icon, index) => (
              <div
                key={icon}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${
                  index === 1 ? "bg-white/15 shadow-inner" : "text-white/60"
                }`}
              >
                {icon}
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0 bg-slate-50">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-ovicore-green">
                Planning / Bird movement
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.06em]">
                Bird Movement Planner
              </h1>
            </div>

            <div className="flex gap-2">
              <a
                href="/planning"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-ovicore-emerald"
              >
                Planning table
              </a>
							<button
								onClick={() => setShowAddPlacementModal(true)}
								className="rounded-2xl bg-ovicore-emerald px-4 py-2 text-sm font-black text-white"
							>
								Add breeder placement
							</button>
            </div>
          </header>

          <div className="p-4">
						<section className="mb-4 rounded-[1.75rem] bg-gradient-to-br from-ovicore-emerald to-emerald-800 px-5 py-4 text-white shadow-xl">
							<div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
								<div>
									<p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
										Breeders → Hatchery → Broilers
									</p>
									<h2 className="mt-1 text-2xl font-black tracking-[-0.06em]">
										Parent stock movement and broiler placement cover
									</h2>
								</div>

								<p className="max-w-2xl text-sm font-semibold text-emerald-100">
									Move breeder placements, review hatch egg and chick output, and check whether projected chicks cover broiler placement demand.
								</p>
							</div>
						</section>

						<section className="mb-4 grid gap-3 md:grid-cols-7">
							<Kpi label="Breeder flocks" value={String(plans.length)} />
							<Kpi label="Females planned" value={totalFemales.toLocaleString()} />
							<Kpi label="Males planned" value={totalMales.toLocaleString()} />
							<Kpi label="Chicks W30" value={totalChicks.toLocaleString()} />
							<Kpi label="Review items" value={String(reviewItems)} />
							<Kpi
								label="Short weeks"
								value={String(weeklySupplyDemand.filter((week) => week.status === "short").length)}
							/>
							<Kpi label="Shed conflicts" value={String(conflictPlanIds.size)} />
						</section>

			<section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
				<div className="space-y-5">
					<ParentStockFlowCard
						selectedPlan={selectedPlan}
						flowSummary={selectedFlowSummary}
					/>

				<AdvancedAssumptionsDropdown
					open={showAdvancedAssumptions}
					setOpen={setShowAdvancedAssumptions}
					settableEggPct={settableEggPct}
					setSettableEggPct={setSettableEggPct}
					broilerDemandAdjustmentPct={broilerDemandAdjustmentPct}
					setBroilerDemandAdjustmentPct={setBroilerDemandAdjustmentPct}
					fertilityStressPct={fertilityStressPct}
					setFertilityStressPct={setFertilityStressPct}
					hatchabilityStressPct={hatchabilityStressPct}
					setHatchabilityStressPct={setHatchabilityStressPct}
				/>
				
				<div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
					<button
						type="button"
						onClick={() => setShowLifecycleBoard(!showLifecycleBoard)}
						className="flex w-full items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 text-left"
					>
						<div>
							<h3 className="text-xl font-black tracking-[-0.04em]">
								Lifecycle movement board
							</h3>
							<p className="text-sm text-slate-500">
								Drag a breeder row left or right to test how placement timing shifts production, chicks and cover.
							</p>
						</div>

						<div className="flex shrink-0 items-center gap-4">
							<div className="hidden items-center gap-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500 xl:flex">
								<Legend colour="bg-emerald-600" label="Development" />
								<Legend colour="bg-blue-600" label="Production" />
								<Legend colour="bg-yellow-500" label="Hatchery" />
								<Legend colour="bg-purple-600" label="Broiler" />
							</div>

							<div className="rounded-full bg-ovicore-mint px-4 py-2 text-sm font-black text-ovicore-emerald">
								{showLifecycleBoard ? "Hide ▲" : "Show ▼"}
							</div>
						</div>
					</button>

								{showLifecycleBoard && (
									<div className="max-h-[68vh] overflow-auto border-t border-slate-100 bg-white pb-3">
									<div
										style={{
											minWidth: `${230 + weeks.length * 78}px`,
											display: "grid",
											gridTemplateColumns: `230px repeat(${weeks.length}, 78px)`,
										}}
									>
										<div className="sticky left-0 top-0 z-40 border-b border-r border-slate-300 bg-slate-100 px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-600">
											Flock / Shed
										</div>

                    {weeks.map((week) => (
											<div
												key={week.index}
												className="sticky top-0 z-30 border-b border-r border-slate-300 bg-slate-100 px-2 py-3 text-center"
											>
                        <div className="text-[11px] font-black text-slate-700">
                          {week.label}
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-slate-400">
                          {week.dateLabel}
                        </div>
                      </div>
                    ))}

                    {plans.map((plan) => (
											<MovementRow
												key={plan.id}
												plan={plan}
												weeks={weeks}
												timelineStart={timelineStart}
												selected={plan.id === selectedPlan?.id}
												hasConflict={conflictPlanIds.has(plan.id)}
												isDirty={dirtyPlanIds.has(plan.id)}
												settableEggPct={settableEggPct}
												fertilityStressPct={fertilityStressPct}
												hatchabilityStressPct={hatchabilityStressPct}
												onSelect={() => setSelectedPlanId(plan.id)}
												onMovePlacement={handleMovePlanPlacement}
											/>
                    ))}

                    <SummaryLane
                      label="Hatchery capacity"
                      weeks={weeks}
                      colour="bg-yellow-400"
                      text="Projected hatch egg pressure"
                    />

                    <SummaryLane
                      label="Broiler placements"
                      weeks={weeks}
                      colour="bg-purple-500"
                      text="Chick placement window"
                    />
                  </div>
                </div>
              )}
            </div>

              <SupplyDemandBoard weeklySupplyDemand={weeklySupplyDemand} />

			  </div>

              <aside className="space-y-5">
								<SelectedPlanPanel
									plan={selectedPlan}
									conflicts={selectedPlanConflicts}
								/>

								<div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl">
                  <h3 className="text-lg font-black tracking-[-0.04em]">
                    Planning signals
                  </h3>
                  <div className="mt-4 space-y-3">
                    <Signal
                      status="good"
                      title="Capacity visibility"
                      text="Breeder placements are visible against hatchery and broiler demand."
                    />
										<Signal
											status={conflictPlanIds.size > 0 ? "review" : "good"}
											title="Shed capacity"
											text={
												conflictPlanIds.size > 0
													? `${conflictPlanIds.size} flock plans have shed overlap conflicts.`
													: "No breeder shed overlap conflicts detected."
											}
										/>
                    <Signal
                      status="review"
                      title="Review suggested"
                      text={`${reviewItems} flock plan items need review before final approval.`}
                    />
										<Signal
											status="info"
											title="How to use this"
											text="Drag a flock movement row to test timing. The production curve and weekly placement cover update immediately."
										/>
                  </div>
                </div>
              </aside>
            </section>
          </div>
        </section>
      </div>
		{showAddPlacementModal && (
			<AddBreederPlacementModal
				saving={savingPlacement}
				onClose={() => setShowAddPlacementModal(false)}
				onSave={handleCreatePlacement}
			/>
		)}
    </main>
  );
}

function MovementRow({
  plan,
  weeks,
  timelineStart,
  selected,
  hasConflict,
  isDirty,
  settableEggPct,
  fertilityStressPct,
  hatchabilityStressPct,
  onSelect,
  onMovePlacement,
}: {
  plan: Plan;
  weeks: { index: number; start: Date; end: Date; label: string; dateLabel: string }[];
  timelineStart: Date;
  selected: boolean;
  hasConflict: boolean;
  isDirty: boolean;
  settableEggPct: number;
  fertilityStressPct: number;
  hatchabilityStressPct: number;
  onSelect: () => void;
  onMovePlacement: (planId: number, newPlacementDate: string) => void;
}) {
	const [dragInfo, setDragInfo] = useState<{
		startX: number;
		originalPlacementDate: Date;
		weekWidth: number;
		pointerId: number;
	} | null>(null);

	const [dragWeekDelta, setDragWeekDelta] = useState(0);
  const placementDate = new Date(plan.placement_date);
  const transferDate = addDays(placementDate, plan.transfer_age_weeks * 7);
  const peakDate = addDays(placementDate, 30 * 7);
	const productionEndDate = addDays(
		placementDate,
		Math.min(plan.depletion_age_weeks, 64) * 7
	);

	const development = getBarPosition(timelineStart, placementDate, transferDate);
	const production = getBarPosition(timelineStart, transferDate, productionEndDate);

	const weeklyOutput = getWeeklyOutputCurve({
		plan,
		timelineStart,
		weeksCount: TIMELINE_WEEKS,
		settableEggPct,
		fertilityStressPct,
		hatchabilityStressPct,
	});
function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
  if (event.button !== 0) return;

  onSelect();

  const rect = event.currentTarget.getBoundingClientRect();
  const weekWidth = rect.width / TIMELINE_WEEKS;

  setDragInfo({
    startX: event.clientX,
    originalPlacementDate: new Date(plan.placement_date),
    weekWidth,
    pointerId: event.pointerId,
  });

  setDragWeekDelta(0);
  event.currentTarget.setPointerCapture(event.pointerId);
}

function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
  if (!dragInfo) return;

  const rawDelta = event.clientX - dragInfo.startX;
  const weekDelta = Math.round(rawDelta / dragInfo.weekWidth);

  if (weekDelta === dragWeekDelta) return;

  setDragWeekDelta(weekDelta);

  const newPlacementDate = addDays(
    dragInfo.originalPlacementDate,
    weekDelta * 7
  );

  onMovePlacement(plan.id, toIsoDate(newPlacementDate));
}

function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
  if (dragInfo) {
    event.currentTarget.releasePointerCapture(dragInfo.pointerId);
  }

  setDragInfo(null);
  setDragWeekDelta(0);
}

  return (
    <>
      <button
        onClick={onSelect}
				className={`sticky left-0 z-20 border-b border-r border-slate-300 px-4 py-4 text-left ${
					hasConflict
						? "bg-red-50"
						: selected
							? "bg-emerald-50"
							: "bg-white"
				}`}
      >
				<div className="text-center text-sm font-black">{plan.flock_code}</div>
				<div className="mt-1 text-center text-xs font-bold text-slate-500">
					{plan.farm_name} / {plan.shed_code}
				</div>
				<div className="mt-2 inline-flex w-full justify-center">
					<span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase text-slate-600">
						0w → {plan.depletion_age_weeks}w
					</span>
				</div>
      </button>

			<div
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}
				className={`relative cursor-grab select-none border-b border-slate-200 active:cursor-grabbing ${
					hasConflict
						? "bg-red-50"
						: selected
							? "bg-emerald-50"
							: "bg-white"
				}`}
				style={{
					gridColumn: `2 / span ${weeks.length}`,
          display: "grid",
          gridTemplateColumns: `repeat(${weeks.length}, minmax(44px, 1fr))`,
          minHeight: "132px",
        }}
      >
        {weeks.map((week) => (
          <div
            key={week.index}
            className="border-r border-slate-100"
            style={{ gridColumn: `${week.index + 1}` }}
          />
        ))}

				<TimelineBar
					type="development"
					label="Development"
					subtitle={`0w → ${plan.transfer_age_weeks}w | ${formatShortDate(placementDate)} → ${formatShortDate(transferDate)}`}
					{...development}
				/>

				<TimelineBar
					type="production"
					label="Production"
					subtitle={`${plan.transfer_age_weeks}w → ${plan.depletion_age_weeks}w | Peak ${30}w around ${formatShortDate(peakDate)}`}
					{...production}
				/>

				<OutputCurve
					type="hatchery"
					label={`Hatch eggs | ${plan.transfer_age_weeks}w+`}
					points={weeklyOutput}
					valueKey="hatchEggs"
				/>

				<OutputCurve
					type="broiler"
					label={`Chicks | ${plan.transfer_age_weeks}w+`}
					points={weeklyOutput}
					valueKey="chicks"
				/>

				{isDirty && !hasConflict && (
					<div className="absolute right-3 top-3 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black uppercase text-blue-700">
						Unsaved move
					</div>
				)}

				{hasConflict && (
					<div className="absolute right-3 top-3 rounded-full bg-red-100 px-3 py-1 text-[11px] font-black uppercase text-red-700">
						Shed conflict
					</div>
				)}

				{!hasConflict && !isDirty && plan.planning_flag !== "Within planning range" && (
					<div
						className="absolute right-3 top-3 rounded-full bg-orange-100 px-3 py-1 text-[11px] font-black uppercase text-orange-700"
						title={plan.planning_flag}
					>
						Review
					</div>
				)}
      </div>
    </>
  );
}

function TimelineBar({
  start,
  span,
  type,
  label,
  subtitle,
}: {
  start: number;
  span: number;
  type: SegmentType;
  label: string;
  subtitle: string;
}) {
  if (span <= 0) return null;

  const styles: Record<SegmentType, string> = {
    development: "bg-emerald-600 text-white",
    production: "bg-blue-600 text-white",
    hatchery: "bg-yellow-400 text-amber-950",
    broiler: "bg-purple-600 text-white",
  };

  return (
    <div
      className={`my-2 flex min-w-0 flex-col justify-center rounded-2xl px-3 shadow-sm ${styles[type]}`}
      style={{
        gridColumn: `${start + 1} / span ${span}`,
        minHeight: "34px",
      }}
    >
      <div className="truncate text-center text-xs font-black uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-1 truncate text-center text-[11px] font-bold opacity-90">
        {subtitle}
      </div>
    </div>
  );
}

function OutputCurve({
  type,
  label,
  points,
  valueKey,
}: {
  type: "hatchery" | "broiler";
  label: string;
  points: WeeklyOutputPoint[];
  valueKey: "hatchEggs" | "chicks";
}) {
  const maxValue = Math.max(...points.map((point) => point[valueKey]), 1);

  const colour =
    type === "hatchery"
      ? "bg-yellow-400 text-amber-950"
      : "bg-purple-600 text-white";

  const activePoints = points.filter((point) => point[valueKey] > 0);

  if (!activePoints.length) return null;

  const firstWeek = activePoints[0].weekIndex;
  const lastWeek = activePoints[activePoints.length - 1].weekIndex;
  const span = lastWeek - firstWeek + 1;

  return (
    <div
      className="relative mx-2 mt-1 flex items-end gap-[2px] rounded-2xl bg-white/70 px-2 pb-2 pt-6"
      style={{
        gridColumn: `${firstWeek + 1} / span ${span}`,
        minHeight: "38px",
      }}
    >
			<div className="absolute left-3 top-1 max-w-[220px] truncate text-[10px] font-black uppercase tracking-wide text-slate-500">
				{label}
			</div>

      {activePoints.map((point) => {
        const value = point[valueKey];
        const height = Math.max(8, Math.round((value / maxValue) * 28));

        return (
          <div
            key={`${type}-${point.weekIndex}`}
            title={`${label}: ${value.toLocaleString()}`}
            className={`flex flex-1 items-end justify-center rounded-t-md ${colour}`}
            style={{
              height: `${height}px`,
              minWidth: "6px",
            }}
          />
        );
      })}
    </div>
  );
}

function SummaryLane({
  label,
  weeks,
  colour,
  text,
}: {
  label: string;
  weeks: { index: number }[];
  colour: string;
  text: string;
}) {
  return (
    <>
      <div className="sticky left-0 z-20 border-b border-r border-slate-300 bg-slate-50 px-4 py-4 text-center text-sm font-black">
        {label}
      </div>

      <div
        className="relative border-b border-slate-200 bg-slate-50"
        style={{
          gridColumn: `2 / span ${weeks.length}`,
          display: "grid",
          gridTemplateColumns: `repeat(${weeks.length}, minmax(44px, 1fr))`,
          minHeight: "62px",
        }}
      >
        {weeks.map((week) => (
          <div
            key={week.index}
            className="border-r border-slate-100"
            style={{ gridColumn: `${week.index + 1}` }}
          />
        ))}

        <div
          className={`my-3 flex items-center justify-center rounded-2xl px-3 text-center text-xs font-black text-white shadow-sm ${colour}`}
          style={{ gridColumn: "24 / span 8" }}
        >
          {text}
        </div>
      </div>
    </>
  );
}

function ParentStockFlowCard({
  selectedPlan,
  flowSummary,
}: {
  selectedPlan?: Plan;
  flowSummary: {
    females: number;
    males: number;
    malePercent: number;
    weeklyEggs: number;
    hatchEggs: number;
    chicks: number;
    fertilityPct: number;
    hatchabilityPct: number;
    coverWeek?: WeeklySupplyDemand;
  } | null;
}) {
  if (!selectedPlan || !flowSummary) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-xl font-black tracking-[-0.04em]">
          Parent stock to broilers
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Select a flock to see how parent stock birds convert into broiler placements.
        </p>
      </div>
    );
  }

  const coverWeek = flowSummary.coverWeek;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-ovicore-green">
            Selected flock impact
          </p>
          <h3 className="mt-1 text-xl font-black tracking-[-0.04em]">
            Parent stock → hatch eggs → chicks → broilers
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Shows how {selectedPlan.flock_code} converts breeder birds into broiler placement cover.
          </p>
        </div>

        <div className="rounded-full bg-ovicore-mint px-4 py-2 text-sm font-black text-ovicore-emerald">
          {selectedPlan.flock_code}
        </div>
      </div>

      <div className="grid gap-3 p-5 xl:grid-cols-[1fr_40px_1fr_40px_1fr_40px_1fr]">
        <FlowStep
          title="Parent stock"
          main={`${flowSummary.females.toLocaleString()} females`}
          sub={`${flowSummary.males.toLocaleString()} males | ${flowSummary.malePercent.toFixed(1)}% male ratio`}
          tone="green"
        />

        <FlowArrow />

        <FlowStep
          title="Hatch eggs"
          main={`${flowSummary.hatchEggs.toLocaleString()} / week`}
          sub={`${flowSummary.weeklyEggs.toLocaleString()} eggs × settable egg %`}
          tone="yellow"
        />

        <FlowArrow />

        <FlowStep
          title="Day-old chicks"
          main={`${flowSummary.chicks.toLocaleString()} / week`}
          sub={`${flowSummary.fertilityPct.toFixed(1)}% fertility × ${flowSummary.hatchabilityPct.toFixed(1)}% hatchability`}
          tone="purple"
        />

        <FlowArrow />

        <FlowStep
          title="Broilers on floor"
          main={
            coverWeek
              ? `${coverWeek.broilerDemand.toLocaleString()} required`
              : "No demand set"
          }
          sub={
            coverWeek
              ? `${coverWeek.weekLabel} | ${coverWeek.gap >= 0 ? "+" : ""}${coverWeek.gap.toLocaleString()} cover`
              : "Add broiler demand to calculate cover"
          }
          tone={coverWeek?.status === "short" ? "red" : coverWeek?.status === "tight" ? "orange" : "blue"}
        />
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
        <div className="grid gap-3 md:grid-cols-4">
          <FlowFormula
            label="Eggs"
            value="Females × peak HD% × 7 days"
          />
          <FlowFormula
            label="Hatch eggs"
            value="Eggs × settable egg %"
          />
          <FlowFormula
            label="Chicks"
            value="Hatch eggs × fertility × hatchability"
          />
          <FlowFormula
            label="Placement cover"
            value="Chicks available − broiler demand"
          />
        </div>
      </div>
    </div>
  );
}

function FlowStep({
  title,
  main,
  sub,
  tone,
}: {
  title: string;
  main: string;
  sub: string;
  tone: "green" | "yellow" | "purple" | "blue" | "orange" | "red";
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-900 border-emerald-200",
    yellow: "bg-yellow-50 text-amber-900 border-yellow-200",
    purple: "bg-purple-50 text-purple-900 border-purple-200",
    blue: "bg-blue-50 text-blue-900 border-blue-200",
    orange: "bg-orange-50 text-orange-900 border-orange-200",
    red: "bg-red-50 text-red-900 border-red-200",
  };

  return (
    <div className={`rounded-3xl border p-4 text-center ${tones[tone]}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.14em] opacity-70">
        {title}
      </div>
      <div className="mt-2 text-2xl font-black tracking-[-0.06em]">
        {main}
      </div>
      <div className="mt-1 text-xs font-bold opacity-75">
        {sub}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden items-center justify-center text-2xl font-black text-slate-300 xl:flex">
      →
    </div>
  );
}

function FlowFormula({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xs font-bold text-slate-700">
        {value}
      </div>
    </div>
  );
}

function AddBreederPlacementModal({
  saving,
  onClose,
  onSave,
}: {
  saving: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState({
    plan_name: "FY27 Breeder Placement",
    flock_code: "",
    farm_name: "",
    shed_code: "",
    placement_date: "",
    planned_females: 6000,
    planned_males: 600,
    transfer_age_weeks: 22,
    depletion_age_weeks: 64,
    expected_peak_hen_day: 82,
    expected_fertility_pct: 88,
    expected_hatchability_pct: 82,
    notes: "",
  });

  function updateField(field: string, value: string | number) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSave({
      ...form,
      planned_females: Number(form.planned_females),
      planned_males: Number(form.planned_males),
      transfer_age_weeks: Number(form.transfer_age_weeks),
      depletion_age_weeks: Number(form.depletion_age_weeks),
      expected_peak_hen_day: Number(form.expected_peak_hen_day),
      expected_fertility_pct: Number(form.expected_fertility_pct),
      expected_hatchability_pct: Number(form.expected_hatchability_pct),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-ovicore-green">
              Bird movement planner
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.06em]">
              Add breeder placement
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a planned breeder flock movement and update the visual planner.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-200"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <TextInput
              label="Plan name"
              value={form.plan_name}
              onChange={(value) => updateField("plan_name", value)}
              required
              span="md:col-span-2"
            />

            <TextInput
              label="Flock code"
              value={form.flock_code}
              onChange={(value) => updateField("flock_code", value)}
              required
            />

            <TextInput
              label="Placement date"
              type="date"
              value={form.placement_date}
              onChange={(value) => updateField("placement_date", value)}
              required
            />

            <TextInput
              label="Farm"
              value={form.farm_name}
              onChange={(value) => updateField("farm_name", value)}
              required
              span="md:col-span-2"
            />

            <TextInput
              label="Shed"
              value={form.shed_code}
              onChange={(value) => updateField("shed_code", value)}
              required
              span="md:col-span-2"
            />

            <NumberInput
              label="Females placed"
              value={form.planned_females}
              onChange={(value) => updateField("planned_females", value)}
              min={0}
            />

            <NumberInput
              label="Males placed"
              value={form.planned_males}
              onChange={(value) => updateField("planned_males", value)}
              min={0}
            />

            <NumberInput
              label="Transfer age"
              value={form.transfer_age_weeks}
              onChange={(value) => updateField("transfer_age_weeks", value)}
              min={0}
              suffix="weeks"
            />

            <NumberInput
              label="Depletion age"
              value={form.depletion_age_weeks}
              onChange={(value) => updateField("depletion_age_weeks", value)}
              min={0}
              suffix="weeks"
            />

            <NumberInput
              label="Peak HD"
              value={form.expected_peak_hen_day}
              onChange={(value) => updateField("expected_peak_hen_day", value)}
              min={0}
              max={100}
              suffix="%"
            />

            <NumberInput
              label="Fertility"
              value={form.expected_fertility_pct}
              onChange={(value) => updateField("expected_fertility_pct", value)}
              min={0}
              max={100}
              suffix="%"
            />

            <NumberInput
              label="Hatchability"
              value={form.expected_hatchability_pct}
              onChange={(value) => updateField("expected_hatchability_pct", value)}
              min={0}
              max={100}
              suffix="%"
            />

            <div className="md:col-span-4">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-ovicore-green focus:ring-4 focus:ring-emerald-100"
                placeholder="Optional planning notes..."
              />
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-ovicore-mint p-5">
            <div className="grid gap-3 md:grid-cols-4">
              <PreviewMetric
                label="Male %"
                value={
                  form.planned_females > 0
                    ? `${((form.planned_males / form.planned_females) * 100).toFixed(1)}%`
                    : "0.0%"
                }
              />
              <PreviewMetric
                label="Peak eggs/week"
                value={Math.round(
                  form.planned_females * (form.expected_peak_hen_day / 100) * 7
                ).toLocaleString()}
              />
              <PreviewMetric
                label="Settable estimate"
                value={Math.round(
                  form.planned_females *
                    (form.expected_peak_hen_day / 100) *
                    7 *
                    0.92
                ).toLocaleString()}
              />
              <PreviewMetric
                label="Chick estimate"
                value={Math.round(
                  form.planned_females *
                    (form.expected_peak_hen_day / 100) *
                    7 *
                    0.92 *
                    (form.expected_fertility_pct / 100) *
                    (form.expected_hatchability_pct / 100)
                ).toLocaleString()}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-ovicore-emerald px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save placement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required,
  span,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  span?: string;
}) {
  return (
    <div className={span}>
      <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-ovicore-green focus:ring-4 focus:ring-emerald-100"
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>
      <div className="flex overflow-hidden rounded-2xl border border-slate-300 bg-white focus-within:border-ovicore-green focus-within:ring-4 focus-within:ring-emerald-100">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 px-4 py-3 text-center text-sm font-bold outline-none"
        />
        {suffix && (
          <div className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-xs font-black uppercase text-slate-500">
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-black tracking-[-0.04em] text-ovicore-emerald">
        {value}
      </div>
    </div>
  );
}

function AdvancedAssumptionsDropdown({
  open,
  setOpen,
  settableEggPct,
  setSettableEggPct,
  broilerDemandAdjustmentPct,
  setBroilerDemandAdjustmentPct,
  fertilityStressPct,
  setFertilityStressPct,
  hatchabilityStressPct,
  setHatchabilityStressPct,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  settableEggPct: number;
  setSettableEggPct: (value: number) => void;
  broilerDemandAdjustmentPct: number;
  setBroilerDemandAdjustmentPct: (value: number) => void;
  fertilityStressPct: number;
  setFertilityStressPct: (value: number) => void;
  hatchabilityStressPct: number;
  setHatchabilityStressPct: (value: number) => void;
}) {
	return (
		<div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
			>
				<div className="min-w-0">
					<div className="text-xs font-black uppercase tracking-[0.16em] text-ovicore-green">
						Advanced assumptions
					</div>
					<div className="mt-1 truncate text-sm font-bold text-slate-500">
						Settable eggs {settableEggPct}% · Broiler demand {broilerDemandAdjustmentPct}% · Fertility loss {fertilityStressPct}% · Hatchability loss {hatchabilityStressPct}%
					</div>
				</div>

				<div className="shrink-0 rounded-full bg-ovicore-mint px-4 py-2 text-sm font-black text-ovicore-emerald">
					{open ? "Hide ▲" : "Show ▼"}
				</div>
			</button>

			{open && (
				<div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
					<div className="mb-4 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-600">
						Use these controls to test “what-if” conditions. They do not change the saved flock plan.
						They only show how breeder output, hatch eggs, chicks available and broiler placement cover would move if assumptions change.
					</div>

					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						<AssumptionControlCard
							title="Settable eggs from total eggs"
							description="Higher value means more laid eggs are suitable for setting at the hatchery. This increases hatch eggs and chicks available."
						>
							<SliderControl
								label="Settable egg %"
								value={settableEggPct}
								min={80}
								max={98}
								suffix="%"
								onChange={setSettableEggPct}
							/>
						</AssumptionControlCard>

						<AssumptionControlCard
							title="Broiler placement demand change"
							description="Tests what happens if broiler farms need more or fewer chicks than the current plan."
						>
							<SliderControl
								label="Demand change"
								value={broilerDemandAdjustmentPct}
								min={-20}
								max={20}
								suffix="%"
								onChange={setBroilerDemandAdjustmentPct}
							/>
						</AssumptionControlCard>

						<AssumptionControlCard
							title="Fertility loss"
							description="Reduces the fertile egg percentage. More fertility loss means fewer fertile eggs and fewer chicks."
						>
							<SliderControl
								label="Fertility loss"
								value={fertilityStressPct}
								min={0}
								max={10}
								suffix="%"
								onChange={setFertilityStressPct}
							/>
						</AssumptionControlCard>

						<AssumptionControlCard
							title="Hatchability loss"
							description="Reduces the hatch of fertile eggs. More hatchability loss means fewer day-old chicks."
						>
							<SliderControl
								label="Hatchability loss"
								value={hatchabilityStressPct}
								min={0}
								max={10}
								suffix="%"
								onChange={setHatchabilityStressPct}
							/>
						</AssumptionControlCard>
					</div>
				</div>
			)}
		</div>
	);
}

function AssumptionControlCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-black tracking-[-0.03em] text-slate-900">
        {title}
      </div>
      <p className="mt-1 min-h-[48px] text-xs font-semibold leading-relaxed text-slate-500">
        {description}
      </p>

      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          {label}
        </label>
        <span className="rounded-full bg-ovicore-mint px-3 py-1 text-xs font-black text-ovicore-emerald">
          {value}
          {suffix}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-ovicore-green"
      />
    </div>
  );
}

function SupplyDemandBoard({
  weeklySupplyDemand,
}: {
  weeklySupplyDemand: WeeklySupplyDemand[];
}) {
  const activeWeeks = weeklySupplyDemand.filter(
    (week) => week.chicksAvailable > 0 || week.broilerDemand > 0
  );

	return (
		<div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
			<div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
				<div>
					<h3 className="text-xl font-black tracking-[-0.04em]">
						Weekly placement cover
					</h3>
					<p className="text-sm text-slate-500">
						Shows whether projected chick supply covers planned broiler placement requirements.
					</p>
				</div>

				<div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
					<Legend colour="bg-green-500" label="Covered" />
					<Legend colour="bg-orange-500" label="Tight" />
					<Legend colour="bg-red-500" label="Short" />
				</div>
			</div>

			<div className="overflow-auto">
				<table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0 text-[12.5px]">
          <thead>
            <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
              <th className="border-b border-r border-slate-300 px-3 py-3 text-center">
                Week
              </th>
              <th className="border-b border-r border-slate-300 px-3 py-3 text-center">
                Date
              </th>
              <th className="border-b border-r border-slate-300 px-3 py-3 text-center">
                Chicks available
              </th>
              <th className="border-b border-r border-slate-300 px-3 py-3 text-center">
                Broiler demand
              </th>
              <th className="border-b border-r border-slate-300 px-3 py-3 text-center">
                Gap
              </th>
              <th className="border-b border-r border-slate-300 px-3 py-3 text-center">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {activeWeeks.map((week) => (
              <tr key={week.weekIndex} className="hover:[&>td]:bg-emerald-50/40">
                <td className="border-b border-r border-slate-300 px-3 py-4 text-center font-bold">
                  {week.weekLabel}
                </td>
                <td className="border-b border-r border-slate-300 px-3 py-4 text-center font-bold">
                  {week.dateLabel}
                </td>
                <td className="border-b border-r border-slate-300 bg-slate-50 px-3 py-4 text-center font-black">
                  {week.chicksAvailable.toLocaleString()}
                </td>
                <td className="border-b border-r border-slate-300 bg-slate-50 px-3 py-4 text-center font-black">
                  {week.broilerDemand.toLocaleString()}
                </td>
                <td
                  className={`border-b border-r border-slate-300 px-3 py-4 text-center font-black ${
                    week.gap < 0
                      ? "bg-red-50 text-red-700"
                      : week.status === "tight"
                        ? "bg-orange-50 text-orange-700"
                        : "bg-green-50 text-green-700"
                  }`}
                >
                  {week.gap > 0 ? "+" : ""}
                  {week.gap.toLocaleString()}
                </td>
                <td className="border-b border-r border-slate-300 px-3 py-4 text-center">
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-black uppercase ${
                      week.status === "short"
                        ? "bg-red-100 text-red-700"
                        : week.status === "tight"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {week.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SelectedPlanPanel({
  plan,
  conflicts,
}: {
  plan?: Plan;
  conflicts: ShedConflict[];
}) {
  if (!plan) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-black">No flock selected</h3>
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-ovicore-green">
        Selected movement
      </p>
      <h3 className="mt-1 text-2xl font-black tracking-[-0.06em]">
        {plan.flock_code}
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <PanelMetric label="Farm" value={plan.farm_name} />
        <PanelMetric label="Shed" value={plan.shed_code} />
        <PanelMetric label="Placement" value={formatShortDate(new Date(plan.placement_date))} />
        <PanelMetric label="Male %" value={`${plan.male_percent.toFixed(1)}%`} />
        <PanelMetric label="Females" value={plan.planned_females.toLocaleString()} />
        <PanelMetric label="Males" value={plan.planned_males.toLocaleString()} />
        <PanelMetric label="Fertility" value={`${plan.expected_fertility_pct.toFixed(1)}%`} />
        <PanelMetric label="Hatchability" value={`${plan.expected_hatchability_pct.toFixed(1)}%`} />
      </div>

      <div className="mt-4 rounded-2xl bg-ovicore-mint p-4">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
          Projected chick output W30
        </div>
        <div className="mt-1 text-3xl font-black tracking-[-0.06em] text-ovicore-emerald">
          {plan.projected_chicks_week_30.toLocaleString()}
        </div>
      </div>

			{conflicts.length > 0 && (
				<div className="mt-4 rounded-2xl bg-red-50 p-4 text-red-800">
					<div className="text-xs font-black uppercase tracking-[0.14em]">
						Shed conflict
					</div>
					<div className="mt-2 space-y-1">
						{conflicts.map((conflict) => (
							<div key={`${conflict.planId}-${conflict.conflictingPlanId}`} className="text-sm font-bold">
								{conflict.message}
							</div>
						))}
					</div>
				</div>
			)}

			<div
				className={`mt-4 rounded-2xl p-4 ${
					plan.planning_flag === "Within planning range"
						? "bg-green-50 text-green-800"
						: "bg-orange-50 text-orange-800"
				}`}
			>
				<div className="text-xs font-black uppercase tracking-[0.14em]">
					Planning flag
				</div>
				<div className="mt-1 text-sm font-bold">{plan.planning_flag}</div>
			</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white bg-white px-3 py-3 text-center shadow-sm">
      <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-black tracking-[-0.05em]">{value}</div>
    </div>
  );
}

function PanelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}

function Signal({
  status,
  title,
  text,
}: {
  status: "good" | "review" | "info";
  title: string;
  text: string;
}) {
  const colours = {
    good: "bg-green-100 text-green-700",
    review: "bg-orange-100 text-orange-700",
    info: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full ${colours[status]}`} />
        <div className="font-black">{title}</div>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${colour}`} />
      <span>{label}</span>
    </div>
  );
}

function getWeeklyOutputCurve({
  plan,
  timelineStart,
  weeksCount,
  settableEggPct,
  fertilityStressPct,
  hatchabilityStressPct,
}: {
  plan: Plan;
  timelineStart: Date;
  weeksCount: number;
  settableEggPct: number;
  fertilityStressPct: number;
  hatchabilityStressPct: number;
}): WeeklyOutputPoint[] {
  const placementDate = new Date(plan.placement_date);

  return Array.from({ length: weeksCount }, (_, weekIndex) => {
    const weekStart = addDays(timelineStart, weekIndex * 7);

    const flockAgeWeeks = Math.floor(
      (weekStart.getTime() - placementDate.getTime()) / WEEK_MS
    );

    if (
      flockAgeWeeks < plan.transfer_age_weeks ||
      flockAgeWeeks > plan.depletion_age_weeks
    ) {
      return {
        weekIndex,
        hatchEggs: 0,
        chicks: 0,
      };
    }

    const henDayPct = getBreederHenDayCurve(
      flockAgeWeeks,
      plan.expected_peak_hen_day
    );

		const weeklyEggs = plan.planned_females * (henDayPct / 100) * 7;

		const hatchEggs = weeklyEggs * (settableEggPct / 100);

		const adjustedFertilityPct = Math.max(
			0,
			plan.expected_fertility_pct - fertilityStressPct
		);

		const adjustedHatchabilityPct = Math.max(
			0,
			plan.expected_hatchability_pct - hatchabilityStressPct
		);

		const chicks =
			hatchEggs *
			(adjustedFertilityPct / 100) *
			(adjustedHatchabilityPct / 100);

    return {
      weekIndex,
      hatchEggs: Math.round(hatchEggs),
      chicks: Math.round(chicks),
    };
  });
}

function getBarPosition(startDate: Date, segmentStart: Date, segmentEnd: Date) {
  const rawStart = Math.floor((segmentStart.getTime() - startDate.getTime()) / WEEK_MS);
  const rawEnd = Math.ceil((segmentEnd.getTime() - startDate.getTime()) / WEEK_MS);

  const start = clamp(rawStart, 0, TIMELINE_WEEKS - 1);
  const end = clamp(rawEnd, 0, TIMELINE_WEEKS);

  return {
    start,
    span: Math.max(0, end - start),
  };
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + diff);

  return copy;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
  });
}

function formatWeekLabel(date: Date) {
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
  });
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getBreederHenDayCurve(ageWeeks: number, peakHenDayPct: number) {
  if (ageWeeks < 22) return 0;

  if (ageWeeks < 26) {
    return peakHenDayPct * 0.45;
  }

  if (ageWeeks < 30) {
    return peakHenDayPct * 0.75;
  }

  if (ageWeeks <= 42) {
    return peakHenDayPct;
  }

  if (ageWeeks <= 52) {
    return peakHenDayPct * 0.9;
  }

  if (ageWeeks <= 60) {
    return peakHenDayPct * 0.78;
  }

  return peakHenDayPct * 0.65;
}