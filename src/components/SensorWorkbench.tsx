import React, { useState } from 'react';
import {
  Footprints,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { BurstSampleEvent } from '../types/step';

export type AutoWalkPace = 'stroll' | 'brisk' | 'run';

interface SensorWorkbenchProps {
  todaySteps: number;
  burstBufferCount: number;
  minBurstSteps: number;
  liveCadenceSpm: number;
  isAutoWalking: boolean;
  autoPace: AutoWalkPace;
  deviceMotionActive: boolean;
  deviceMotionSupported: boolean;
  recentEvents: BurstSampleEvent[];
  onTapStep: () => void;
  onSimulateShake: () => void;
  onToggleAutoWalk: () => void;
  onChangeAutoPace: (pace: AutoWalkPace) => void;
  onToggleDeviceMotion: () => void;
  onReconcileHealthConnect: (hcStepsTotal: number) => void;
}

const PACE_OPTIONS: { id: AutoWalkPace; label: string; spm: number }[] = [
  { id: 'stroll', label: 'Stroll · 85', spm: 85 },
  { id: 'brisk', label: 'Brisk · 122', spm: 122 },
  { id: 'run', label: 'Run · 156', spm: 156 },
];

export const SensorWorkbench: React.FC<SensorWorkbenchProps> = ({
  todaySteps,
  burstBufferCount,
  minBurstSteps,
  liveCadenceSpm,
  isAutoWalking,
  autoPace,
  deviceMotionActive,
  deviceMotionSupported,
  recentEvents,
  onTapStep,
  onSimulateShake,
  onToggleAutoWalk,
  onChangeAutoPace,
  onToggleDeviceMotion,
  onReconcileHealthConnect,
}) => {
  const [showHcPanel, setShowHcPanel] = useState(false);
  const [hcInput, setHcInput] = useState<string>(() => String(todaySteps + 1250));

  const gateProgressPct = Math.min(100, (burstBufferCount / minBurstSteps) * 100);
  const gateConfirmed = liveCadenceSpm > 0;

  const handleOpenHc = () => {
    setHcInput(String(todaySteps + 1250));
    setShowHcPanel((prev) => !prev);
  };

  const handleSubmitHc = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Math.max(0, Math.round(Number(hcInput) || 0));
    onReconcileHealthConnect(parsed);
    setShowHcPanel(false);
  };

  return (
    <section
      aria-label="Dual-source step and burst filter workbench"
      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Dual-Source Step &amp; Cadence Engine
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Requires 4+ rhythmic steps within 3.5 seconds before committing active cadence.
            </p>
          </div>
          <span
            className={`text-xs font-semibold tabular-nums ${
              gateConfirmed ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            {gateConfirmed
              ? `Gate Open · ${liveCadenceSpm} spm`
              : `Burst Gate · ${burstBufferCount}/${minBurstSteps}`}
          </span>
        </div>

        {/* 4-Step Burst Gate Visualizer */}
        <div className="mt-5">
          <div className="grid grid-cols-4 gap-2" aria-label="4-step burst gate progress">
            {[1, 2, 3, 4].map((slot) => {
              const filled = burstBufferCount >= slot || gateConfirmed;
              return (
                <div
                  key={slot}
                  className={`h-2 rounded-full transition-colors duration-150 ${
                    gateConfirmed
                      ? 'bg-emerald-600'
                      : filled
                        ? 'bg-amber-500'
                        : 'bg-slate-200'
                  }`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 tabular-nums">
            <span>
              {gateConfirmed
                ? 'Rhythmic walking confirmed — stride & MET calories active'
                : burstBufferCount > 0
                  ? `${burstBufferCount} of ${minBurstSteps} steps buffered (3.5s window)`
                  : 'Waiting for rhythmic motion ticks'}
            </span>
            <span>{Math.round(gateProgressPct)}%</span>
          </div>
        </div>

        {/* Interactive Step & Anti-Shake Controls */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onTapStep}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-700 active:scale-[0.98] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <Footprints className="h-4 w-4" aria-hidden="true" />
            Tap Rhythmic Step
          </button>

          <button
            type="button"
            onClick={onSimulateShake}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-100 active:scale-[0.98] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />
            Simulate Car Shake
          </button>
        </div>

        {/* Auto-Walk Pace Control */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div
            role="group"
            aria-label="Auto-walk pace"
            className="inline-flex items-center rounded-lg bg-slate-100 p-1"
          >
            {PACE_OPTIONS.map((opt) => {
              const active = autoPace === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeAutoPace(opt.id)}
                  className={`min-h-[36px] rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onToggleAutoWalk}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 ${
              isAutoWalking
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            {isAutoWalking ? (
              <>
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                Stop Walk Session
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Start Walk Session
              </>
            )}
          </button>
        </div>

        {/* Health Connect & Mobile DeviceMotion Row */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleOpenHc}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            Reconcile Health Connect
          </button>

          <button
            type="button"
            onClick={onToggleDeviceMotion}
            disabled={!deviceMotionSupported}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              !deviceMotionSupported
                ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                : deviceMotionActive
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title={
              deviceMotionSupported
                ? 'Use device accelerometer for live step detection'
                : 'Accelerometer unavailable in this browser'
            }
          >
            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
            {deviceMotionActive ? 'Accelerometer Active' : 'Phone Accelerometer'}
          </button>
        </div>

        {/* Inline Health Connect SPN Reconciliation Panel */}
        {showHcPanel && (
          <form
            onSubmit={handleSubmitHc}
            className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="hc-steps-input"
                className="text-xs font-semibold text-slate-800"
              >
                Health Connect Aggregate Total (SPN + Wearable)
              </label>
              <span className="text-xs text-slate-500 tabular-nums">
                Local total: {todaySteps.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Uses max(local, aggregated) without DataOrigin filtering to prevent double counting.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                id="hc-steps-input"
                type="number"
                min={0}
                max={100000}
                value={hcInput}
                onChange={(e) => setHcInput(e.target.value)}
                className="min-h-[40px] w-36 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <button
                type="submit"
                className="min-h-[40px] rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap"
              >
                Merge Wearable Steps
              </button>
              <button
                type="button"
                onClick={() => setShowHcPanel(false)}
                className="min-h-[40px] rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Recent Sensor / Burst Gate Activity */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Recent Sensor Gate Activity</span>
          <span className="tabular-nums">{recentEvents.length} events</span>
        </div>
        {recentEvents.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            Tap Rhythmic Step 4+ times quickly to open the cadence gate, or simulate a car shake to verify filtering.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {recentEvents.slice(0, 3).map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-3 py-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <span
                    className={`font-semibold ${
                      ev.kind === 'filtered_shake'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {ev.kind === 'filtered_shake' ? 'Blocked' : 'Committed'}
                  </span>
                  <span className="mx-1.5 text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-slate-700 truncate">{ev.message}</span>
                </div>
                <span className="font-mono text-slate-500 tabular-nums shrink-0">
                  {ev.timeLabel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
