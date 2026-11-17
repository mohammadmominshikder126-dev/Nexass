import {
  BarChart3,
  Car,
  ChevronRight,
  CreditCard,
  FileText,
  Gift,
  Headphones,
  LogOut,
  Star,
} from 'lucide-react';
import type { SubPage, TeamMember, UserProfile } from '../types';

interface ProfileViewProps {
  user: UserProfile;
  team: TeamMember[];
  onOpenSubPage: (page: SubPage) => void;
  onOpenProducts: () => void;
  onSignOut: () => void;
}

export function ProfileView({
  user,
  team,
  onOpenSubPage,
  onOpenProducts,
  onSignOut,
}: ProfileViewProps) {
  const levelStats = ([1, 2, 3] as const).map((lvl) => {
    const members = team.filter((m) => m.level === lvl);
    const validCount = members.filter((m) => m.validVip).length;
    const earnings = members.reduce((sum, m) => sum + m.commissionEarned, 0);
    const rate = lvl === 1 ? '25%' : lvl === 2 ? '2%' : '1%';
    return { level: lvl, rate, validCount, earnings };
  });

  const validUsers = team.filter((m) => m.validVip).length;

  const menuRows: { key: SubPage; label: string; icon: typeof Star; iconColor: string }[] = [
    { key: 'salary', label: 'দৈনিক বেতন প্ল্যান', icon: Star, iconColor: 'text-amber-400' },
    { key: 'gift', label: 'গিফট কোড', icon: Gift, iconColor: 'text-rose-500' },
    { key: 'bank-card', label: 'ব্যাংক কার্ড সেটআপ', icon: CreditCard, iconColor: 'text-emerald-400' },
    { key: 'account', label: 'অ্যাকাউন্ট তথ্য', icon: BarChart3, iconColor: 'text-slate-300' },
    { key: 'records', label: 'লেনদেনের রেকর্ড', icon: FileText, iconColor: 'text-sky-400' },
    { key: 'support', label: 'কাস্টমার সার্ভিস', icon: Headphones, iconColor: 'text-cyan-400' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Top Phone Header + Circular Car Button */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div>
          <p className="font-mono text-xl sm:text-2xl font-bold text-white tracking-tight">
            {user.phone}
          </p>
          <p className="text-xs text-slate-400">মোবাইল নম্বর</p>
        </div>

        <button
          type="button"
          onClick={onOpenProducts}
          aria-label="আমার পণ্য"
          className="w-11 h-11 rounded-full bg-[#111A2E] border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shrink-0"
        >
          <Car className="w-5 h-5" />
        </button>
      </div>

      {/* White Dual Balance Card */}
      <section className="bg-white text-slate-900 rounded-2xl grid grid-cols-2 divide-x divide-slate-200">
        <div className="p-4 sm:p-5 text-center">
          <p className="font-mono text-lg sm:text-xl font-bold text-slate-950 tabular-nums">
            BDT {user.rechargeBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">রিচার্জ ব্যালেন্স</p>
        </div>
        <div className="p-4 sm:p-5 text-center">
          <p className="font-mono text-lg sm:text-xl font-bold text-slate-950 tabular-nums">
            BDT {user.withdrawalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">উত্তোলন ব্যালেন্স</p>
        </div>
      </section>

      {/* Dual Pill Buttons: Recharge & Withdraw */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onOpenSubPage('recharge')}
          className="min-h-[44px] py-2.5 px-4 rounded-full bg-[#111A2E] border border-slate-700 text-white font-semibold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all"
        >
          রিচার্জ
        </button>
        <button
          type="button"
          onClick={() => onOpenSubPage('withdraw')}
          className="min-h-[44px] py-2.5 px-4 rounded-full bg-[#111A2E] border border-slate-700 text-white font-semibold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all"
        >
          উত্তোলন
        </button>
      </div>

      {/* Commission Rate Table Card */}
      <section className="rounded-2xl bg-[#101A30] border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-3 px-4 py-3 border-b border-slate-800 text-xs font-medium text-slate-400">
          <span>কমিশন রেট</span>
          <span className="text-center">বৈধ ইউজার</span>
          <span className="text-right">আয়</span>
        </div>
        <div className="divide-y divide-slate-800/70">
          {levelStats.map((row) => (
            <div key={row.level} className="grid grid-cols-3 items-center px-4 py-3 text-xs sm:text-sm">
              <span className="text-slate-200 font-medium">
                লেভেল {row.level} টিম ({row.rate})
              </span>
              <span className="text-center font-mono text-slate-200 tabular-nums">
                {row.validCount}
              </span>
              <span className="text-right font-mono font-semibold text-white tabular-nums">
                {row.earnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Valid Users & Invited Earnings Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#101A30] border border-slate-800 p-4 text-center">
          <p className="font-mono text-xl font-bold text-white tabular-nums">{validUsers}</p>
          <p className="text-xs text-slate-400 mt-0.5">বৈধ ইউজার</p>
        </div>
        <div className="rounded-2xl bg-[#101A30] border border-slate-800 p-4 text-center">
          <p className="font-mono text-xl font-bold text-white tabular-nums">
            BDT {user.invitedEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">রেফারেল আয়</p>
        </div>
      </div>

      {/* Action Menu Card */}
      <section className="rounded-2xl bg-[#101A30] border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
        {menuRows.map((row) => {
          const Icon = row.icon;
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => onOpenSubPage(row.key)}
              className="w-full min-h-[54px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${row.iconColor}`} />
                <span className="text-sm font-medium text-white">{row.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
            </button>
          );
        })}

        <button
          type="button"
          onClick={onSignOut}
          className="w-full min-h-[54px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm font-medium text-slate-300">সাইন আউট / অ্যাকাউন্ট পরিবর্তন</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
        </button>
      </section>
    </div>
  );
}
