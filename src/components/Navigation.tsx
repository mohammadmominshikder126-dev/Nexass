import { Bell, Car, Home, Menu, User, Users } from 'lucide-react';
import type { TabKey } from '../types';
import { BrandMark } from './BrandMark';

interface NavigationProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onOpenMenu: () => void;
  onOpenNotifications: () => void;
  unreadCount?: number;
}

const NAV_ITEMS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'হোম', icon: Home },
  { key: 'products', label: 'আমার পণ্য', icon: Car },
  { key: 'team', label: 'আমার টিম', icon: Users },
  { key: 'profile', label: 'প্রোফাইল', icon: User },
];

export function TopHeader({
  activeTab,
  onSelectTab,
  onOpenMenu,
  onOpenNotifications,
  unreadCount = 0,
}: NavigationProps) {
  return (
    <header className="sticky top-0 z-30 h-14 md:h-16 bg-[#0B1325]/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="মেনু খুলুন"
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F43F5E] to-[#DB2777] text-white flex items-center justify-center shadow-md shadow-rose-950/40 active:scale-95 transition-all shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>

          <nav className="hidden md:flex items-center gap-5" aria-label="প্রধান নেভিগেশন">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectTab(item.key)}
                  className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'text-sky-400 border-b-2 border-sky-400'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2 whitespace-nowrap shrink-0 md:order-first"
        >
          <BrandMark className="w-8 h-7" />
          <span className="font-display text-lg font-extrabold tracking-tight">
            <span className="text-white">Nexas</span>
            <span className="text-[#00D2FF] border-b-2 border-[#00D2FF]/60 pb-0.5">World</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="নোটিফিকেশন"
          className="relative w-10 h-10 rounded-full bg-[#111A2E] border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all shrink-0"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#00D2FF]" />
          )}
        </button>
      </div>
    </header>
  );
}

export function BottomTabBar({
  activeTab,
  onSelectTab,
}: {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}) {
  return (
    <nav
      aria-label="নিচের নেভিগেশন"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B1221]/95 backdrop-blur-md border-t border-slate-800 pb-safe"
    >
      <div className="grid grid-cols-4 h-16 items-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectTab(item.key)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-[#0EA5E9]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
              <span className="text-[11px] font-medium tracking-tight leading-none whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
