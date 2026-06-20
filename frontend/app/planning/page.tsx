"use client";

import { useEffect, useMemo, useState } from "react";
import { getBreederFlockPlans, getPlanningSummary } from "@/lib/api";

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

type Summary = {
  active_plans: number;
  planned_females: number;
  planned_males: number;
  projected_hatch_eggs_week_30: number;
  projected_chicks_week_30: number;
  review_items: number;
};

export default function PlanningPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedRow, setSelectedRow] = useState<number>(2);

  useEffect(() => {
    Promise.all([getBreederFlockPlans(), getPlanningSummary()]).then(
      ([plansData, summaryData]) => {
        setPlans(plansData);
        setSummary(summaryData);
      }
    );
  }, []);

  const hatchEggs = useMemo(
    () =>
      plans.reduce((total, plan) => total + plan.projected_hatch_eggs_week_30, 0),
    [plans]
  );

  const chicks = useMemo(
    () => plans.reduce((total, plan) => total + plan.projected_chicks_week_30, 0),
    [plans]
  );

  return (
    <main className="min-h-screen p-5">
      <div className="grid min-h-[calc(100vh-40px)] grid-cols-[86px_minmax(0,1fr)] overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <aside className="bg-ovicore-emerald p-4 text-white">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-yellow-400 text-2xl font-black text-emerald-950">
            O
          </div>
          <div className="space-y-3">
            {["⌂", "↗", "▦", "◇", "⌁", "⚙"].map((icon, i) => (
              <div
                key={icon}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${
                  i === 1 ? "bg-white/15 shadow-inner" : "text-white/60"
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
                Planning
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.06em]">
                Breeder flock planning
              </h1>
            </div>
            <div className="flex gap-2">
			  <a
			    href="/planning/movement"
			    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-ovicore-emerald"
			  >
			    Visual planner
			  </a>
              <button className="rounded-2xl bg-ovicore-emerald px-4 py-2 text-sm font-black text-white">
                Add flock plan
              </button>
            </div>
          </header>

          <div className="p-5">
            <section className="mb-5 rounded-[2rem] bg-gradient-to-br from-ovicore-emerald to-emerald-800 p-6 text-white shadow-xl">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100">
                Breeders → Hatchery → Broilers
              </p>
              <h2 className="mt-2 max-w-4xl text-4xl font-black tracking-[-0.07em]">
                Plan breeder placements, forecast hatch eggs, and expose chick
                availability before broiler demand catches you.
              </h2>
              <p className="mt-3 max-w-3xl text-emerald-100">
                This screen is the backbone. Once the flock plan is right,
                daily breeder entry, hatchery setting plans, and broiler
                placements flow from the same data.
              </p>
            </section>

            <section className="mb-5 grid gap-3 md:grid-cols-6">
              <Kpi label="Active plans" value={String(summary?.active_plans ?? plans.length)} />
              <Kpi label="Females" value={(summary?.planned_females ?? 0).toLocaleString()} />
              <Kpi label="Males" value={(summary?.planned_males ?? 0).toLocaleString()} />
              <Kpi label="Hatch eggs" value={(summary?.projected_hatch_eggs_week_30 ?? hatchEggs).toLocaleString()} />
              <Kpi label="Chicks" value={(summary?.projected_chicks_week_30 ?? chicks).toLocaleString()} />
              <Kpi label="Review" value={String(summary?.review_items ?? 0)} />
            </section>

            <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <h3 className="text-xl font-black tracking-[-0.04em]">
                    Flock planning table
                  </h3>
                  <p className="text-sm text-slate-500">
                    Excel-like planning grid designed for breeder placements first.
                  </p>
                </div>
                <div className="text-sm font-bold text-slate-500">
                  Formula: chicks = hatch eggs × fertility × hatchability
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full table-fixed border-separate border-spacing-0 text-[12.5px]">
				  <colgroup>
					<col style={{ width: "220px" }} />
					<col style={{ width: "100px" }} />
					<col style={{ width: "150px" }} />
					<col style={{ width: "130px" }} />
					<col style={{ width: "130px" }} />
					<col style={{ width: "105px" }} />
					<col style={{ width: "105px" }} />
					<col style={{ width: "105px" }} />
					<col style={{ width: "120px" }} />
					<col style={{ width: "105px" }} />
					<col style={{ width: "115px" }} />
					<col style={{ width: "130px" }} />
					<col style={{ width: "115px" }} />
					<col style={{ width: "190px" }} />
					<col style={{ width: "120px" }} />
					<col style={{ width: "190px" }} />
				  </colgroup>
                  <thead>
					<tr className="bg-slate-200 text-xs uppercase tracking-wider text-slate-700">
					  <GroupHeader colSpan={4}>Flock identity</GroupHeader>
					  <GroupHeader colSpan={5}>Placement plan</GroupHeader>
					  <GroupHeader colSpan={4}>Hatchery forecast</GroupHeader>
					  <GroupHeader colSpan={3}>Workflow</GroupHeader>
					</tr>
                    <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
						<Column>Plan</Column>
						<Column>Flock</Column>
						<Column>Farm</Column>
						<Column>Shed</Column>
                      {[
                        "Placement date",
                        "Females",
                        "Males",
                        "Male %",
                        "Depletion age",
                        "Peak HD %",
                        "Fertility %",
                        "Hatchability %",
                        "Chicks W30",
                        "Planning flag",
                        "Status",
                        "Notes",
                      ].map((col) => (
                        <Column key={col}>{col}</Column>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan, index) => (
                      <tr
                        key={plan.id}
                        onClick={() => setSelectedRow(index)}
						className={
						  index === selectedRow
							? "[&>td]:bg-emerald-50"
							: "hover:[&>td]:bg-emerald-50/40"
						}
                      >
						<Cell>{plan.plan_name}</Cell>
						<Cell>{plan.flock_code}</Cell>
						<Cell>{plan.farm_name}</Cell>
						<Cell>{plan.shed_code}</Cell>
                        <Cell>{formatDate(plan.placement_date)}</Cell>
                        <NumberCell>{plan.planned_females.toLocaleString()}</NumberCell>
                        <NumberCell>{plan.planned_males.toLocaleString()}</NumberCell>
                        <NumberCell warn={plan.male_percent < 9.5}>
                          {plan.male_percent.toFixed(1)}%
                        </NumberCell>
                        <NumberCell warn={plan.depletion_age_weeks > 64}>
                          {plan.depletion_age_weeks.toFixed(1)}
                        </NumberCell>
                        <NumberCell>{plan.expected_peak_hen_day.toFixed(1)}%</NumberCell>
                        <NumberCell warn={plan.expected_fertility_pct < 87}>
                          {plan.expected_fertility_pct.toFixed(1)}%
                        </NumberCell>
                        <NumberCell>{plan.expected_hatchability_pct.toFixed(1)}%</NumberCell>
                        <NumberCell>
                          {plan.projected_chicks_week_30.toLocaleString()}
                        </NumberCell>
                        <Cell warn={plan.planning_flag !== "Within planning range"}>
                          {plan.planning_flag}
                        </Cell>
                        <Cell>
                          <span
						    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-black uppercase ${
                              plan.status === "review"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {plan.status}
                          </span>
                        </Cell>
                        <Cell>{plan.notes ?? ""}</Cell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white bg-white p-4 shadow">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tracking-[-0.05em]">{value}</div>
    </div>
  );
}

function GroupHeader({
  children,
  colSpan,
}: {
  children: React.ReactNode;
  colSpan: number;
}) {
  return (
    <th
      colSpan={colSpan}
      className="sticky top-0 z-20 border-b border-r border-slate-300 bg-slate-200 px-3 py-2 text-center align-middle"
    >
      {children}
    </th>
  );
}

function Column({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-r border-slate-300 bg-slate-50 px-3 py-3 text-center align-middle">
      {children}
    </th>
  );
}

function Cell({
  children,
  warn,
}: {
  children: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <td
      className={`border-b border-r border-slate-300 px-3 py-4 text-center align-middle font-bold ${
        warn ? "bg-orange-50 text-orange-800" : "bg-white"
      }`}
    >
      {children}
    </td>
  );
}

function NumberCell({
  children,
  warn,
}: {
  children: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <td
      className={`border-b border-r border-slate-300 px-3 py-4 text-center align-middle font-bold ${
        warn ? "bg-orange-50 text-orange-800" : "bg-slate-50"
      }`}
    >
      {children}
    </td>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
