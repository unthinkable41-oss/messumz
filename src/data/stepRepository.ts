import { AdaptiveGoalEngine, Biomechanics } from '../domain/stepIntelligence';
import { DailySummary, HourlyBucket, SensorCheckpoint, UserProfile } from '../types/step';

const STORAGE_KEYS = {
  days: 'stridelocal_daily_summaries_v1',
  hourly: 'stridelocal_hourly_buckets_v1',
  profile: 'stridelocal_user_profile_v1',
  checkpoint: 'stridelocal_sensor_checkpoint_v1',
};

export function formatLocalDateIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysIso(baseDate: Date, offsetDays: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return formatLocalDateIso(d);
}

const DEFAULT_PROFILE: UserProfile = {
  id: 1,
  heightCm: 174,
  weightKg: 71,
  baseGoal: 8000,
  freezeTokens: 2,
};

function buildSeedHourly(dateIso: string, totalSteps: number, currentHourLimit?: number): HourlyBucket[] {
  // Realistic circadian walking distribution across 06:00..22:00
  const weights: Record<number, number> = {
    6: 0.03,
    7: 0.08,
    8: 0.12,
    9: 0.06,
    10: 0.05,
    11: 0.06,
    12: 0.14,
    13: 0.08,
    14: 0.05,
    15: 0.04,
    16: 0.06,
    17: 0.11,
    18: 0.07,
    19: 0.03,
    20: 0.02,
  };

  const buckets: HourlyBucket[] = [];
  let allocated = 0;

  const eligibleHours = Object.keys(weights)
    .map(Number)
    .filter((h) => (currentHourLimit === undefined ? true : h <= currentHourLimit));

  const totalWeight = eligibleHours.reduce((sum, h) => sum + weights[h], 0) || 1;

  for (let h = 0; h < 24; h++) {
    if (eligibleHours.includes(h)) {
      const share = Math.round((totalSteps * weights[h]) / totalWeight);
      allocated += share;
      buckets.push({ dateIso, hour: h, steps: share });
    } else {
      buckets.push({ dateIso, hour: h, steps: 0 });
    }
  }

  // Adjust rounding difference onto the peak active hour
  if (eligibleHours.length > 0 && allocated !== totalSteps) {
    const peakHour = eligibleHours[eligibleHours.length - 1];
    const idx = buckets.findIndex((b) => b.hour === peakHour);
    if (idx >= 0) {
      buckets[idx] = {
        ...buckets[idx],
        steps: Math.max(0, buckets[idx].steps + (totalSteps - allocated)),
      };
    }
  }

  return buckets;
}

