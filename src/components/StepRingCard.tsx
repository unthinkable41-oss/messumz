import React from 'react';
import { Biomechanics } from '../domain/stepIntelligence';
import { DailySummary } from '../types/step';

interface StepRingCardProps {
  today: DailySummary;
  liveCadenceSpm: number;
  isWalkingAuto: boolean;
  isOfflineBrowser: boolean;
}

export const StepRingCard: React.FC<StepRingCardProps> = ({
  today,
  liveCadenceSpm,
  isWalkingAuto,
  isOfflineBrowser,
}) => {
  const goal = Math.max(1, today.goalSteps);
  const ratio = Math.min(1, Math.max(0, today.steps / goal));
  const percent = Math.round((today.steps / goal) * 100);
  const remaining = Math.max(0, goal - today.steps);

  // 270-degree open arc matching Compose Canvas(startAngle = 135f, sweepAngle = 270f)
  const size = 244;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 deg
  const filledLength = arcLength * ratio;
  const gait = Biomechanics.getGaitZone(liveCadenceSpm);

  return (
    <section
      aria-label="Daily step progress"
      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
    >
      {/* Clean unboxed metadata header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{today.dateIso}</span>
          <span aria-hidden="true">·</span>
          <span>{today.sourceNote ?? 'Hardware Coprocessor'}</span>
          <span aria-hidden="true">·</span>
          <span>{isOfflineBrowser ? 'Offline Mode Active' : 'Zero-Network Storage'}</span>
        </div>
        <span className="text-xs font-medium tabular-nums text-emerald-700">
          {today.goalHit ? 'Daily goal reached' : `${remaining.toLocaleString()} steps to goal`}
        </span>
      </div>

      {/* Focal Anchor: 270° Adaptive Step Ring */}
      <div className="my-6 flex flex-col items-center justify-center">
        <div className="relative flex h-[244px] w-[244px] items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible"
            role="img"
            aria-label={`${today.steps.toLocaleString()} of ${goal.toLocaleString()} steps (${percent}%)`}
          >
            {/* Track Arc (rotated so gap sits symmetrically at bottom) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference}`}
              transform={`rotate(135 ${size / 2} ${size / 2})`}
            />
            {/* Active Progress Arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={today.goalHit ? '#059669' : '#10b981'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${filledLength} ${circumference}`}
              transform={`rotate(135 ${size / 2} ${size / 2})`}
              className="transition-[stroke-dasharray] duration-500 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <span className="text-xs font-medium text-slate-500">Today&apos;s Steps</span>
            <span className="mt-1 font-display text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums sm:text-5xl">
              {today.steps.toLocaleString()}
            </span>
            <span className="mt-1.5 text-sm text-slate-600 tabular-nums">
              of {goal.toLocaleString()} adaptive goal
            </span>
            <span className="mt-1 font-mono text-xs font-medium text-emerald-700 tabular-nums">
              {percent}% complete
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Biomechanics Readout — unboxed typographic row */}
      <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">Live Cadence:</span>
          <span className="font-mono tabular-nums font-semibold text-slate-900">
            {liveCadenceSpm > 0 ? `${liveCadenceSpm} spm` : '0 spm'}
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span>
            {gait.label}
            {isWalkingAuto ? ' (Auto)' : ''}
          </span>
        </div>
        <div className="font-mono tabular-nums text-slate-500">
          Stride {(gait.strideFactor * 100).toFixed(1)}% height · {gait.metValue.toFixed(1)} MET
        </div>
      </div>
    </section>
  );
};
