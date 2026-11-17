import { useEffect, useState } from 'react';
import { Car, Check, Clock } from 'lucide-react';
import { VIP_PLANS } from '../data/plans';
import type { UserProduct, VipPlan } from '../types';
import { VipPlanCard } from './VipPlanCard';

interface ProductsViewProps {
  plans?: VipPlan[];
  products: UserProduct[];
  onClaimIncome: (productId: string) => Promise<void>;
  onSelectPlan: (plan: VipPlan) => void;
  claimingId: string | null;
  defaultTab?: 'catalog' | 'active';
}

function formatCountdown(msRemaining: number): string {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ProductsView({
  plans,
  products,
  onClaimIncome,
  onSelectPlan,
  claimingId,
  defaultTab = 'catalog',
}: ProductsViewProps) {
  const activePlans = plans && plans.length > 0 ? plans : VIP_PLANS;
  const [subTab, setSubTab] = useState<'catalog' | 'active'>(defaultTab);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    setSubTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-white">আমার পণ্য</h1>
          {subTab === 'active' && (
            <p className="text-xs text-sky-300 mt-0.5">
              প্রতি 24 ঘণ্টা পরপর আপনার সক্রিয় পণ্যের আয় সংগ্রহ করুন
            </p>
          )}
        </div>

        <div className="inline-flex p-1 rounded-full bg-[#101A30] border border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('catalog')}
            className={`px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'catalog'
                ? 'bg-[#0EA5E9] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            VIP প্ল্যান
          </button>
          <button
            type="button"
            onClick={() => setSubTab('active')}
            className={`px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'active'
                ? 'bg-[#0EA5E9] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            আমার পণ্য ({products.length})
          </button>
        </div>
      </div>

      {subTab === 'catalog' ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {activePlans.map((plan) => (
            <VipPlanCard key={plan.id} plan={plan} onSelectPlan={onSelectPlan} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl bg-[#101A30] border border-slate-800 p-8 text-center space-y-3">
          <Car className="w-8 h-8 text-sky-400 mx-auto" />
          <p className="text-sm text-slate-200 font-medium">আপনার কোনো সক্রিয় পণ্য নেই।</p>
          <button
            type="button"
            onClick={() => setSubTab('catalog')}
            className="px-5 py-2.5 min-h-[42px] rounded-full bg-[#0EA5E9] text-white font-semibold text-xs hover:bg-sky-400"
          >
            VIP প্ল্যান দেখুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {products.map((item) => {
            const isCompleted =
              item.status === 'Completed' || item.daysClaimed >= item.validityDays;
            const lastMs = item.lastClaimedAt ? new Date(item.lastClaimedAt).getTime() : 0;
            const nextClaimMs = lastMs + 24 * 3600 * 1000;
            const msRemaining = lastMs ? Math.max(0, nextClaimMs - nowMs) : 0;
            const waiting24h = !isCompleted && msRemaining > 0;
            const progressPct = Math.min(
              100,
              Math.round((item.daysClaimed / item.validityDays) * 100)
            );

            return (
              <article
                key={item.id}
                className="bg-white text-slate-900 rounded-2xl p-4 flex flex-col justify-between gap-3.5"
              >
                <div className="flex gap-3.5">
                  <div className="w-24 aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    <img
                      src={item.image}
                      alt={item.modelName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base font-bold text-slate-950">{item.tier}</h3>
                      <span className="text-xs font-semibold text-sky-600">
                        {isCompleted ? 'সম্পন্ন' : 'সক্রিয়'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mb-1.5">{item.modelName}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">দৈনিক আয়</span>
                      <span className="font-mono font-bold text-red-600 tabular-nums">
                        {item.dailyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })} BDT
                      </span>
                    </div>
                  </div>
                </div>

                {!isCompleted && (
                  <div className="rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>24 ঘণ্টার রিমাইন্ডার</span>
                    </div>
                    <span className="font-mono font-bold text-slate-950 tabular-nums">
                      {waiting24h ? formatCountdown(msRemaining) : 'ক্লেইম প্রস্তুত'}
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>মেয়াদ প্রগ্রেস</span>
                    <span className="font-mono font-medium tabular-nums">
                      দিন {item.daysClaimed} / {item.validityDays}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-[#0EA5E9] rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={waiting24h || isCompleted || claimingId === item.id}
                  onClick={() => onClaimIncome(item.id)}
                  className={`w-full min-h-[42px] py-2 px-4 rounded-full font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    waiting24h || isCompleted
                      ? 'bg-slate-100 text-slate-500 border border-slate-200'
                      : 'bg-[#0B1221] text-white hover:bg-[#16213B] active:scale-[0.98]'
                  }`}
                >
                  {claimingId === item.id ? (
                    'প্রসেসিং হচ্ছে...'
                  ) : isCompleted ? (
                    'মেয়াদ সম্পন্ন'
                  ) : waiting24h ? (
                    <>
                      <Check className="w-4 h-4" />
                      24 ঘণ্টা পর ক্লেইম ({formatCountdown(msRemaining)})
                    </>
                  ) : (
                    `দৈনিক আয় সংগ্রহ করুন · BDT ${item.dailyIncome.toLocaleString('en-US')}`
                  )}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