function buildSeedData(profile: UserProfile): {
  days: DailySummary[];
  hourly: Record<string, HourlyBucket[]>;
} {
  const now = new Date();
  const currentHour = now.getHours();

  // 14-day local archive demonstrating adaptive goal progression & freeze token protection
  const templatePast = [
    { offset: -13, steps: 7640, goal: 7500, peak: 118, freeze: false, note: 'Hardware Sensor' },
    { offset: -12, steps: 8120, goal: 7750, peak: 124, freeze: false, note: 'Hardware Sensor' },
    { offset: -11, steps: 6410, goal: 8000, peak: 112, freeze: false, note: 'Hardware Sensor' },
    { offset: -10, steps: 8950, goal: 8000, peak: 132, freeze: false, note: 'Hardware + Watch' },
    { offset: -9, steps: 9320, goal: 8000, peak: 136, freeze: false, note: 'Hardware Sensor' },
    { offset: -8, steps: 8480, goal: 8250, peak: 126, freeze: false, note: 'Hardware Sensor' },
    { offset: -7, steps: 7920, goal: 8500, peak: 119, freeze: true, note: 'Freeze Protected' },
    { offset: -6, steps: 9140, goal: 8500, peak: 134, freeze: false, note: 'Hardware Sensor' },
    { offset: -5, steps: 8790, goal: 8500, peak: 129, freeze: false, note: 'Hardware + Watch' },
    { offset: -4, steps: 10240, goal: 8750, peak: 148, freeze: false, note: 'Morning Run + Walk' },
    { offset: -3, steps: 9410, goal: 9000, peak: 131, freeze: false, note: 'Hardware Sensor' },
    { offset: -2, steps: 8920, goal: 9000, peak: 121, freeze: true, note: 'Freeze Protected' },
    { offset: -1, steps: 9680, goal: 9250, peak: 138, freeze: false, note: 'Hardware Sensor' },
  ];

  const pastDays: DailySummary[] = templatePast.map((item) => {
    const dateIso = addDaysIso(now, item.offset);
    const avgCadence = Math.max(96, Math.round(item.peak * 0.84));
    const stride = Biomechanics.estimateStrideMeters(profile.heightCm, avgCadence);
    const kcal = Biomechanics.calculateCaloriesDelta(item.steps, avgCadence, profile.weightKg);
    const activeMinutes = Math.round(item.steps / avgCadence);
    const goalHit = item.steps >= item.goal;

    return {
      dateIso,
      steps: item.steps,
      goalSteps: item.goal,
      activeMinutes,
      distanceMeters: item.steps * stride,
      activeCaloriesKcal: kcal,
      peakCadenceSpm: item.peak,
      goalHit,
      freezeUsed: !goalHit && item.freeze,
      sourceNote: item.note,
    };
  });

  const todayIso = formatLocalDateIso(now);
  const pastDesc = [...pastDays].reverse();
  // Create temporary placeholder at index 0 for computeSuggestedGoal (which drops index 0)
  const adaptiveGoal = AdaptiveGoalEngine.computeSuggestedGoal(
    [
      {
        dateIso: todayIso,
        steps: 0,
        goalSteps: profile.baseGoal,
        activeMinutes: 0,
        distanceMeters: 0,
        activeCaloriesKcal: 0,
        peakCadenceSpm: 0,
        goalHit: false,
        freezeUsed: false,
      },
      ...pastDesc,
    ],
    profile.baseGoal
  );

  const todaySteps = 5420;
  const todayCadence = 116;
  const todayStride = Biomechanics.estimateStrideMeters(profile.heightCm, todayCadence);
  const todayKcal = Biomechanics.calculateCaloriesDelta(
    todaySteps,
    todayCadence,
    profile.weightKg
  );

  const todaySummary: DailySummary = {
    dateIso: todayIso,
    steps: todaySteps,
    goalSteps: adaptiveGoal,
    activeMinutes: Math.round(todaySteps / todayCadence),
    distanceMeters: todaySteps * todayStride,
    activeCaloriesKcal: todayKcal,
    peakCadenceSpm: 128,
    goalHit: todaySteps >= adaptiveGoal,
    freezeUsed: false,
    sourceNote: 'Hardware Coprocessor',
  };

  const allDaysDesc = [todaySummary, ...pastDesc];
  const hourlyMap: Record<string, HourlyBucket[]> = {};

  for (const d of allDaysDesc) {
    hourlyMap[d.dateIso] = buildSeedHourly(
      d.dateIso,
      d.steps,
      d.dateIso === todayIso ? Math.max(8, currentHour) : undefined
    );
  }

  return { days: allDaysDesc, hourly: hourlyMap };
}

export interface LocalStoreSnapshot {
  days: DailySummary[];
  hourlyByDate: Record<string, HourlyBucket[]>;
  profile: UserProfile;
  checkpoint: SensorCheckpoint;
}

