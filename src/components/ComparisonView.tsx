import React, { useState } from 'react';
import { COMPARISON_ENTRIES } from '../data/comparisonData';
import { ComparisonEntry } from '../types/step';

type CategoryFilter = 'all' | ComparisonEntry['category'];

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All Criteria' },
  { id: 'privacy', label: 'Privacy & Offline' },
  { id: 'sensors', label: 'Sensors & 2026 SPN' },
  { id: 'intelligence', label: 'Goal Intelligence' },
  { id: 'ecosystem', label: 'Pricing' },
];

export const ComparisonView: React.FC = () => {
  const [category, setCategory] = useState<CategoryFilter>('all');

  const rows =
    category === 'all'
      ? COMPARISON_ENTRIES
      : COMPARISON_ENTRIES.filter((item) => item.category === category);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              2026 Step Counting App Comparison
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Because modern apps read the same Apple HealthKit or Android Health Connect counters, differentiation comes down to privacy, offline resilience, paywalls, and wearable reconciliation.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter comparison criteria"
            className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`min-h-[36px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  category === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 font-semibold">Feature / Criteria</th>
                <th className="bg-emerald-50/70 px-4 py-3 font-bold text-emerald-900">
                  StrideLocal (This App)
                </th>
                <th className="px-4 py-3 font-semibold">StepsApp</th>
                <th className="px-4 py-3 font-semibold">Pacer</th>
                <th className="px-4 py-3 font-semibold">Samsung / Apple Health</th>
                <th className="px-4 py-3 font-semibold">Google Health (ex-Fitbit)</th>
                <th className="px-4 py-3 font-semibold">Pedometer++</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.criterion} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    {row.criterion}
                  </td>
                  <td className="bg-emerald-50/40 px-4 py-3.5 font-semibold text-emerald-900">
                    {row.strideLocal}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{row.stepsApp}</td>
                  <td className="px-4 py-3.5 text-slate-600">{row.pacer}</td>
                  <td className="px-4 py-3.5 text-slate-600">{row.ecosystemHealth}</td>
                  <td className="px-4 py-3.5 text-slate-600">{row.googleHealth}</td>
                  <td className="px-4 py-3.5 text-slate-600">{row.pedometerPlus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Trade-off Analysis: Where StrideLocal Wins vs. Where Leaders Win */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">
            01. Where StrideLocal Beats Leading Apps
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="border-t border-slate-100 pt-3">
              <dt className="font-semibold text-slate-900">
                True Privacy &amp; Zero Lock-In
              </dt>
              <dd className="mt-1 text-slate-600">
                Third-party trackers like Pacer and StepsApp gate deep analytics behind $30–$50/yr subscriptions and bundle usage telemetry. StrideLocal cannot phone home at the OS manifest level and includes 1-tap CSV exports.
              </dd>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <dt className="font-semibold text-slate-900">
                Beats the 30-Day Health Connect Cliff
              </dt>
              <dd className="mt-1 text-slate-600">
                Health Connect restricts unpermissioned historical queries to 30 days by default. StrideLocal archives every hourly bucket in local Room SQLite indefinitely.
              </dd>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <dt className="font-semibold text-slate-900">
                Legacy Android Compatibility
              </dt>
              <dd className="mt-1 text-slate-600">
                Native Health Connect step counting requires Android 14+ (Ext 20+). Direct TYPE_STEP_COUNTER sensor fusion works offline down to Android 8.0 (API 26).
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-slate-900">
            02. Where Leading Ecosystem Apps Still Win
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="border-t border-slate-100 pt-3">
              <dt className="font-semibold text-slate-900">
                Wearable Hardware &amp; Deep Biometrics
              </dt>
              <dd className="mt-1 text-slate-600">
                Apple Health, Samsung Health, and Google Health integrate tightly with Apple Watch, Galaxy Watch, Pixel Watch, and Oura/Garmin rings for heart rate, sleep stages, ECG, and readiness scores. StrideLocal still ingests steps from any wearable writing to Health Connect.
              </dd>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <dt className="font-semibold text-slate-900">
                Social Accountability &amp; Guided Coaching
              </dt>
              <dd className="mt-1 text-slate-600">
                Pacer and gamified trackers like MistyWay drive habit retention through friend challenges, RPG quests, and audio-guided walking plans—features that inherently require cloud connectivity.
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
};
