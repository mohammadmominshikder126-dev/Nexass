import { useState } from 'react';
import { Check, Copy, Share2, Users } from 'lucide-react';
import type { TeamMember, UserProfile } from '../types';

interface TeamViewProps {
  user: UserProfile;
  team: TeamMember[];
}

export function TeamView({ user, team }: TeamViewProps) {
  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);
  const [levelFilter, setLevelFilter] = useState<'all' | 1 | 2 | 3>('all');

  const referralLink = `${window.location.origin}/?ref=${user.referralCode}`;

  const copyText = async (value: string, field: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      setCopiedField(null);
    }
  };

  const levelStats = ([1, 2, 3] as const).map((lvl) => {
    const members = team.filter((m) => m.level === lvl);
    const validCount = members.filter((m) => m.validVip).length;
    const earnings = members.reduce((sum, m) => sum + m.commissionEarned, 0);
    const rate = lvl === 1 ? '25%' : lvl === 2 ? '2%' : '1%';
    return { level: lvl, rate, validCount, totalCount: members.length, earnings };
  });

  const totalValidUsers = team.filter((m) => m.validVip).length;
  const filteredTeam =
    levelFilter === 'all' ? team : team.filter((m) => m.level === levelFilter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
          আমার টিম ও রেফারেল
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          বন্ধুদের আমন্ত্রণ জানান এবং 3 স্তর পর্যন্ত VIP বিনিয়োগ কমিশন আয় করুন।
        </p>
      </div>

      {/* Referral Invite Card */}
      <section className="bg-white text-slate-900 rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">আপনার আমন্ত্রণ কোড</p>
            <p className="font-mono text-2xl sm:text-3xl font-bold tracking-wider text-slate-950">
              {user.referralCode}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copyText(user.referralCode, 'code')}
            className="min-h-[42px] px-4 py-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all shrink-0"
          >
            {copiedField === 'code' ? (
              <>
                <Check className="w-4 h-4" />
                কপি হয়েছে
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                কোড কপি করুন
              </>
            )}
          </button>
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs font-mono text-slate-600 truncate">{referralLink}</p>
          <button
            type="button"
            onClick={() => copyText(referralLink, 'link')}
            className="min-h-[38px] px-3.5 py-2 rounded-full border border-slate-300 text-slate-900 text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-colors shrink-0"
          >
            {copiedField === 'link' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                লিংক কপি হয়েছে
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                ইনভাইট লিংক কপি করুন
              </>
            )}
          </button>
        </div>
      </section>

      {/* Valid Users & Invited Earnings KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#101A30] border border-slate-800 p-4 text-center">
          <p className="font-mono text-2xl font-bold text-white tabular-nums">{totalValidUsers}</p>
          <p className="text-xs text-slate-400 mt-1">বৈধ ইউজার</p>
        </div>
        <div className="rounded-2xl bg-[#101A30] border border-slate-800 p-4 text-center">
          <p className="font-mono text-2xl font-bold text-white tabular-nums">
            BDT {user.invitedEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">রেফারেল আয়</p>
        </div>
      </div>

      {/* 3-Level Commission Table */}
      <section className="rounded-2xl bg-[#101A30] border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-3 px-4 sm:px-6 py-3.5 border-b border-slate-800 text-xs font-medium text-slate-400">
          <span>কমিশন রেট</span>
          <span className="text-center">বৈধ ইউজার</span>
          <span className="text-right">আয়</span>
        </div>
        <div className="divide-y divide-slate-800/80">
          {levelStats.map((row) => (
            <div key={row.level} className="grid grid-cols-3 items-center px-4 sm:px-6 py-3.5 text-sm">
              <span className="font-medium text-white">
                লেভেল {row.level} টিম ({row.rate})
              </span>
              <span className="text-center font-mono text-slate-200 tabular-nums">
                {row.validCount}
              </span>
              <span className="text-right font-mono font-semibold text-sky-400 tabular-nums">
                {row.earnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Member Directory */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-white">রেফারকৃত সদস্যবৃন্দ</h2>
          <div className="inline-flex p-1 rounded-full bg-[#101A30] border border-slate-800 self-start">
            {(['all', 1, 2, 3] as const).map((lvl) => (
              <button
                key={String(lvl)}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1.5 min-h-[34px] rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  levelFilter === lvl ? 'bg-[#0EA5E9] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lvl === 'all' ? 'সব' : `লেভেল ${lvl}`}
              </button>
            ))}
          </div>
        </div>

        {filteredTeam.length === 0 ? (
          <div className="rounded-2xl bg-[#101A30] border border-slate-800 p-8 text-center">
            <Users className="w-7 h-7 text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              এই স্তরে এখনো কোনো সদস্য নেই। আপনার রেফারেল কোড শেয়ার করে টিম তৈরি করুন।
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#101A30] border border-slate-800 divide-y divide-slate-800/80">
            {filteredTeam.map((member) => (
              <div key={member.id} className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-sm font-medium text-white">{member.phone}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    লেভেল {member.level} · যোগদান {new Date(member.joinedAt).toLocaleDateString('en-GB')} ·{' '}
                    {member.validVip ? 'VIP সক্রিয়' : 'প্ল্যান পেন্ডিং'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-semibold text-sky-400 tabular-nums">
                    +BDT {member.commissionEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    বিনিয়োগ: {member.totalInvested.toLocaleString('en-US')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