export const StepRepository = {
  loadSnapshot(): LocalStoreSnapshot {
    let profile: UserProfile = DEFAULT_PROFILE;
    try {
      const rawProfile = localStorage.getItem(STORAGE_KEYS.profile);
      if (rawProfile) {
        profile = { ...DEFAULT_PROFILE, ...JSON.parse(rawProfile) };
      } else {
        localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
      }
    } catch {
      profile = DEFAULT_PROFILE;
    }

    let days: DailySummary[] = [];
    let hourlyByDate: Record<string, HourlyBucket[]> = {};

    try {
      const rawDays = localStorage.getItem(STORAGE_KEYS.days);
      const rawHourly = localStorage.getItem(STORAGE_KEYS.hourly);
      if (rawDays && rawHourly) {
        days = JSON.parse(rawDays);
        hourlyByDate = JSON.parse(rawHourly);
      }
    } catch {
      days = [];
      hourlyByDate = {};
    }

    if (days.length === 0) {
      const seeded = buildSeedData(profile);
      days = seeded.days;
      hourlyByDate = seeded.hourly;
      this.saveDaysAndHourly(days, hourlyByDate);
    }

    // Ensure today's entry always exists if user returns on a new calendar day
    const todayIso = formatLocalDateIso();
    const sortedDesc = [...days].sort((a, b) => b.dateIso.localeCompare(a.dateIso));
    if (!sortedDesc.some((d) => d.dateIso === todayIso)) {
      const adaptiveGoal = AdaptiveGoalEngine.computeSuggestedGoal(
        [
          {
            dateIso: todayIso,
            steps: 0,
            goalSteps: profile.baseGoal,
            activeMinutes: 0,
            distanceMeters: 0,
            activeCaloriesKcal: 0,
            peakCadenceSpm: 0,
            goalHit: false,
            freezeUsed: false,
          },
          ...sortedDesc,
        ],
        profile.baseGoal
      );
      const blankToday: DailySummary = {
        dateIso: todayIso,
        steps: 0,
        goalSteps: adaptiveGoal,
        activeMinutes: 0,
        distanceMeters: 0,
        activeCaloriesKcal: 0,
        peakCadenceSpm: 0,
        goalHit: false,
        freezeUsed: false,
        sourceNote: 'Hardware Coprocessor',
      };
      sortedDesc.unshift(blankToday);
      hourlyByDate[todayIso] = Array.from({ length: 24 }, (_, hour) => ({
        dateIso: todayIso,
        hour,
        steps: 0,
      }));
      this.saveDaysAndHourly(sortedDesc, hourlyByDate);
    }

    let checkpoint: SensorCheckpoint = {
      id: 1,
      lastRawCounter: sortedDesc[0]?.steps ?? 0,
      lastElapsedRealtimeMs: Date.now(),
      activeDateIso: todayIso,
    };

    try {
      const rawCp = localStorage.getItem(STORAGE_KEYS.checkpoint);
      if (rawCp) {
        checkpoint = JSON.parse(rawCp);
      } else {
        localStorage.setItem(STORAGE_KEYS.checkpoint, JSON.stringify(checkpoint));
      }
    } catch {
      // Ignore storage error
    }

    return {
      days: sortedDesc,
      hourlyByDate,
      profile,
      checkpoint,
    };
  },

  saveDaysAndHourly(
    days: DailySummary[],
    hourlyByDate: Record<string, HourlyBucket[]>
  ): void {
    try {
      localStorage.setItem(STORAGE_KEYS.days, JSON.stringify(days));
      localStorage.setItem(STORAGE_KEYS.hourly, JSON.stringify(hourlyByDate));
    } catch {
      // Handle storage quota silently
    }
  },

  saveProfile(profile: UserProfile, currentSnapshot: LocalStoreSnapshot): LocalStoreSnapshot {
    try {
      localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    } catch {
      // Ignore
    }

    const todayIso = formatLocalDateIso();
    const updatedGoal = AdaptiveGoalEngine.computeSuggestedGoal(
      currentSnapshot.days,
      profile.baseGoal
    );

    const updatedDays = currentSnapshot.days.map((day) => {
      if (day.dateIso !== todayIso) return day;
      return {
        ...day,
        goalSteps: updatedGoal,
        goalHit: day.steps >= updatedGoal,
      };
    });

    this.saveDaysAndHourly(updatedDays, currentSnapshot.hourlyByDate);
    return {
      ...currentSnapshot,
      profile,
      days: updatedDays,
    };
  },

  /**
   * Commits validated hardware step delta into today's summary & current hourly bucket.
   */
  commitSteps(
    snapshot: LocalStoreSnapshot,
    delta: number,
    cadenceSpm: number,
    targetHour?: number,
    targetDateIso?: string
  ): LocalStoreSnapshot {
    if (delta <= 0) return snapshot;

    const now = new Date();
    const dateIso = targetDateIso ?? formatLocalDateIso(now);
    const hour = targetHour ?? now.getHours();
    const { profile } = snapshot;

    const stride = Biomechanics.estimateStrideMeters(profile.heightCm, cadenceSpm);
    const kcalDelta = Biomechanics.calculateCaloriesDelta(
      delta,
      cadenceSpm,
      profile.weightKg
    );
    const effectiveSpm = cadenceSpm > 0 ? cadenceSpm : 95;
    const addedMinutes = delta / effectiveSpm;

    let found = false;
    const updatedDays = snapshot.days.map((day) => {
      if (day.dateIso !== dateIso) return day;
      found = true;
      const newSteps = day.steps + delta;
      const newMinutes = Math.round(day.activeMinutes + addedMinutes);
      return {
        ...day,
        steps: newSteps,
        distanceMeters: day.distanceMeters + delta * stride,
        activeCaloriesKcal: day.activeCaloriesKcal + kcalDelta,
        activeMinutes: Math.max(day.activeMinutes, newMinutes),
        peakCadenceSpm: Math.max(day.peakCadenceSpm, cadenceSpm),
        goalHit: newSteps >= day.goalSteps,
      };
    });

    if (!found) {
      const goal = AdaptiveGoalEngine.computeSuggestedGoal(
        snapshot.days,
        profile.baseGoal
      );
      updatedDays.unshift({
        dateIso,
        steps: delta,
        goalSteps: goal,
        activeMinutes: Math.max(1, Math.round(addedMinutes)),
        distanceMeters: delta * stride,
        activeCaloriesKcal: kcalDelta,
        peakCadenceSpm: cadenceSpm,
        goalHit: delta >= goal,
        freezeUsed: false,
        sourceNote: 'Manual / Hardware',
      });
      updatedDays.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
    }

    const existingBuckets =
      snapshot.hourlyByDate[dateIso] ??
      Array.from({ length: 24 }, (_, h) => ({ dateIso, hour: h, steps: 0 }));

    const updatedBuckets = existingBuckets.map((b) =>
      b.hour === hour ? { ...b, steps: b.steps + delta } : b
    );

    const updatedHourly = {
      ...snapshot.hourlyByDate,
      [dateIso]: updatedBuckets,
    };

    const updatedCheckpoint: SensorCheckpoint = {
      id: 1,
      lastRawCounter: snapshot.checkpoint.lastRawCounter + delta,
      lastElapsedRealtimeMs: Date.now(),
      activeDateIso: formatLocalDateIso(now),
    };

    try {
      localStorage.setItem(STORAGE_KEYS.checkpoint, JSON.stringify(updatedCheckpoint));
    } catch {
      // Ignore
    }

    this.saveDaysAndHourly(updatedDays, updatedHourly);

    return {
      ...snapshot,
      days: updatedDays,
      hourlyByDate: updatedHourly,
      checkpoint: updatedCheckpoint,
    };
  },

  /**
   * Reconciles local hardware steps with Health Connect aggregated steps
   * (SPN-compatible without double-counting).
   */
  reconcileWithHealthConnect(
    snapshot: LocalStoreSnapshot,
    hcTotalSteps: number,
    sourceLabel = 'Health Connect SPN'
  ): { nextSnapshot: LocalStoreSnapshot; addedDelta: number } {
    const todayIso = formatLocalDateIso();
    const today = snapshot.days.find((d) => d.dateIso === todayIso);
    if (!today || hcTotalSteps <= today.steps) {
      return { nextSnapshot: snapshot, addedDelta: 0 };
    }

    const extra = hcTotalSteps - today.steps;
    const stride = Biomechanics.estimateStrideMeters(snapshot.profile.heightCm, 100);
    const kcalExtra = Biomechanics.calculateCaloriesDelta(
      extra,
      100,
      snapshot.profile.weightKg
    );

    const updatedDays = snapshot.days.map((day) => {
      if (day.dateIso !== todayIso) return day;
      return {
        ...day,
        steps: hcTotalSteps,
        distanceMeters: day.distanceMeters + extra * stride,
        activeCaloriesKcal: day.activeCaloriesKcal + kcalExtra,
        activeMinutes: day.activeMinutes + Math.max(1, Math.round(extra / 100)),
        goalHit: hcTotalSteps >= day.goalSteps,
        sourceNote: `Hardware + ${sourceLabel}`,
      };
    });

    const currentHour = new Date().getHours();
    const existingBuckets =
      snapshot.hourlyByDate[todayIso] ??
      Array.from({ length: 24 }, (_, h) => ({ dateIso: todayIso, hour: h, steps: 0 }));

    const updatedHourly = {
      ...snapshot.hourlyByDate,
      [todayIso]: existingBuckets.map((b) =>
        b.hour === currentHour ? { ...b, steps: b.steps + extra } : b
      ),
    };

    this.saveDaysAndHourly(updatedDays, updatedHourly);
    return {
      nextSnapshot: {
        ...snapshot,
        days: updatedDays,
        hourlyByDate: updatedHourly,
      },
      addedDelta: extra,
    };
  },

  /**
   * Consumes 1 Freeze Token to protect a missed historical day.
   */
  applyFreezeToken(snapshot: LocalStoreSnapshot, dateIso: string): LocalStoreSnapshot {
    if (snapshot.profile.freezeTokens <= 0) return snapshot;
    const target = snapshot.days.find((d) => d.dateIso === dateIso);
    if (!target || target.goalHit || target.freezeUsed) return snapshot;

    const updatedProfile: UserProfile = {
      ...snapshot.profile,
      freezeTokens: snapshot.profile.freezeTokens - 1,
    };

    const updatedDays = snapshot.days.map((d) =>
      d.dateIso === dateIso
        ? { ...d, freezeUsed: true, sourceNote: 'Freeze Protected' }
        : d
    );

    try {
      localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(updatedProfile));
    } catch {
      // Ignore
    }
    this.saveDaysAndHourly(updatedDays, snapshot.hourlyByDate);

    return {
      ...snapshot,
      profile: updatedProfile,
      days: updatedDays,
    };
  },

  exportOfflineCsv(days: DailySummary[]): string {
    const header =
      'date,steps,goal,active_minutes,distance_km,calories_kcal,peak_cadence_spm,goal_hit,freeze_used';
    const body = days
      .map(
        (d) =>
          `${d.dateIso},${d.steps},${d.goalSteps},${d.activeMinutes},${(
            d.distanceMeters / 1000
          ).toFixed(2)},${d.activeCaloriesKcal.toFixed(1)},${d.peakCadenceSpm},${
            d.goalHit
          },${d.freezeUsed}`
      )
      .join('\n');
    return `${header}\n${body}`;
  },

  importOfflineCsv(
    snapshot: LocalStoreSnapshot,
    csvText: string
  ): { nextSnapshot: LocalStoreSnapshot; importedCount: number } {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return { nextSnapshot: snapshot, importedCount: 0 };
    }

    const startIdx = lines[0].toLowerCase().startsWith('date,') ? 1 : 0;
    const dayMap = new Map<string, DailySummary>(
      snapshot.days.map((d) => [d.dateIso, d])
    );
    const updatedHourly = { ...snapshot.hourlyByDate };
    let importedCount = 0;

    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.length < 3) continue;
      const dateIso = cols[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) continue;

      const steps = Math.max(0, Number(cols[1]) || 0);
      const goalSteps = Math.max(1000, Number(cols[2]) || snapshot.profile.baseGoal);
      const activeMinutes =
        cols[3] !== undefined && cols[3] !== ''
          ? Number(cols[3]) || 0
          : Math.round(steps / 100);
      const distanceMeters =
        cols[4] !== undefined && cols[4] !== ''
          ? (Number(cols[4]) || 0) * 1000
          : steps * Biomechanics.estimateStrideMeters(snapshot.profile.heightCm, 100);
      const activeCaloriesKcal =
        cols[5] !== undefined && cols[5] !== ''
          ? Number(cols[5]) || 0
          : Biomechanics.calculateCaloriesDelta(
              steps,
              100,
              snapshot.profile.weightKg
            );
      const peakCadenceSpm =
        cols[6] !== undefined && cols[6] !== '' ? Number(cols[6]) || 110 : 110;
      const goalHit =
        cols[7] !== undefined ? cols[7].toLowerCase() === 'true' : steps >= goalSteps;
      const freezeUsed =
        cols[8] !== undefined ? cols[8].toLowerCase() === 'true' : false;

      const existing = dayMap.get(dateIso);
      if (!existing || steps >= existing.steps) {
        dayMap.set(dateIso, {
          dateIso,
          steps,
          goalSteps,
          activeMinutes,
          distanceMeters,
          activeCaloriesKcal,
          peakCadenceSpm,
          goalHit,
          freezeUsed,
          sourceNote: 'Imported CSV',
        });
        if (!updatedHourly[dateIso]) {
          updatedHourly[dateIso] = buildSeedHourly(dateIso, steps);
        }
        importedCount++;
      }
    }

    const sortedDesc = Array.from(dayMap.values()).sort((a, b) =>
      b.dateIso.localeCompare(a.dateIso)
    );
    this.saveDaysAndHourly(sortedDesc, updatedHourly);

    return {
      nextSnapshot: {
        ...snapshot,
        days: sortedDesc,
        hourlyByDate: updatedHourly,
      },
      importedCount,
    };
  },

  resetToSeedData(): LocalStoreSnapshot {
    localStorage.removeItem(STORAGE_KEYS.days);
    localStorage.removeItem(STORAGE_KEYS.hourly);
    localStorage.removeItem(STORAGE_KEYS.profile);
    localStorage.removeItem(STORAGE_KEYS.checkpoint);
    return this.loadSnapshot();
  },
};
