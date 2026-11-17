import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  ARCHITECTURE_PILLARS,
  IOS_PARITY_NOTE,
  KOTLIN_MANIFEST_SNIPPET,
} from '../data/comparisonData';
import { AdaptiveGoalEngine, Biomechanics } from '../domain/stepIntelligence';
import { DailySummary, UserProfile } from '../types/step';

interface BiomechanicsViewProps {
  profile: UserProfile;
  today: DailySummary;
  recentDaysDesc: DailySummary[];
  onSaveProfile: (next: UserProfile) => void;
}

export const BiomechanicsView: React.FC<BiomechanicsViewProps> = ({
  profile,
  today,
  recentDaysDesc,
  onSaveProfile,
}) => {
  const [heightCm, setHeightCm] = useState(profile.heightCm);
  const [weightKg, setWeightKg] = useState(profile.weightKg);
  const [baseGoal, setBaseGoal] = useState(profile.baseGoal);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const diagnostics = AdaptiveGoalEngine.computeGoalDiagnostics(
    recentDaysDesc,
    baseGoal
  );

  const cadenceBands = [
    { label: 'Slow Stroll', spm: 85 },
    { label: 'Normal Walk', spm: 105 },
    { label: 'Brisk Walk', spm: 128 },
    { label: 'Jog / Run', spm: 155 },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...profile,
      heightCm: Math.min(225, Math.max(120, Number(heightCm) || 172)),
      weightKg: Math.min(200, Math.max(35, Number(weightKg) || 70)),
      baseGoal: Math.min(25000, Math.max(3000, Number(baseGoal) || 8000)),
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(
        `${KOTLIN_MANIFEST_SNIPPET}\n\n${IOS_PARITY_NOTE}`
      );
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const widgetPct = Math.round(
    (today.steps * 100) / Math.max(1, today.goalSteps)
  );

  return (
    <div className="space-y-6">
      {/* Row 1: Calibration & Adaptive Goal Diagnostics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Biomechanics Profile Form */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="font-display text-xl font-bold text-slate-900">
            On-Device Biomechanics Calibration
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Stride length and MET energy expenditure adapt dynamically to height, mass, and live cadence.
          </p>

          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="profile-height"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Height (cm)
                </label>
                <input
                  id="profile-height"
                  type="number"
                  min={120}
                  max={225}
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-weight"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Weight (kg)
                </label>
                <input
                  id="profile-weight"
                  type="number"
                  min={35}
                  max={200}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-goal"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Base Floor Goal
                </label>
                <input
                  id="profile-goal"
                  type="number"
                  step={250}
                  min={3000}
                  max={25000}
                  value={baseGoal}
                  onChange={(e) => setBaseGoal(Number(e.target.value))}
                  className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500 tabular-nums">
                Freeze Tokens available: {profile.freezeTokens}
              </span>
              <button
                type="submit"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
              >
                {savedNotice ? 'Calibration Saved' : 'Apply Calibration'}
              </button>
            </div>
          </form>

          {/* Calibrated MET & Stride Matrix */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-700">
              Calibrated Stride &amp; MET Curve (at {heightCm} cm · {weightKg} kg)
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-medium">Gait Band</th>
                    <th className="py-2 px-3 text-right font-medium">Cadence</th>
                    <th className="py-2 px-3 text-right font-medium">Stride</th>
                    <th className="py-2 px-3 text-right font-medium">MET</th>
                    <th className="py-2 pl-3 text-right font-medium">kcal / 1k steps</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {cadenceBands.map((band) => {
                    const stride = Biomechanics.estimateStrideMeters(heightCm, band.spm);
                    const met = Biomechanics.getMetForCadence(band.spm);
                    const kcal1k = Biomechanics.calculateCaloriesDelta(
                      1000,
                      band.spm,
                      weightKg
                    );
                    return (
                      <tr key={band.label}>
                        <td className="py-2 pr-3 font-sans font-medium text-slate-800">
                          {band.label}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {band.spm} spm
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700">
                          {stride.toFixed(2)} m
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700">
                          {met.toFixed(1)}
                        </td>
                        <td className="py-2 pl-3 text-right font-semibold text-emerald-700">
                          {kcal1k.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Adaptive Goal Engine & Jetpack Glance Widget Preview */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Adaptive Goal Engine
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {diagnostics.adjustmentReason}
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-700 whitespace-nowrap">
                {diagnostics.multiplierLabel}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <div>
                <div className="text-xs text-slate-500">Suggested Target</div>
                <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                  {diagnostics.suggestedGoal.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">7-Day Median</div>
                <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                  {diagnostics.sevenDayMedian !== null
                    ? diagnostics.sevenDayMedian.toLocaleString()
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">5-Day Goal Hits</div>
                <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
                  {diagnostics.fiveDayHits} / 5
                </div>
              </div>
            </div>
          </section>

          {/* Live Jetpack Glance Home Screen Widget Preview */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Jetpack Glance Widget Preview
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Android home screen surface · bound directly to local Room SQLite
                </p>
              </div>
              <span className="font-mono text-xs text-slate-500">2×1 Glance</span>
            </div>

            <div className="mt-4 rounded-xl bg-slate-100 p-5">
              <div className="mx-auto max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-xl font-extrabold text-slate-900 tabular-nums">
                    {today.steps.toLocaleString()} steps
                  </span>
                  <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                    {widgetPct}%
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500 tabular-nums">
                  Goal: {today.goalSteps.toLocaleString()} · {(today.distanceMeters / 1000).toFixed(2)} km
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{ width: `${Math.min(100, widgetPct)}%` }}
                    className="h-full rounded-full bg-emerald-600 transition-[width] duration-300"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Row 2: 2026 Offline Architecture Pillars + Manifest/iOS Parity */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-lg font-bold text-slate-900">
          2026 Offline-First Native Architecture
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Hardware coprocessor fusion, Health Connect 1.1.0 Synthetic Package Name (SPN) compatibility, and zero network sockets.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {ARCHITECTURE_PILLARS.map((pillar) => (
            <div
              key={pillar.index}
              className="border-t border-slate-200 pt-4"
            >
              <div className="font-display text-sm font-bold text-slate-900">
                {pillar.index}. {pillar.title}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {pillar.summary}
              </p>
              <div className="mt-2 font-mono text-[11px] text-slate-500">
                {pillar.spec}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-slate-700">
              AndroidManifest.xml (Zero INTERNET) &amp; iOS CoreMotion Parity
            </h3>
            <button
              type="button"
              onClick={handleCopySnippet}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copiedCode ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy Spec
                </>
              )}
            </button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
            <code>{`${KOTLIN_MANIFEST_SNIPPET}\n\n${IOS_PARITY_NOTE}`}</code>
          </pre>
        </div>
      </section>
    </div>
  );
};
