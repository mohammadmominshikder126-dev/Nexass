import { useState } from 'react';
import { Car } from 'lucide-react';
import type { VipPlan } from '../types';

interface VipPlanCardProps {
  plan: VipPlan;
  onSelectPlan: (plan: VipPlan) => void;
}

export function VipPlanCard({ plan, onSelectPlan }: VipPlanCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="bg-white text-slate-900 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm">
      <div>
        <h3 className="font-display text-sm sm:text-base font-extrabold text-center tracking-tight text-slate-950 mb-2">
          {plan.tier}
        </h3>

        <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-slate-100 mb-3 border border-slate-200/80">
          {!imgError ? (
            <img
              src={plan.image}
              alt={`${plan.tier} ${plan.modelName}`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B1221] text-slate-200 gap-1">
              <Car className="w-6 h-6" />
              <span className="text-[11px] font-medium">{plan.tier}</span>
            </div>
          )}
        </div>

        <div className="space-y-1 text-[11px] sm:text-xs leading-snug mb-3.5 text-slate-800">
          <p>
            <span className="text-red-600 font-semibold">দৈনিক </span>
            <span className="text-slate-900 font-semibold">আয়: </span>
            <span className="font-mono font-bold text-red-600 tabular-nums">
              {plan.dailyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })} BDT
            </span>
          </p>
          <div>
            <span className="text-slate-900 font-semibold block">মোট আয়:</span>
            <span className="font-mono font-bold text-red-600 tabular-nums">
              {plan.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })} BDT
            </span>
          </div>
          <p>
            <span className="text-slate-900 font-semibold">মেয়াদ: </span>
            <span className="font-bold text-red-600 tabular-nums">{plan.validityDays} দিন</span>
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelectPlan(plan)}
        className="w-full min-h-[40px] py-2 px-3 rounded-full bg-[#0B1221] text-white hover:bg-[#16213B] active:scale-[0.98] transition-all font-mono text-xs sm:text-sm font-bold tabular-nums whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]"
      >
        BDT {plan.price.toLocaleString('en-US')}
      </button>
    </article>
  );
}
