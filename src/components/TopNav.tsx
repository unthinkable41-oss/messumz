import React from 'react';
import { Activity, BarChart3, CalendarDays, Download, Sliders } from 'lucide-react';
import { NavigationTab } from '../types/step';

interface TopNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onExportCsv: () => void;
}

const NAV_ITEMS: { id: NavigationTab; label: string; mobileLabel: string; icon: React.ReactNode }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    mobileLabel: 'Today',
    icon: <Activity className="h-5 w-5" aria-hidden="true" />,
  },
  {
    id: 'history',
    label: 'History & Export',
    mobileLabel: 'History',
    icon: <CalendarDays className="h-5 w-5" aria-hidden="true" />,
  },
  {
    id: 'biomechanics',
    label: 'Biomechanics',
    mobileLabel: 'Engine',
    icon: <Sliders className="h-5 w-5" aria-hidden="true" />,
  },
  {
    id: 'comparison',
    label: '2026 Compare',
    mobileLabel: 'Compare',
    icon: <BarChart3 className="h-5 w-5" aria-hidden="true" />,
  },
];

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onSelectTab,
  onExportCsv,
}) => {
  return (
    <>
      {/* Desktop & Mobile Top Header — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-sm"
          >
            StrideLocal
          </button>

          {/* Zone 2: 4 concise single-line text nav links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-4 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-sm ${
                    isActive
                      ? 'text-slate-900 font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-600"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-slate-800 active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (<= 15% mobile viewport height, 44px+ hitboxes) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden"
      >
        <div className="grid h-14 grid-cols-4 items-center">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-150 ${
                  isActive ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                }`}
              >
                {item.icon}
                <span className="truncate max-w-[72px]">{item.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
