export type NavigationTab = 'dashboard' | 'history' | 'biomechanics' | 'comparison';

export interface DailySummary {
  dateIso: string; // YYYY-MM-DD
  steps: number;
  goalSteps: number;
  activeMinutes: number;
  distanceMeters: number;
  activeCaloriesKcal: number;
  peakCadenceSpm: number;
  goalHit: boolean;
  freezeUsed: boolean;
  sourceNote?: string;
}

export interface HourlyBucket {
  dateIso: string;
  hour: number; // 0..23
  steps: number;
}

export interface SensorCheckpoint {
  id: number;
  lastRawCounter: number;
  lastElapsedRealtimeMs: number;
  activeDateIso: string;
}

export interface UserProfile {
  id: number;
  heightCm: number;
  weightKg: number;
  baseGoal: number;
  freezeTokens: number;
}

export interface BurstSampleEvent {
  id: string;
  timestampMs: number;
  timeLabel: string;
  kind: 'rhythmic' | 'filtered_shake' | 'walk_bout' | 'health_connect';
  rawTicks: number;
  committedSteps: number;
  cadenceSpm: number;
  message: string;
}

export interface ComparisonEntry {
  criterion: string;
  category: 'privacy' | 'sensors' | 'intelligence' | 'ecosystem';
  strideLocal: string;
  stepsApp: string;
  pacer: string;
  ecosystemHealth: string;
  googleHealth: string;
  pedometerPlus: string;
}
