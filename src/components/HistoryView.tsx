import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileJson,
  MinusCircle,
  Plus,
  RotateCcw,
  Search,
  Snowflake,
  Upload,
} from 'lucide-react';
import { DailySummary } from '../types/step';
import { formatLocalDateIso } from '../data/stepRepository';

interface HistoryViewProps {
  days: DailySummary[];
  freezeTokens: number;
  onApplyFreeze: (dateIso: string) => void;
  onLogBout: (dateIso: string, hour: number, steps: number, cadenceSpm: number) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportCsv: (csvText: string) => void;
  onResetArchive: () => void;
}

type HistoryFilter = 'all' | 'hit' | 'freeze' | 'missed';

export const HistoryView: React.FC<HistoryViewProps> = ({
  days,
  freezeTokens,
  onApplyFreeze,
  onLogBout,
  onExportCsv,
  onExportJson,
  onImportCsv,
  onResetArchive,
}) => {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);

  const [boutDate, setBoutDate] = useState(() => formatLocalDateIso());
  const [boutHour, setBoutHour] = useState(() => String(new Date().getHours()));
  const [boutSteps, setBoutSteps] = useState('1200');
  const [boutCadence, setBoutCadence] = useState('118');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const todayIso = formatLocalDateIso();

  const filteredDays = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return days.filter((d) => {
      if (filter === 'hit' && !d.goalHit) return false;
      if (filter === 'freeze' && !d.freezeUsed) return false;
      if (filter === 'missed' && (d.goalHit || d.freezeUsed)) return false;

      if (q) {
        const hay = `${d.dateIso} ${d.sourceNote ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [days, filter, searchQuery]);

  const totalStepsArchive = useMemo(
    () => days.reduce((sum, d) => sum + d.steps, 0),
    [days]
  );

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const steps = Math.max(1, Math.min(50000, Math.round(Number(boutSteps) || 0)));
    const cadence = Math.max(40, Math.min(220, Math.round(Number(boutCadence) || 100)));
    const hour = Math.max(0, Math.min(23, Math.round(Number(boutHour) || 0)));
    onLogBout(boutDate, hour, steps, cadence);
    setShowLogForm(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportCsv(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header & Offline Backup Controls */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Unlimited Offline History
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {days.length} archived days · {totalStepsArchive.toLocaleString()} cumulative local steps · {freezeTokens} Freeze Tokens remaining
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowLogForm((v) => !v)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Log Walk Bout
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={onExportJson}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Import CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={onResetArchive}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 whitespace-nowrap"
              title="Restore initial 14-day sample archive"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset Sample
            </button>
          </div>
        </div>

        {/* Inline Log Walk Bout Form */}
        {showLogForm && (
          <form
            onSubmit={handleLogSubmit}
            className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-5 sm:items-end"
          >
            <div>
              <label htmlFor="bout-date" className="block text-xs font-medium text-slate-700">
                Date
              </label>
              <input
                id="bout-date"
                type="date"
                value={boutDate}
                onChange={(e) => setBoutDate(e.target.value)}
                required
                className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="bout-hour" className="block text-xs font-medium text-slate-700">
                Hour (0–23)
              </label>
              <input
                id="bout-hour"
                type="number"
                min={0}
                max={23}
                value={boutHour}
                onChange={(e) => setBoutHour(e.target.value)}
                required
                className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="bout-steps" className="block text-xs font-medium text-slate-700">
                Steps
              </label>
              <input
                id="bout-steps"
                type="number"
                min={1}
                max={50000}
                value={boutSteps}
                onChange={(e) => setBoutSteps(e.target.value)}
                required
                className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="bout-cadence" className="block text-xs font-medium text-slate-700">
                Cadence (spm)
              </label>
              <input
                id="bout-cadence"
                type="number"
                min={40}
                max={220}
                value={boutCadence}
                onChange={(e) => setBoutCadence(e.target.value)}
                required
                className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="min-h-[40px] flex-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
              >
                Save Bout
              </button>
              <button
                type="button"
                onClick={() => setShowLogForm(false)}
                className="min-h-[40px] rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Filter Bar & Search */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="group"
            aria-label="Filter history by goal status"
            className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            {(
              [
                { id: 'all', label: 'All Days' },
                { id: 'hit', label: 'Goal Hit' },
                { id: 'freeze', label: 'Freeze Protected' },
                { id: 'missed', label: 'Below Target' },
              ] as { id: HistoryFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by date or source..."
              aria-label="Filter history by date or source"
              className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* High-Density Local SQLite Ledger Table */}
        {filteredDays.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              No archived days match the current filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setSearchQuery('');
              }}
              className="mt-3 min-h-[40px] rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Steps</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Adaptive Goal</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Distance</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Active Cal</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Peak Cadence</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Streak Protection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDays.map((day) => {
                  const canFreeze =
                    day.dateIso !== todayIso &&
                    !day.goalHit &&
                    !day.freezeUsed &&
                    freezeTokens > 0;

                  return (
                    <tr
                      key={day.dateIso}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                          {day.dateIso}
                          {day.dateIso === todayIso ? ' (Today)' : ''}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {day.sourceNote ?? 'Hardware Coprocessor'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {day.steps.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {day.goalSteps.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {(day.distanceMeters / 1000).toFixed(2)} km
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {Math.round(day.activeCaloriesKcal)} kcal
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {day.peakCadenceSpm} spm
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {day.goalHit ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Goal Hit
                          </span>
                        ) : day.freezeUsed ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                            <Snowflake className="h-3.5 w-3.5" aria-hidden="true" />
                            Freeze Used
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            {day.dateIso === todayIso ? 'In Progress' : 'Below Goal'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {canFreeze ? (
                          <button
                            type="button"
                            onClick={() => onApplyFreeze(day.dateIso)}
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
                          >
                            <Snowflake className="h-3 w-3" aria-hidden="true" />
                            Apply Freeze
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
