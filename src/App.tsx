import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BiomechanicsView } from './components/BiomechanicsView';
import { ComparisonView } from './components/ComparisonView';
import { DashboardCharts } from './components/DashboardCharts';
import { HistoryView } from './components/HistoryView';
import { AutoWalkPace, SensorWorkbench } from './components/SensorWorkbench';
import { StepRingCard } from './components/StepRingCard';
import { TopNav } from './components/TopNav';
import {
  formatLocalDateIso,
  LocalStoreSnapshot,
  StepRepository,
} from './data/stepRepository';
import {
  AdaptiveGoalEngine,
  CadenceBurstFilter,
} from './domain/stepIntelligence';
import { BurstSampleEvent, NavigationTab, UserProfile } from './types/step';

const PACE_SPM_MAP: Record<AutoWalkPace, number> = {
  stroll: 85,
  brisk: 122,
  run: 156,
};

function formatTimeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function App() {
  const [snapshot, setSnapshot] = useState<LocalStoreSnapshot>(() =>
    StepRepository.loadSnapshot()
  );
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [liveCadenceSpm, setLiveCadenceSpm] = useState<number>(0);
  const [burstBufferCount, setBurstBufferCount] = useState<number>(0);
  const [pendingBurstSteps, setPendingBurstSteps] = useState<number>(0);
  const [isAutoWalking, setIsAutoWalking] = useState<boolean>(false);
  const [autoPace, setAutoPace] = useState<AutoWalkPace>('brisk');
  const [deviceMotionActive, setDeviceMotionActive] = useState<boolean>(false);
  const [recentEvents, setRecentEvents] = useState<BurstSampleEvent[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOfflineBrowser, setIsOfflineBrowser] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const burstFilterRef = useRef<CadenceBurstFilter>(new CadenceBurstFilter(4, 3500));
  const lastMotionPeakRef = useRef<number>(0);
  const toastTimerRef = useRef<number | null>(null);

  const deviceMotionSupported =
    typeof window !== 'undefined' && 'DeviceMotionEvent' in window;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  const pushEvent = useCallback((event: Omit<BurstSampleEvent, 'id' | 'timeLabel'>) => {
    const entry: BurstSampleEvent = {
      ...event,
      id: `${event.timestampMs}-${Math.random().toString(36).slice(2, 7)}`,
      timeLabel: formatTimeLabel(event.timestampMs),
    };
    setRecentEvents((prev) => [entry, ...prev].slice(0, 8));
  }, []);

  // Monitor browser online/offline state
  useEffect(() => {
    const onOnline = () => setIsOfflineBrowser(false);
    const onOffline = () => setIsOfflineBrowser(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Expire active cadence readout after 3.8s of stillness
  useEffect(() => {
    if (liveCadenceSpm === 0 && burstBufferCount === 0) return;
    const timer = window.setInterval(() => {
      const count = burstFilterRef.current.getBufferCount(Date.now());
      setBurstBufferCount(count);
      if (count < 4) {
        setLiveCadenceSpm(0);
        if (count === 0) {
          setPendingBurstSteps(0);
        }
      }
    }, 600);
    return () => window.clearInterval(timer);
  }, [liveCadenceSpm, burstBufferCount]);

  // Core step-tick handler routed through CadenceBurstFilter
  const processStepTick = useCallback(
    (sourceLabel: string) => {
      const now = Date.now();
      const result = burstFilterRef.current.onStepDetected(now);
      setBurstBufferCount(result.bufferCount);

      if (!result.confirmed) {
        setLiveCadenceSpm(0);
        setPendingBurstSteps((prev) => prev + 1);
        return;
      }

      setLiveCadenceSpm(result.cadenceSpm);
      setPendingBurstSteps((prevPending) => {
        const stepsToCommit = prevPending > 0 ? prevPending + 1 : 1;
        setSnapshot((curr) =>
          StepRepository.commitSteps(curr, stepsToCommit, result.cadenceSpm)
        );
        if (prevPending > 0) {
          pushEvent({
            timestampMs: now,
            kind: 'rhythmic',
            rawTicks: stepsToCommit,
            committedSteps: stepsToCommit,
            cadenceSpm: result.cadenceSpm,
            message: `${sourceLabel}: gate opened (${stepsToCommit} steps @ ${result.cadenceSpm} spm)`,
          });
        }
        return 0;
      });
    },
    [pushEvent]
  );

  // Auto-walk simulation timer
  useEffect(() => {
    if (!isAutoWalking) return;
    const targetSpm = PACE_SPM_MAP[autoPace];
    const intervalMs = Math.round(60000 / targetSpm);

    const timer = window.setInterval(() => {
      processStepTick(`Auto-walk (${autoPace})`);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isAutoWalking, autoPace, processStepTick]);

  // Optional real DeviceMotion accelerometer step detector
  useEffect(() => {
    if (!deviceMotionActive || !deviceMotionSupported) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity ?? event.acceleration;
      if (!acc) return;
      const x = acc.x ?? 0;
      const y = acc.y ?? 0;
      const z = acc.z ?? 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      // Peak threshold ~11.8 m/s² (gravity ~9.8 + walking impulse) with 280ms refractory window
      if (magnitude > 11.8 && now - lastMotionPeakRef.current > 280) {
        lastMotionPeakRef.current = now;
        processStepTick('Accelerometer');
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [deviceMotionActive, deviceMotionSupported, processStepTick]);

  const handleToggleDeviceMotion = async () => {
    if (!deviceMotionSupported) return;

    if (deviceMotionActive) {
      setDeviceMotionActive(false);
      showToast('Phone accelerometer listener stopped.');
      return;
    }

    const dmEvent = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof dmEvent.requestPermission === 'function') {
      try {
        const perm = await dmEvent.requestPermission();
        if (perm !== 'granted') {
          showToast('Motion sensor permission was declined.');
          return;
        }
      } catch {
        showToast('Could not request device motion permission.');
        return;
      }
    }

    setDeviceMotionActive(true);
    showToast('Accelerometer step detector active.');
  };

  const handleTapStep = () => {
    processStepTick('Manual step');
  };

  const handleSimulateShake = () => {
    burstFilterRef.current.reset();
    setPendingBurstSteps(0);
    setLiveCadenceSpm(0);

    // Feed 2 erratic car-bump ticks into the filter (below 4-step threshold)
    const now = Date.now();
    burstFilterRef.current.onStepDetected(now - 900);
    const res = burstFilterRef.current.onStepDetected(now);
    setBurstBufferCount(res.bufferCount);

    pushEvent({
      timestampMs: now,
      kind: 'filtered_shake',
      rawTicks: 2,
      committedSteps: 0,
      cadenceSpm: 0,
      message: 'Car bump / pocket jiggle blocked (2 ticks < 4-step burst gate)',
    });
    showToast('Anti-shake filter blocked 2 erratic vibration ticks.');
  };

  const handleReconcileHealthConnect = (hcTotalSteps: number) => {
    const { nextSnapshot, addedDelta } = StepRepository.reconcileWithHealthConnect(
      snapshot,
      hcTotalSteps
    );
    setSnapshot(nextSnapshot);
    const now = Date.now();

    if (addedDelta > 0) {
      pushEvent({
        timestampMs: now,
        kind: 'health_connect',
        rawTicks: addedDelta,
        committedSteps: addedDelta,
        cadenceSpm: 100,
        message: `Health Connect SPN merged +${addedDelta.toLocaleString()} wearable steps`,
      });
      showToast(`Merged +${addedDelta.toLocaleString()} steps from Health Connect SPN.`);
    } else {
      showToast('Local hardware total already meets or exceeds Health Connect total.');
    }
  };

  const handleExportCsv = () => {
    const csv = StepRepository.exportOfflineCsv(snapshot.days);
    downloadTextFile(
      `stridelocal_history_${formatLocalDateIso()}.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
    showToast(`Exported ${snapshot.days.length} days to offline CSV.`);
  };

  const handleExportJson = () => {
    const json = JSON.stringify(snapshot, null, 2);
    downloadTextFile(
      `stridelocal_backup_${formatLocalDateIso()}.json`,
      json,
      'application/json'
    );
    showToast('Exported complete local JSON backup.');
  };

  const handleImportCsv = (csvText: string) => {
    const { nextSnapshot, importedCount } = StepRepository.importOfflineCsv(
      snapshot,
      csvText
    );
    setSnapshot(nextSnapshot);
    showToast(
      importedCount > 0
        ? `Imported ${importedCount} day records into local storage.`
        : 'No newer CSV records found to import.'
    );
  };

  const handleApplyFreeze = (dateIso: string) => {
    const next = StepRepository.applyFreezeToken(snapshot, dateIso);
    setSnapshot(next);
    showToast(`Applied 1 Freeze Token to ${dateIso}. Streak protected.`);
  };

  const handleLogBout = (
    dateIso: string,
    hour: number,
    steps: number,
    cadenceSpm: number
  ) => {
    const next = StepRepository.commitSteps(snapshot, steps, cadenceSpm, hour, dateIso);
    setSnapshot(next);
    showToast(`Logged ${steps.toLocaleString()} steps on ${dateIso} at ${String(hour).padStart(2, '0')}:00.`);
  };

  const handleSaveProfile = (nextProfile: UserProfile) => {
    const next = StepRepository.saveProfile(nextProfile, snapshot);
    setSnapshot(next);
    showToast('Biomechanics calibration saved locally.');
  };

  const handleResetArchive = () => {
    const reset = StepRepository.resetToSeedData();
    setSnapshot(reset);
    burstFilterRef.current.reset();
    setLiveCadenceSpm(0);
    setBurstBufferCount(0);
    setPendingBurstSteps(0);
    setRecentEvents([]);
    showToast('Restored 14-day sample offline archive.');
  };

  const todayIso = formatLocalDateIso();
  const today = useMemo(
    () =>
      snapshot.days.find((d) => d.dateIso === todayIso) ?? {
        dateIso: todayIso,
        steps: 0,
        goalSteps: snapshot.profile.baseGoal,
        activeMinutes: 0,
        distanceMeters: 0,
        activeCaloriesKcal: 0,
        peakCadenceSpm: 0,
        goalHit: false,
        freezeUsed: false,
      },
    [snapshot.days, snapshot.profile.baseGoal, todayIso]
  );

  const todayHourly = useMemo(
    () =>
      snapshot.hourlyByDate[todayIso] ??
      Array.from({ length: 24 }, (_, hour) => ({
        dateIso: todayIso,
        hour,
        steps: 0,
      })),
    [snapshot.hourlyByDate, todayIso]
  );

  const streakInfo = useMemo(
    () => AdaptiveGoalEngine.computeStreak(snapshot.days),
    [snapshot.days]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-12">
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onExportCsv={handleExportCsv}
      />

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Hero Split: Step Progress Ring + Interactive Dual-Source Sensor Workbench */}
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5 flex flex-col [&>*]:flex-1">
                <StepRingCard
                  today={today}
                  liveCadenceSpm={liveCadenceSpm}
                  isWalkingAuto={isAutoWalking}
                  isOfflineBrowser={isOfflineBrowser}
                />
              </div>
              <div className="lg:col-span-7 flex flex-col [&>*]:flex-1">
                <SensorWorkbench
                  todaySteps={today.steps}
                  burstBufferCount={burstBufferCount}
                  minBurstSteps={4}
                  liveCadenceSpm={liveCadenceSpm}
                  isAutoWalking={isAutoWalking}
                  autoPace={autoPace}
                  deviceMotionActive={deviceMotionActive}
                  deviceMotionSupported={deviceMotionSupported}
                  recentEvents={recentEvents}
                  onTapStep={handleTapStep}
                  onSimulateShake={handleSimulateShake}
                  onToggleAutoWalk={() => setIsAutoWalking((v) => !v)}
                  onChangeAutoPace={setAutoPace}
                  onToggleDeviceMotion={handleToggleDeviceMotion}
                  onReconcileHealthConnect={handleReconcileHealthConnect}
                />
              </div>
            </div>

            {/* Full-Width 4-Column KPI Strip */}
            <section
              aria-label="Daily biomechanics metrics"
              className="grid grid-cols-2 gap-4 lg:grid-cols-4"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium text-slate-500">
                  Distance (Cadence-Scaled)
                </div>
                <div className="mt-1.5 font-display text-2xl font-extrabold text-slate-900 tabular-nums">
                  {(today.distanceMeters / 1000).toFixed(2)} km
                </div>
                <div className="mt-1 text-xs text-slate-500 tabular-nums">
                  {snapshot.profile.heightCm} cm height calibration
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium text-slate-500">
                  Active Calories (MET)
                </div>
                <div className="mt-1.5 font-display text-2xl font-extrabold text-slate-900 tabular-nums">
                  {Math.round(today.activeCaloriesKcal)} kcal
                </div>
                <div className="mt-1 text-xs text-slate-500 tabular-nums">
                  {snapshot.profile.weightKg} kg body mass curve
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium text-slate-500">
                  Active Time &amp; Peak Cadence
                </div>
                <div className="mt-1.5 font-display text-2xl font-extrabold text-slate-900 tabular-nums">
                  {today.activeMinutes} min
                </div>
                <div className="mt-1 text-xs text-slate-500 tabular-nums">
                  Peak {today.peakCadenceSpm} spm today
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-medium text-slate-500">
                  Active Streak &amp; Protection
                </div>
                <div className="mt-1.5 font-display text-2xl font-extrabold text-slate-900 tabular-nums">
                  {streakInfo.streakDays} days
                </div>
                <div className="mt-1 text-xs text-slate-500 tabular-nums">
                  {snapshot.profile.freezeTokens} Freeze Tokens available
                </div>
              </div>
            </section>

            {/* 2-Column Analytics Charts Row */}
            <DashboardCharts
              hourlyBuckets={todayHourly}
              recentDaysDesc={snapshot.days}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryView
            days={snapshot.days}
            freezeTokens={snapshot.profile.freezeTokens}
            onApplyFreeze={handleApplyFreeze}
            onLogBout={handleLogBout}
            onExportCsv={handleExportCsv}
            onExportJson={handleExportJson}
            onImportCsv={handleImportCsv}
            onResetArchive={handleResetArchive}
          />
        )}

        {activeTab === 'biomechanics' && (
          <BiomechanicsView
            profile={snapshot.profile}
            today={today}
            recentDaysDesc={snapshot.days}
            onSaveProfile={handleSaveProfile}
          />
        )}

        {activeTab === 'comparison' && <ComparisonView />}
      </main>

      {/* Quiet Footer */}
      <footer className="mx-auto mt-10 max-w-7xl border-t border-slate-200 px-4 py-6 text-xs text-slate-500 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            StrideLocal · Offline-first step persistence with zero outbound tracking
          </span>
          <span className="tabular-nums">
            Local archive: {snapshot.days.length} days stored
          </span>
        </div>
      </footer>

      {/* Non-intrusive Action Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 right-4 z-50 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg md:bottom-6"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
