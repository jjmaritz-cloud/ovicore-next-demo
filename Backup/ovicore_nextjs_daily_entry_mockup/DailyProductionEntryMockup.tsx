'use client';

import React, { useMemo, useState } from 'react';

type RowStatus = 'saved' | 'review' | 'missing';

type ProductionRow = {
  shed: string;
  flock: string;
  age: number;
  opening: number;
  mort: number | null;
  transfers: number;
  feed: number | null;
  eggs: number | null;
  rejects: number | null;
  notes: string;
  status: RowStatus;
};

const initialRows: ProductionRow[] = [
  { shed: 'Shed 1', flock: 'L2401', age: 42.3, opening: 38420, mort: 12, transfers: 0, feed: 4820, eggs: 35910, rejects: 420, notes: 'Normal', status: 'saved' },
  { shed: 'Shed 2', flock: 'L2402', age: 39.1, opening: 39100, mort: 8, transfers: 0, feed: 6900, eggs: 28100, rejects: 390, notes: 'Feed intake high', status: 'review' },
  { shed: 'Shed 3', flock: 'L2403', age: 31.4, opening: 40000, mort: null, transfers: 0, feed: null, eggs: null, rejects: null, notes: '', status: 'missing' },
  { shed: 'Shed 4', flock: 'L2404', age: 57.8, opening: 37250, mort: 22, transfers: 0, feed: 4675, eggs: 33120, rejects: 690, notes: 'Watch rejects', status: 'review' },
  { shed: 'Shed 5', flock: 'L2405', age: 28.2, opening: 40500, mort: 5, transfers: 0, feed: 4210, eggs: 32280, rejects: 270, notes: '', status: 'saved' },
];

function closingBirds(row: ProductionRow) {
  if (row.mort === null) return null;
  return row.opening - row.mort + row.transfers;
}

function henDay(row: ProductionRow) {
  const closing = closingBirds(row);
  if (!closing || !row.eggs) return null;
  return (row.eggs / closing) * 100;
}

function fcrPerDozen(row: ProductionRow) {
  if (!row.feed || !row.eggs) return null;
  return row.feed / (row.eggs / 12);
}

function calculatedStatus(row: ProductionRow): RowStatus {
  if (row.mort === null || row.feed === null || row.eggs === null || row.rejects === null) return 'missing';

  const hd = henDay(row);
  const fcr = fcrPerDozen(row);

  if ((hd !== null && (hd < 82 || hd > 96)) || (fcr !== null && fcr > 1.85) || row.rejects > 600) {
    return 'review';
  }

  return 'saved';
}

function numberOrBlank(value: number | null) {
  return value === null ? '' : value;
}

function statusLabel(status: RowStatus) {
  if (status === 'saved') return 'Saved';
  if (status === 'review') return 'Review suggested';
  return 'Missing';
}

