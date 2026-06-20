'use client';

import React, { useMemo, useState } from 'react';

type Row = {
  farm: string;
  shed: string;
  flock: string;
  age: number;
  opening: number;
  mort: number | null;
  transfers: number;
  feed: number | null;
  eggs: number | null;
  rejects: number | null;
  seconds: number | null;
  notes: string;
  last: string;
};

const initialRows: Row[] = [
  { farm: 'Ber Farm 1', shed: 'Shed 01', flock: 'L2401', age: 42.3, opening: 38420, mort: 12, transfers: 0, feed: 4820, eggs: 35910, rejects: 420, seconds: 160, notes: 'Normal production', last: '08:42' },
  { farm: 'Ber Farm 1', shed: 'Shed 02', flock: 'L2402', age: 39.1, opening: 39100, mort: 8, transfers: 0, feed: 6900, eggs: 28100, rejects: 390, seconds: 110, notes: 'Feed intake high', last: '08:43' },
  { farm: 'Ber Farm 1', shed: 'Shed 03', flock: 'L2403', age: 31.4, opening: 40000, mort: null, transfers: 0, feed: null, eggs: null, rejects: null, seconds: null, notes: '', last: '—' },
  { farm: 'Ber Farm 1', shed: 'Shed 04', flock: 'L2404', age: 57.8, opening: 37250, mort: 22, transfers: 0, feed: 4675, eggs: 33120, rejects: 690, seconds: 180, notes: 'Rejects above normal', last: '08:50' },
  { farm: 'Ber Farm 1', shed: 'Shed 05', flock: 'L2405', age: 28.2, opening: 40500, mort: 5, transfers: 0, feed: 4210, eggs: 32280, rejects: 270, seconds: 95, notes: '', last: '08:51' },
  { farm: 'Ber Farm 1', shed: 'Shed 06', flock: 'L2406', age: 64.5, opening: 35900, mort: 18, transfers: 0, feed: 4480, eggs: 30140, rejects: 520, seconds: 210, notes: 'Older flock', last: '08:52' },
];

function closing(row: Row) {
  return row.mort === null ? null : row.opening - row.mort + row.transfers;
}

function henDay(row: Row) {
  const c = closing(row);
  return !c || !row.eggs ? null : (row.eggs / c) * 100;
}

function fcr(row: Row) {
  return !row.feed || !row.eggs ? null : row.feed / (row.eggs / 12);
}

function status(row: Row) {
  if (row.mort === null || row.feed === null || row.eggs === null || row.rejects === null) return 'missing';
  const hd = henDay(row);
  const fr = fcr(row);
  if ((hd !== null && (hd < 78 || hd > 96)) || (fr !== null && fr > 1.85) || row.rejects > 650 || row.feed > 6200) return 'review';
  return 'saved';
}

function flag(row: Row) {
  if (status(row) === 'missing') return 'Data required';
  const messages: string[] = [];
  const hd = henDay(row);
  const fr = fcr(row);

  if (hd !== null && hd < 78) messages.push('Hen day low');
  if (hd !== null && hd > 96) messages.push('Hen day high');
  if (fr !== null && fr > 1.85) messages.push('FCR high');
  if (row.feed && row.feed > 6200) messages.push('Feed high');
  if (row.rejects && row.rejects > 650) messages.push('Rejects high');

  return messages.length ? messages.join(', ') : 'Within range';
}

