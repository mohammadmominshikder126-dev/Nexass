import { useEffect, useState } from 'react';
import { Banknote, Headphones, Wallet } from 'lucide-react';
import { HERO_BANNER_IMAGE, VIP_PLANS } from '../data/plans';
import type { VipPlan } from '../types';
import { VipPlanCard } from './VipPlanCard';

interface HomeViewProps {
  plans?: VipPlan[];
  onSelectPlan: (plan: VipPlan) => void;
  onOpenRecharge: () => void;
  onOpenWithdraw: () => void;
  onOpenSupport: () => void;
}

const SLIDES = [
  {
    title: 'আজই বিনিয়োগ করুন\nআগামীকাল আয় করুন',
    subtitle: 'দৈনিক অটোমেটেড VIP রিটার্ন',
  },
  {
    title: 'দ্রুত ডিপোজিট এবং\nসহজ উত্তোলন',
    subtitle: 'bKash, Nagad এবং USDT সাপোর্টেড',
  },
  {
    title: '3-স্তরের টিম\nরেফারেল পুরস্কার',
    subtitle: 'লেভেল 1-এ 25% পর্যন্ত কমিশন',
  },
];

export function HomeView({
  plans,
  onSelectPlan,
  onOpenRecharge,
  onOpenWithdraw,
  onOpenSupport,
}: HomeViewProps) {
  const activePlans = plans && plans.length > 0 ? plans : VIP_PLANS;
  const [slideIndex, setSlideIndex] = useState(0);
  const [bannerError, setBannerError] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const currentSlide = SLIDES[slideIndex];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Carousel Banner */}
      <section className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0D1528] h-[160px] sm:h-[220px] flex items-center">
        {!bannerError ? (
          <img
            src={HERO_BANNER_IMAGE}
            alt="রেসিং কার ব্যানার"
            referrerPolicy="no-referrer"
            onError={() => setBannerError(true)}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-rose-900 via-[#0B1221] to-sky-900" />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-r from-rose-600/75 via-[#0B1325]/55 to-sky-600/45"
          aria-hidden="true"
        />

        <div className="relative z-10 px-5 sm:px-8 max-w-md">
          <h1 className="font-display text-xl sm:text-3xl font-extrabold text-white leading-tight whitespace-pre-line [text-wrap:balance] drop-shadow">
            {currentSlide.title}
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 mt-1.5">{currentSlide.subtitle}</p>
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`স্লাইড ${idx + 1}`}
              onClick={() => setSlideIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                slideIndex === idx ? 'w-4 bg-[#FACC15]' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* 3 Quick Action Tiles */}
      <section aria-label="দ্রুত অ্যাকশন" className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <button
          type="button"
          onClick={onOpenRecharge}
          className="min-h-[88px] sm:min-h-[96px] rounded-2xl bg-[#101A30] border border-slate-800 hover:border-sky-500/50 active:scale-[0.98] transition-all p-3 flex flex-col items-center justify-center gap-2"
        >
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#2563EB] text-white flex items-center justify-center shadow-md shadow-sky-950/50">
            <Wallet className="w-5 h-5" />
          </span>
          <span className="text-xs font-medium text-slate-100 whitespace-nowrap">রিচার্জ</span>
        </button>

        <button
          type="button"
          onClick={onOpenWithdraw}
          className="min-h-[88px] sm:min-h-[96px] rounded-2xl bg-[#101A30] border border-slate-800 hover:border-sky-500/50 active:scale-[0.98] transition-all p-3 flex flex-col items-center justify-center gap-2"
        >
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#2563EB] text-white flex items-center justify-center shadow-md shadow-sky-950/50">
            <Banknote className="w-5 h-5" />
          </span>
          <span className="text-xs font-medium text-slate-100 whitespace-nowrap">উত্তোলন</span>
        </button>

        <button
          type="button"
          onClick={onOpenSupport}
          className="min-h-[88px] sm:min-h-[96px] rounded-2xl bg-[#101A30] border border-slate-800 hover:border-sky-500/50 active:scale-[0.98] transition-all p-3 flex flex-col items-center justify-center gap-2"
        >
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#2563EB] text-white flex items-center justify-center shadow-md shadow-sky-950/50">
            <Headphones className="w-5 h-5" />
          </span>
          <span className="text-xs font-medium text-slate-100 text-center leading-tight">
            কাস্টমার সার্ভিস
          </span>
        </button>
      </section>

      {/* VIP Investment Plans Grid */}
      <section aria-label="VIP বিনিয়োগ প্ল্যান" className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {activePlans.map((plan) => (
          <VipPlanCard key={plan.id} plan={plan} onSelectPlan={onSelectPlan} />
        ))}
      </section>
    </div>
  );
}
