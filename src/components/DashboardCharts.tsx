import React, { useState } from 'react';
import { CheckCircle2, Snowflake, MinusCircle } from 'lucide-react';
import { DailySummary, HourlyBucket } from '../types/step';

interface DashboardChartsProps {
  hourlyBuckets: HourlyBucket[];
  recentDaysDesc: DailySummary[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  hourlyBuckets,
  recentDaysDesc,
}) => {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [hoveredDayIso, setHoveredDayIso] = useState<string | null>(null);

  const hourMap = new Map<number, number>(hourlyBuckets.map((b) => [b.hour, b.steps]));
  const maxHourSteps = Math.max(100, ...hourlyBuckets.map((b) => b.steps));

  const peakBucket = hourlyBuckets.reduce<HourlyBucket | null>(
    (best, cur) => (!best || cur.steps > best.steps ? cur : best),
    null
  );

  const activeHour = hoveredHour !== null ? hoveredHour : peakBucket?.hour ?? 12;
  const activeHourSteps = hourMap.get(activeHour) ?? 0;

  // Last 7 days chronological (oldest -> today)
  const sevenDays = recentDaysDesc.slice(0, 7).reverse();
  const maxDaySteps = Math.max(
    1000,
    ...sevenDays.map((d) => Math.max(d.steps, d.goalSteps))
  );

  const selectedDay =
    sevenDays.find((d) => d.dateIso === hoveredDayIso) ?? sevenDays[sevenDays.length - 1];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 1. Today's Hourly Intraday Histogram */}
      <section
        aria-label="Today's hourly activity"
        className="rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Today&apos;s Hourly Activity
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              24-hour local bucket distribution
            </p>
          </div>
          <div className="text-right text-xs tabular-nums">
            <span className="font-mono font-semibold text-slate-900">
              {String(activeHour).padStart(2, '0')}:00
            </span>
            <span className="mx-1.5 text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-medium text-emerald-700">
              {activeHourSteps.toLocaleString()} steps
            </span>
          </div>
        </div>

        <div className="mt-6 flex h-36 items-end gap-1" role="list" aria-label="Hourly step bars">
          {Array.from({ length: 24 }, (_, h) => {
            const steps = hourMap.get(h) ?? 0;
            const heightPct = steps > 0 ? Math.max(8, (steps / maxHourSteps) * 100) : 4;
            const isSelected = activeHour === h;

            return (
              <button
                key={h}
                type="button"
                onMouseEnter={() => setHoveredHour(h)}
                onFocus={() => setHoveredHour(h)}
                onClick={() => setHoveredHour(h)}
                aria-label={`${String(h).padStart(2, '0')}:00 — ${steps.toLocaleString()} steps`}
                className="group flex h-full flex-1 flex-col items-center justify-end focus:outline-none"
              >
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-sm transition-colors duration-150 ${
                    steps === 0
                      ? 'bg-slate-100'
                      : isSelected
                        ? 'bg-emerald-700'
                        : 'bg-emerald-500/80 group-hover:bg-emerald-600'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 flex items-center justify-between font-mono text-[11px] text-slate-400 tabular-nums">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </section>

      {/* 2. Last 7 Days Trend */}
      <section
        aria-label="Last 7 days step trend"
        className="rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Last 7 Days Trend
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Stored locally forever (beyond 30-day Health Connect cap)
            </p>
          </div>
          {selectedDay && (
            <div className="text-right text-xs tabular-nums">
              <span className="font-mono font-semibold text-slate-900">
                {selectedDay.dateIso.slice(5)}
              </span>
              <span className="mx-1.5 text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="font-medium text-slate-700">
                {selectedDay.steps.toLocaleString()} / {selectedDay.goalSteps.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 grid h-36 grid-cols-7 items-end gap-2.5">
          {sevenDays.map((day) => {
            const barPct = Math.max(8, (day.steps / maxDaySteps) * 100);
            const goalPct = Math.min(96, Math.max(8, (day.goalSteps / maxDaySteps) * 100));
            const dayDate = new Date(`${day.dateIso}T12:00:00`);
            const weekday = dayDate.toLocaleDateString(undefined, { weekday: 'short' });
            const isSelected = selectedDay?.dateIso === day.dateIso;

            const barColor = day.goalHit
              ? isSelected
                ? 'bg-emerald-700'
                : 'bg-emerald-600'
              : day.freezeUsed
                ? 'bg-amber-500'
                : 'bg-slate-300';

            return (
              <button
                key={day.dateIso}
                type="button"
                onMouseEnter={() => setHoveredDayIso(day.dateIso)}
                onFocus={() => setHoveredDayIso(day.dateIso)}
                onClick={() => setHoveredDayIso(day.dateIso)}
                aria-label={`${day.dateIso}: ${day.steps.toLocaleString()} steps, goal ${day.goalSteps.toLocaleString()}`}
                className="relative flex h-full flex-col items-center justify-end focus:outline-none"
              >
                {/* Adaptive Goal Marker Line */}
                <span
                  aria-hidden="true"
                  style={{ bottom: `${goalPct}%` }}
                  className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-slate-500/70"
                />
                <div
                  style={{ height: `${barPct}%` }}
                  className={`w-full max-w-[36px] rounded-t-md transition-colors duration-150 ${barColor}`}
                />
                <span className="sr-only">{weekday}</span>
              </button>
            );
          })}
        </div>

        {/* Day labels + accessible status indicators (never hue-only) */}
        <div className="mt-2.5 grid grid-cols-7 gap-2.5 text-center">
          {sevenDays.map((day) => {
            const dayDate = new Date(`${day.dateIso}T12:00:00`);
            const weekday = dayDate.toLocaleDateString(undefined, { weekday: 'short' });
            return (
              <div key={day.dateIso} className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] font-medium text-slate-600">{weekday}</span>
                {day.goalHit ? (
                  <span
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700"
                    title="Goal Hit"
                  >
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    Hit
                  </span>
                ) : day.freezeUsed ? (
                  <span
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700"
                    title="Freeze Protected"
                  >
                    <Snowflake className="h-3 w-3" aria-hidden="true" />
                    Freeze
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500"
                    title="In Progress or Below Goal"
                  >
                    <MinusCircle className="h-3 w-3" aria-hidden="true" />
                    Open
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