export default function OviCoreExcelDailyEntry() {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [filter, setFilter] = useState<'all' | 'saved' | 'review' | 'missing'>('all');

  const visibleRows = rows.filter((row) => filter === 'all' || status(row) === filter);

  const metrics = useMemo(() => {
    const statuses = rows.map(status);
    const completed = statuses.filter((s) => s !== 'missing').length;
    const review = statuses.filter((s) => s === 'review').length;
    const missing = statuses.filter((s) => s === 'missing').length;
    const eggs = rows.reduce((sum, row) => sum + (row.eggs ?? 0), 0);
    const henDays = rows.map(henDay).filter((v): v is number => v !== null);
    const fcrs = rows.map(fcr).filter((v): v is number => v !== null);

    return {
      completed,
      review,
      missing,
      eggs,
      henDay: henDays.length ? henDays.reduce((a, b) => a + b, 0) / henDays.length : null,
      fcr: fcrs.length ? fcrs.reduce((a, b) => a + b, 0) / fcrs.length : null,
    };
  }, [rows]);

  function update(index: number, key: keyof Row, value: string) {
    const originalIndex = rows.findIndex((r) => r.shed === visibleRows[index].shed);

    setRows((current) =>
      current.map((row, i) => {
        if (i !== originalIndex) return row;
        if (key === 'notes') return { ...row, notes: value };

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
        const feed = row.feed ?? Math.round(row.opening * 0.112);
        const eggs = row.eggs ?? Math.round(row.opening * 0.82);
        return {
          ...row,
          mort: row.mort ?? 0,
          feed,
          eggs,
          rejects: row.rejects ?? Math.round(eggs * 0.012),
          seconds: row.seconds ?? 0,
          last: 'Draft',
        };
      }),
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-900">
      <section className="overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-emerald-950 px-5 py-4 text-white">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Daily Production Entry</h1>
            <p className="mt-1 text-sm text-emerald-100">
              Excel-style grid with frozen identifiers, grouped fields, live calculations and validation.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={copyYesterday} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold">
              Copy yesterday
            </button>
            <button onClick={() => setFilter('missing')} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold">
              Missing only
            </button>
            <button onClick={() => setFilter('review')} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold">
              Review only
            </button>
            <button className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-emerald-950">
              Save rows
            </button>
          </div>
        </div>

        <div className="grid gap-0 border-b border-slate-300 bg-white md:grid-cols-6">
          <Metric label="Progress" value={`${metrics.completed} / ${rows.length}`} />
          <Metric label="Total eggs" value={metrics.eggs.toLocaleString()} />
          <Metric label="Avg hen day" value={metrics.henDay ? `${metrics.henDay.toFixed(1)}%` : '—'} />
          <Metric label="Avg FCR/doz" value={metrics.fcr ? metrics.fcr.toFixed(2) : '—'} />
          <Metric label="Review" value={String(metrics.review)} />
          <Metric label="Missing" value={String(metrics.missing)} />
        </div>

        <div className="overflow-auto">
          <table className="w-[1720px] border-separate border-spacing-0 text-[12.5px]">
            <thead>
              <tr className="bg-slate-200 text-xs uppercase tracking-wider text-slate-700">
                <GroupHeader sticky colSpan={3}>Flock identity</GroupHeader>
                <GroupHeader colSpan={5}>Bird movement</GroupHeader>
                <GroupHeader colSpan={4}>Production</GroupHeader>
                <GroupHeader colSpan={4}>Calculated review</GroupHeader>
                <GroupHeader colSpan={3}>Workflow</GroupHeader>
              </tr>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <ColumnHeader sticky left="left-0">Farm</ColumnHeader>
                <ColumnHeader sticky left="left-[110px]">Shed</ColumnHeader>
                <ColumnHeader sticky left="left-[220px]">Flock</ColumnHeader>
                {['Age', 'Opening', 'Mort.', 'Transfers', 'Closing', 'Feed kg', 'Eggs', 'Rejects', 'Seconds', 'Hen day %', 'FCR/doz', 'Eggs/bird', 'Review flag', 'Status', 'Notes', 'Last saved'].map((col) => (
                  <ColumnHeader key={col}>{col}</ColumnHeader>
                ))}
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((row, index) => {
                const hd = henDay(row);
                const fr = fcr(row);
                const c = closing(row);
                const st = status(row);
                const eggsPerBird = c && row.eggs ? row.eggs / c : null;

                return (
                  <tr key={row.shed} className="hover:bg-emerald-50/40">
                    <FrozenCell left="left-0">{row.farm}</FrozenCell>
                    <FrozenCell left="left-[110px]">{row.shed}</FrozenCell>
                    <FrozenCell left="left-[220px]">{row.flock}</FrozenCell>
                    <CalcCell>{row.age.toFixed(1)}</CalcCell>
                    <CalcCell>{row.opening.toLocaleString()}</CalcCell>
                    <NumberCell value={row.mort} onChange={(v) => update(index, 'mort', v)} />
                    <NumberCell value={row.transfers} onChange={(v) => update(index, 'transfers', v)} />
                    <CalcCell>{c?.toLocaleString() ?? '—'}</CalcCell>
                    <NumberCell value={row.feed} onChange={(v) => update(index, 'feed', v)} warn={Boolean(row.feed && row.feed > 6200)} />
                    <NumberCell value={row.eggs} onChange={(v) => update(index, 'eggs', v)} />
                    <NumberCell value={row.rejects} onChange={(v) => update(index, 'rejects', v)} warn={Boolean(row.rejects && row.rejects > 650)} />
                    <NumberCell value={row.seconds} onChange={(v) => update(index, 'seconds', v)} />
                    <CalcCell warn={Boolean(hd && (hd < 78 || hd > 96))}>{hd ? `${hd.toFixed(1)}%` : '—'}</CalcCell>
                    <CalcCell warn={Boolean(fr && fr > 1.85)}>{fr ? fr.toFixed(2) : '—'}</CalcCell>
                    <CalcCell>{eggsPerBird ? eggsPerBird.toFixed(2) : '—'}</CalcCell>
                    <TextCell warn={st === 'review'}>{flag(row)}</TextCell>
                    <td className="border-b border-r border-slate-300 p-0"><StatusPill status={st} /></td>
                    <td className="border-b border-r border-slate-300 p-0">
                      <input
                        className="h-9 w-full bg-amber-50 px-2 text-left font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-700"
                        value={row.notes}
                        onChange={(e) => update(index, 'notes', e.target.value)}
                      />
                    </td>
                    <TextCell>{row.last}</TextCell>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-slate-300 px-4 py-3">
      <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function GroupHeader({ children, colSpan, sticky }: { children: React.ReactNode; colSpan: number; sticky?: boolean }) {
  return (
    <th colSpan={colSpan} className={`sticky top-0 z-20 border-b border-r border-slate-300 px-2 py-2 text-center ${sticky ? 'left-0' : ''}`}>
      {children}
    </th>
  );
}

function ColumnHeader({ children, sticky, left }: { children: React.ReactNode; sticky?: boolean; left?: string }) {
  return (
    <th className={`sticky top-8 z-20 border-b border-r border-slate-300 px-2 py-3 text-center ${sticky ? `${left} bg-slate-50` : 'bg-slate-50'}`}>
      {children}
    </th>
  );
}

function FrozenCell({ children, left }: { children: React.ReactNode; left: string }) {
  return (
    <td className={`sticky ${left} z-10 border-b border-r border-slate-300 bg-white px-2 py-0 font-black shadow-[8px_0_16px_rgba(15,23,42,0.04)]`}>
      {children}
    </td>
  );
}

function CalcCell({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <td className={`border-b border-r border-slate-300 px-2 py-0 text-right font-black ${warn ? 'bg-red-100' : 'bg-slate-50'}`}>
      {children}
    </td>
  );
}

function TextCell({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <td className={`border-b border-r border-slate-300 px-2 py-0 font-semibold ${warn ? 'bg-orange-100' : 'bg-white'}`}>
      {children}
    </td>
  );
}

function NumberCell({ value, onChange, warn }: { value: number | null; onChange: (value: string) => void; warn?: boolean }) {
  return (
    <td className="border-b border-r border-slate-300 p-0">
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 w-full px-2 text-right font-bold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-700 ${warn ? 'bg-orange-100' : 'bg-amber-50'}`}
      />
    </td>
  );
}

function StatusPill({ status }: { status: string }) {
  const classes =
    status === 'saved'
      ? 'bg-green-100 text-green-700'
      : status === 'review'
        ? 'bg-orange-100 text-orange-700'
        : 'bg-red-100 text-red-700';

  return (
    <div className={`flex h-9 items-center justify-center text-[11px] font-black uppercase ${classes}`}>
      {status === 'saved' ? 'Saved' : status === 'review' ? 'Review suggested' : 'Missing'}
    </div>
  );
}