export default function DailyProductionEntryMockup() {
  const [rows, setRows] = useState<ProductionRow[]>(initialRows);

  const totals = useMemo(() => {
    const statuses = rows.map(calculatedStatus);
    const completed = statuses.filter((s) => s !== 'missing').length;
    const review = statuses.filter((s) => s === 'review').length;
    const eggs = rows.reduce((sum, row) => sum + (row.eggs ?? 0), 0);
    const henDays = rows.map(henDay).filter((v): v is number => v !== null);
    const avgHenDay = henDays.length ? henDays.reduce((a, b) => a + b, 0) / henDays.length : 0;

    return { completed, review, eggs, avgHenDay };
  }, [rows]);

  function updateRow(index: number, key: keyof ProductionRow, value: string) {
    setRows((current) =>
      current.map((row, i) => {
        if (i !== index) return row;

        if (key === 'notes') {
          return { ...row, notes: value };
        }

        return {
          ...row,
          [key]: value === '' ? null : Number(value),
        };
      }),
    );
  }

  function copyYesterday() {
    setRows((current) =>
      current.map((row) => {
        const feed = row.feed ?? Math.round(row.opening * 0.115);
        const eggs = row.eggs ?? Math.round(row.opening * 0.82);

        return {
          ...row,
          mort: row.mort ?? 0,
          feed,
          eggs,
          rejects: row.rejects ?? Math.round(eggs * 0.012),
        };
      }),
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mb-6 rounded-3xl bg-emerald-950 p-6 text-white shadow-xl">
        <p className="text-sm text-emerald-100">OviCore / Production / Daily Production Entry</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Daily Production Entry</h1>
            <p className="mt-2 max-w-3xl text-emerald-100">
              Opening birds flow from yesterday, closing birds calculate live, and rows are flagged as saved,
              missing, or review suggested.
            </p>
          </div>
          <button
            onClick={copyYesterday}
            className="rounded-xl bg-white px-4 py-2 font-bold text-emerald-950 shadow"
          >
            Copy yesterday
          </button>
        </div>
      </div>

      <section className="mb-5 grid gap-4 md:grid-cols-4">
        <Kpi title="Entry progress" value={`${totals.completed} / ${rows.length}`} />
        <Kpi title="Total eggs" value={totals.eggs.toLocaleString()} />
        <Kpi title="Avg hen day" value={`${totals.avgHenDay.toFixed(1)}%`} />
        <Kpi title="Review suggested" value={String(totals.review)} />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="text-lg font-bold">Beresfield Farm 1 — active sheds</h2>
            <p className="text-sm text-slate-500">Next.js style editable grid with live calculated fields.</p>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-[1350px] border-separate border-spacing-0 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 border-b bg-slate-50 p-3">Shed / Flock</th>
                <th className="border-b p-3">Age</th>
                <th className="border-b p-3">Opening</th>
                <th className="border-b p-3">Mortality</th>
                <th className="border-b p-3">Transfers</th>
                <th className="border-b p-3">Closing</th>
                <th className="border-b p-3">Feed kg</th>
                <th className="border-b p-3">Eggs</th>
                <th className="border-b p-3">Rejects</th>
                <th className="border-b p-3">Hen day</th>
                <th className="border-b p-3">FCR / dozen</th>
                <th className="border-b p-3">Notes</th>
                <th className="border-b p-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => {
                const status = calculatedStatus(row);
                const closing = closingBirds(row);
                const hd = henDay(row);
                const fcr = fcrPerDozen(row);

                return (
                  <tr key={row.shed} className="hover:bg-emerald-50/30">
                    <td className="sticky left-0 border-b bg-white p-3 font-bold shadow-[8px_0_16px_rgba(15,23,42,0.04)]">
                      {row.shed}
                      <div className="text-xs font-medium text-slate-500">{row.flock}</div>
                    </td>
                    <td className="border-b p-3 font-semibold">{row.age.toFixed(1)}</td>
                    <td className="border-b p-3 text-right font-semibold">{row.opening.toLocaleString()}</td>
                    <EditableNumber value={numberOrBlank(row.mort)} onChange={(v) => updateRow(index, 'mort', v)} />
                    <EditableNumber value={numberOrBlank(row.transfers)} onChange={(v) => updateRow(index, 'transfers', v)} />
                    <td className="border-b p-3 text-right font-bold">{closing?.toLocaleString() ?? '—'}</td>
                    <EditableNumber value={numberOrBlank(row.feed)} onChange={(v) => updateRow(index, 'feed', v)} />
                    <EditableNumber value={numberOrBlank(row.eggs)} onChange={(v) => updateRow(index, 'eggs', v)} />
                    <EditableNumber value={numberOrBlank(row.rejects)} onChange={(v) => updateRow(index, 'rejects', v)} />
                    <td className="border-b p-3 text-right font-bold">{hd ? `${hd.toFixed(1)}%` : '—'}</td>
                    <td className="border-b p-3 text-right font-bold">{fcr ? fcr.toFixed(2) : '—'}</td>
                    <td className="border-b p-3">
                      <input
                        className="w-44 rounded-xl border border-slate-300 px-3 py-2"
                        value={row.notes}
                        onChange={(e) => updateRow(index, 'notes', e.target.value)}
                      />
                    </td>
                    <td className="border-b p-3">
                      <span className={statusClassName(status)}>{statusLabel(status)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function EditableNumber({ value, onChange }: { value: number | ''; onChange: (value: string) => void }) {
  return (
    <td className="border-b p-3">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-right font-semibold outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
      />
    </td>
  );
}

function statusClassName(status: RowStatus) {
  const base = 'inline-flex rounded-full border px-3 py-1 text-xs font-bold';

  if (status === 'saved') {
    return `${base} border-green-300 bg-green-50 text-green-700`;
  }

  if (status === 'review') {
    return `${base} border-orange-300 bg-orange-50 text-orange-700`;
  }

  return `${base} border-red-300 bg-red-50 text-red-700`;
}
