import { DailySummary } from '../types/step';

/**
 * Sliding-window cadence & anti-shake burst filter.
 * Prevents car bumps or pocket jiggles from registering as active walking bouts.
 */
export class CadenceBurstFilter {
  private readonly minBurstSteps: number;
  private readonly windowMs: number;
  private recentStepTimestamps: number[] = [];

  constructor(minBurstSteps = 4, windowMs = 3500) {
    this.minBurstSteps = minBurstSteps;
    this.windowMs = windowMs;
  }

  /**
   * Call on every step detector tick.
   * Returns current SPM if rhythmic walking is confirmed (4+ steps within 3.5s), else 0.
   */
  onStepDetected(nowMs: number): {
    cadenceSpm: number;
    bufferCount: number;
    minBurstSteps: number;
    confirmed: boolean;
  } {
    this.recentStepTimestamps.push(nowMs);
    while (
      this.recentStepTimestamps.length > 0 &&
      nowMs - this.recentStepTimestamps[0] > this.windowMs
    ) {
      this.recentStepTimestamps.shift();
    }

    const bufferCount = this.recentStepTimestamps.length;
    if (bufferCount < this.minBurstSteps) {
      return {
        cadenceSpm: 0,
        bufferCount,
        minBurstSteps: this.minBurstSteps,
        confirmed: false,
      };
    }

    const first = this.recentStepTimestamps[0];
    const last = this.recentStepTimestamps[bufferCount - 1];
    const spanMs = Math.max(500, last - first);
    const intervals = bufferCount - 1;
    const rawSpm = Math.trunc((intervals * 60000) / spanMs);
    const cadenceSpm = Math.min(220, Math.max(40, rawSpm));

    return {
      cadenceSpm,
      bufferCount,
      minBurstSteps: this.minBurstSteps,
      confirmed: true,
    };
  }

  getBufferCount(nowMs: number): number {
    this.recentStepTimestamps = this.recentStepTimestamps.filter(
      (ts) => nowMs - ts <= this.windowMs
    );
    return this.recentStepTimestamps.length;
  }

  reset(): void {
    this.recentStepTimestamps = [];
  }
}

export interface GaitZoneInfo {
  label: string;
  strideFactor: number;
  metValue: number;
  tone: 'neutral' | 'emerald' | 'amber';
}

export const Biomechanics = {
  /** Dynamic stride length scales with height and walking cadence. */
  estimateStrideMeters(heightCm: number, cadenceSpm: number): number {
    const baseFactor =
      cadenceSpm >= 145
        ? 0.54 // Jogging / running
        : cadenceSpm >= 115
          ? 0.44 // Brisk walking
          : 0.415; // Normal walking
    return (heightCm / 100.0) * baseFactor;
  },

  getMetForCadence(cadenceSpm: number): number {
    const effectiveSpm = cadenceSpm > 0 ? cadenceSpm : 95;
    if (effectiveSpm >= 150) return 8.3;
    if (effectiveSpm >= 125) return 4.8;
    if (effectiveSpm >= 100) return 3.5;
    return 2.5;
  },

  /** MET-based calorie formula: kcal = MET * weightKg * durationHours */
  calculateCaloriesDelta(
    stepsDelta: number,
    cadenceSpm: number,
    weightKg: number
  ): number {
    if (stepsDelta <= 0) return 0;
    const effectiveSpm = cadenceSpm > 0 ? cadenceSpm : 95;
    const met = this.getMetForCadence(effectiveSpm);
    const hours = stepsDelta / (effectiveSpm * 60.0);
    return met * weightKg * hours;
  },

  getGaitZone(cadenceSpm: number): GaitZoneInfo {
    if (cadenceSpm <= 0) {
      return {
        label: 'Idle / Gate Armed',
        strideFactor: 0.415,
        metValue: 2.5,
        tone: 'neutral',
      };
    }
    if (cadenceSpm >= 145) {
      return {
        label: 'Running Stride',
        strideFactor: 0.54,
        metValue: this.getMetForCadence(cadenceSpm),
        tone: 'amber',
      };
    }
    if (cadenceSpm >= 115) {
      return {
        label: 'Brisk Cadence',
        strideFactor: 0.44,
        metValue: this.getMetForCadence(cadenceSpm),
        tone: 'emerald',
      };
    }
    return {
      label: 'Steady Walk',
      strideFactor: 0.415,
      metValue: this.getMetForCadence(cadenceSpm),
      tone: 'emerald',
    };
  },
};

