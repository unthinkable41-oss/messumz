import { ComparisonEntry } from '../types/step';

export const COMPARISON_ENTRIES: ComparisonEntry[] = [
  {
    criterion: '100% Offline Mode',
    category: 'privacy',
    strideLocal: 'Yes (Zero INTERNET permission)',
    stepsApp: 'Partial (syncs, ads & Pro checks)',
    pacer: 'Partial (social & plans require web)',
    ecosystemHealth: 'Mostly local, tied to OS cloud account',
    googleHealth: 'Cloud-first (Fitbit / Google account)',
    pedometerPlus: 'Yes (local CoreMotion / Watch)',
  },
  {
    criterion: 'Unlimited Offline History',
    category: 'privacy',
    strideLocal: 'Yes (Local Room SQLite + CSV export)',
    stepsApp: 'Free history; deep trends paywalled',
    pacer: 'Account-backed',
    ecosystemHealth: 'Unlimited via OS vendor account',
    googleHealth: 'Cloud-backed (tied to account)',
    pedometerPlus: 'Yes (via Apple HealthKit)',
  },
  {
    criterion: 'Battery Drain',
    category: 'sensors',
    strideLocal: '<2%/day (Hardware coprocessor)',
    stepsApp: '<2%/day (OS sensor)',
    pacer: '~2–4% (higher with GPS workouts)',
    ecosystemHealth: '<2%/day',
    googleHealth: 'Depends on paired wearable',
    pedometerPlus: '<2%/day',
  },
  {
    criterion: '2026 Health Connect SPN Support',
    category: 'sensors',
    strideLocal: 'Yes (aggregate() + direct sensor fallback)',
    stepsApp: 'Yes (Health Connect integration)',
    pacer: 'Yes',
    ecosystemHealth: 'Native ecosystem hub',
    googleHealth: 'Uses Google Health API + Health Connect',
    pedometerPlus: 'iOS-only (HealthKit)',
  },
  {
    criterion: 'Anti-Shake Burst Filtering',
    category: 'intelligence',
    strideLocal: 'Yes (4-step / 3.5s cadence gate)',
    stepsApp: 'Basic OS filtering',
    pacer: 'Adjustable sensitivity modes',
    ecosystemHealth: 'OS-level filtering',
    googleHealth: 'Wearable / OS filtering',
    pedometerPlus: 'OS-level filtering',
  },
  {
    criterion: 'Adaptive Goals & Streak Freeze',
    category: 'intelligence',
    strideLocal: 'Yes (On-device 7-day rolling + Freeze)',
    stepsApp: 'Static daily goal',
    pacer: 'Guided plans (mostly Pro)',
    ecosystemHealth: 'Static / manual goals',
    googleHealth: 'Readiness / daily targets',
    pedometerPlus: 'Basic streak tracking',
  },
  {
    criterion: 'Privacy & Ads',
    category: 'privacy',
    strideLocal: 'Zero ads, zero trackers, zero GPS',
    stepsApp: 'Freemium, usage analytics',
    pacer: 'Freemium, community & data profile',
    ecosystemHealth: 'Vendor telemetry (Samsung / Apple)',
    googleHealth: 'Google ecosystem telemetry',
    pedometerPlus: 'Strong (minimalist privacy)',
  },
  {
    criterion: 'Pricing Model',
    category: 'ecosystem',
    strideLocal: '100% Free / Open Architecture',
    stepsApp: 'Freemium (~$30–$40/yr Pro)',
    pacer: 'Freemium (~$40–$50/yr Pro)',
    ecosystemHealth: 'Free (hardware ecosystem lock-in)',
    googleHealth: 'Free + Premium tier',
    pedometerPlus: 'Free + optional tip / Pro',
  },
];

export const ARCHITECTURE_PILLARS = [
  {
    index: '01',
    title: 'Zero-Internet Privacy Architecture',
    summary:
      'android.permission.INTERNET is completely omitted from AndroidManifest.xml. The OS kernel blocks all outbound sockets—making ad SDKs, telemetry, and cloud leaks structurally impossible.',
    spec: 'AndroidManifest.xml · No INTERNET · No ACCESS_FINE_LOCATION',
  },
  {
    index: '02',
    title: 'Dual-Source Step Fusion (Hardware + Health Connect 1.1.0)',
    summary:
      'Pairs Sensor.TYPE_STEP_COUNTER (<2% battery/day, reboot-safe elapsedRealtime delta checks) with Health Connect aggregate() without DataOrigin filtering—automatically supporting the June 2026 Synthetic Package Name (SPN) update.',
    spec: 'Android 8.0+ fallback · Android 14+ Ext 20+ native SPN reconciliation',
  },
  {
    index: '03',
    title: 'Anti-Shake Burst Filtering (Sensor.TYPE_STEP_DETECTOR)',
    summary:
      'Car vibrations and pocket jiggles trigger spurious sensor ticks. A sliding-window cadence gate requires 4+ rhythmic steps within 3.5 seconds before unlocking active cadence and biomechanics.',
    spec: 'CadenceBurstFilter(minBurstSteps = 4, windowMs = 3_500L)',
  },
  {
    index: '04',
    title: 'Unlimited Room SQLite + Adaptive Goal Engine',
    summary:
      'Beats the 30-day Health Connect history cliff by archiving hourly buckets forever in local SQLite. Scales tomorrow’s goal via a 7-day rolling median (+5% overload or -5% recovery) with Freeze Tokens.',
    spec: 'Room 2.7.0 · Jetpack Glance 1.1.1 · iOS CMPedometer / SwiftData parity',
  },
];

export const KOTLIN_MANIFEST_SNIPPET = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Hardware Motion Coprocessor (Android 10+) -->
    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
    <!-- Optional: Health Connect aggregated steps (Android 14+ native & wearables) -->
    <uses-permission android:name="android.permission.health.READ_STEPS" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <!-- Notice: No INTERNET or ACCESS_FINE_LOCATION permissions -->
</manifest>`;

export const IOS_PARITY_NOTE = `// iOS / SwiftUI Parity
// Replace Sensor.TYPE_STEP_COUNTER + Health Connect with CoreMotion:
// CMPedometer().startUpdates(from: startOfDay) { data, _ in ... }
// CMPedometer().queryPedometerData(from: start, to: end) { ... }
// Persist hourly buckets in SwiftData and render the home widget via WidgetKit.`;