export interface AdaptiveGoalDiagnostics {
  suggestedGoal: number;
  qualifyingDaysCount: number;
  sevenDayMedian: number | null;
  fiveDayHits: number;
  adjustmentReason: string;
  multiplierLabel: string;
}

export const AdaptiveGoalEngine = {
  /**
   * Computes today's adaptive target using a 7-day rolling median
   * with progressive overload (+5%) or recovery cap (-5%).
   */
  computeGoalDiagnostics(
    recentDaysDescending: DailySummary[],
    baseGoal: number
  ): AdaptiveGoalDiagnostics {
    const completed = recentDaysDescending
      .slice(1)
      .slice(0, 7)
      .map((d) => d.steps)
      .filter((s) => s > 1000);

    if (completed.length < 3) {
      return {
        suggestedGoal: baseGoal,
        qualifyingDaysCount: completed.length,
        sevenDayMedian: null,
        fiveDayHits: 0,
        adjustmentReason:
          'Need at least 3 completed days (>1,000 steps) to activate adaptive scaling; using base goal.',
        multiplierLabel: 'Baseline (1.00x)',
      };
    }

    const sorted = [...completed].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const hitCount = recentDaysDescending
      .slice(1)
      .slice(0, 5)
      .filter((d) => d.goalHit).length;

    let rawTarget = median;
    let adjustmentReason =
      'Balanced 2–3 hits in the last 5 days; holding target at 7-day rolling median.';
    let multiplierLabel = 'Hold Median (1.00x)';

    if (hitCount >= 4) {
      rawTarget = Math.round(median * 1.05);
      adjustmentReason =
        '4+ goals hit in the last 5 days — applying +5% progressive overload to 7-day median.';
      multiplierLabel = 'Overload (+5%)';
    } else if (hitCount <= 1) {
      rawTarget = Math.max(4000, Math.round(median * 0.95));
      adjustmentReason =
        '0–1 goals hit in the last 5 days — applying -5% recovery floor (min 4,000 steps).';
      multiplierLabel = 'Recovery (-5%)';
    }

    const rounded = Math.floor((rawTarget + 125) / 250) * 250;
    const suggestedGoal = Math.min(25000, Math.max(3000, rounded));

    return {
      suggestedGoal,
      qualifyingDaysCount: completed.length,
      sevenDayMedian: median,
      fiveDayHits: hitCount,
      adjustmentReason,
      multiplierLabel,
    };
  },

  computeSuggestedGoal(
    recentDaysDescending: DailySummary[],
    baseGoal: number
  ): number {
    return this.computeGoalDiagnostics(recentDaysDescending, baseGoal)
      .suggestedGoal;
  },

  /**
   * Computes active streak allowing protected days via Freeze Tokens.
   * If today is still in progress and not yet hit, counts consecutive completed days up to yesterday.
   */
  computeStreak(daysDescending: DailySummary[]): {
    streakDays: number;
    includesToday: boolean;
  } {
    if (daysDescending.length === 0) {
      return { streakDays: 0, includesToday: false };
    }

    const today = daysDescending[0];
    const startIdx = today.goalHit || today.freezeUsed ? 0 : 1;
    let streak = 0;

    for (let i = startIdx; i < daysDescending.length; i++) {
      const day = daysDescending[i];
      if (day.goalHit || day.freezeUsed) {
        streak++;
      } else {
        break;
      }
    }

    return {
      streakDays: streak,
      includesToday: startIdx === 0 && streak > 0,
    };
  },
};
