import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Banknote,
  Check,
  ChevronLeft,
  Copy,
  CreditCard,
  Gift,
  Heart,
  Lightbulb,
  PiggyBank,
  PlusCircle,
  RefreshCw,
  Send,
  ShoppingBag,
  Smartphone,
  Wallet,
  ZoomIn,
  X,
} from 'lucide-react';
import type { PublicAppConfig, UserProduct, UserProfile } from '../types';

const NAGAD_LOGO = '/assets/aistudio/81e759a7c71b86deaf09d2c121cbb651__1__4d682aaf.jpg';
const BKASH_LOGO = '/assets/aistudio/299572c85fd28ca7b86ccb6e62c19c56_22aa8331.jpg';

interface RechargeViewProps {
  user: UserProfile;
  config: PublicAppConfig;
  onBack: () => void;
  onOpenHistory: () => void;
  onRefreshBalance: () => Promise<void>;
  onSubmit: (payload: {
    amount: number;
    method: string;
    channel?: string;
    txId?: string;
    bonusPct?: number;
  }) => Promise<void>;
}

type GatewayMethodId = 'Nagad' | 'bKash' | 'USDT';

interface ChannelOption {
  id: string;
  label: string;
  rangeLabel: string;
  min: number;
  max: number;
  agentNumber: string;
  typeLabel: string;
}

const DEFAULT_CHANNELS: Record<GatewayMethodId, Omit<ChannelOption, 'agentNumber' | 'typeLabel'>[]> = {
  bKash: [
    { id: 'GOPAY-BK', label: 'GOPAY-BK', rangeLabel: 'সীমা: 500 - 50K', min: 500, max: 50000 },
    { id: 'PopoPay-PSBK', label: 'PopoPay-PSBK', rangeLabel: 'সীমা: 500 - 25K', min: 500, max: 25000 },
    { id: 'GoPayPS-BKASH', label: 'GoPayPS-BKASH', rangeLabel: 'সীমা: 500 - 50K', min: 500, max: 50000 },
    { id: 'OPPAY-BK', label: 'OPPAY-BK', rangeLabel: 'সীমা: 500 - 30K', min: 500, max: 30000 },
  ],
  Nagad: [
    { id: 'GOPAY-NG', label: 'GOPAY-NG', rangeLabel: 'সীমা: 500 - 50K', min: 500, max: 50000 },
    { id: 'PopoPay-PSNG', label: 'PopoPay-PSNG', rangeLabel: 'সীমা: 500 - 25K', min: 500, max: 25000 },
    { id: 'OPPAY-NG', label: 'OPPAY-NG', rangeLabel: 'সীমা: 500 - 30K', min: 500, max: 30000 },
    { id: 'SHPAY-NG', label: 'SHPAY-NG', rangeLabel: 'সীমা: 400 - 50K', min: 400, max: 50000 },
  ],
  USDT: [
    { id: 'USDT-TRC20', label: 'USDT-TRC20', rangeLabel: 'সীমা: 500 - 100K (+2%)', min: 500, max: 100000 },
    { id: 'USDT-BEP20', label: 'USDT-BEP20', rangeLabel: 'সীমা: 500 - 100K (+2%)', min: 500, max: 100000 },
  ],
};

const DEPOSIT_AMOUNTS = [500, 1000, 1500, 3500, 5500, 10000, 25000, 50000];

export function RechargeView({
  user,
  config,
  onBack,
  onOpenHistory,
  onRefreshBalance,
  onSubmit,
}: RechargeViewProps) {
  const [step, setStep] = useState<'select' | 'cashier' | 'receipt'>('select');
  const [method, setMethod] = useState<GatewayMethodId>('bKash');
  const [channelId, setChannelId] = useState<string>('GOPAY-BK');
  const [amount, setAmount] = useState<number>(500);
  const [txId, setTxId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [zoomGuide, setZoomGuide] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState<number>(15 * 60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptTxId, setReceiptTxId] = useState<string>('');

  const buildChannelsForMethod = (m: GatewayMethodId): ChannelOption[] => {
    const adminNumbers = config.paymentNumbers.filter((p) => p.method === m);
    const fallbackNumber =
      adminNumbers[0]?.number ||
      (m === 'bKash' || m === 'Nagad'
        ? '01964115795'
        : 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE');

    const baseChannels: ChannelOption[] = DEFAULT_CHANNELS[m].map((ch) => {
      const matchedAdmin = adminNumbers.find(
        (pn) => pn.channelLabel.toUpperCase() === ch.label.toUpperCase()
      );
      return {
        ...ch,
        agentNumber: matchedAdmin?.number || fallbackNumber,
        typeLabel: matchedAdmin?.typeLabel || 'পার্সোনাল (সেন্ড মানি)',
      };
    });

    for (const pn of adminNumbers) {
      if (!baseChannels.some((b) => b.label.toUpperCase() === pn.channelLabel.toUpperCase())) {
        baseChannels.unshift({
          id: pn.id,
          label: pn.channelLabel,
          rangeLabel: 'সীমা: 500 - 50K',
          min: 500,
          max: 50000,
          agentNumber: pn.number,
          typeLabel: pn.typeLabel,
        });
      }
    }
    return baseChannels;
  };

  const channels = buildChannelsForMethod(method);
  const selectedChannel = channels.find((c) => c.id === channelId) || channels[0];

  const handleSelectMethod = (nextMethod: GatewayMethodId) => {
    setMethod(nextMethod);
    const nextList = buildChannelsForMethod(nextMethod);
    const first = nextList[0];
    setChannelId(first.id);
    if (amount < first.min) setAmount(first.min);
    setError(null);
  };

  useEffect(() => {
    if (step !== 'cashier') return;
    setCountdownSec(15 * 60);
    const timer = setInterval(() => {
      setCountdownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshBalance();
    } finally {
      setTimeout(() => setRefreshing(false), 450);
    }
  };

  const handleProceedToCashier = () => {
    setError(null);
    if (!Number.isFinite(amount) || amount < selectedChannel.min || amount > selectedChannel.max) {
      setError(
        `${selectedChannel.label} চ্যানেলের জন্য ডিপোজিট পরিমাণ ${selectedChannel.min.toLocaleString('en-US')} থেকে ${selectedChannel.max.toLocaleString('en-US')} BDT এর মধ্যে হতে হবে।`
      );
      return;
    }
    setStatusMessage(null);
    setStep('cashier');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyAgent = async () => {
    try {
      await navigator.clipboard.writeText(selectedChannel.agentNumber);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 1800);
    } catch {
      setCopiedWallet(false);
    }
  };

  const handleCashierStatusRefresh = () => {
    setStatusMessage(`অর্ডার স্ট্যাটাস আপডেট হয়েছে · ${new Date().toLocaleTimeString('en-US')}`);
  };

  const handleCashierSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanedTx = txId.trim();
    if (cleanedTx.length < 4) {
      setError('TrxID অবশ্যই পূরণ করতে হবে! (কমপক্ষে 4 অক্ষরের TrxID দিন)');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        amount,
        method,
        channel: selectedChannel.label,
        txId: cleanedTx,
        bonusPct: method === 'USDT' ? 2 : 0,
      });
      setReceiptTxId(cleanedTx);
      setStep('receipt');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'পেমেন্ট সাবমিট ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const themeGradient =
    method === 'bKash'
      ? 'from-[#E2136E] to-[#B80D58]'
      : method === 'Nagad'
      ? 'from-[#F15A22] to-[#DC2626]'
      : 'from-[#0E9F6E] to-[#047857]';

  const methodBnLabel = method === 'bKash' ? 'বিকাশ' : method === 'Nagad' ? 'নগদ' : 'USDT';

  // =========================================================================
  // PAGE 2: SEPARATE CASHIER GATEWAY PAGE (Distinct Color per Nagad/bKash)
  // =========================================================================
  if (step === 'cashier') {
    const isCrypto = method === 'USDT';
    const cashierHeaderBg =
      method === 'bKash'
        ? 'bg-[#E2136E]'
        : method === 'Nagad'
        ? 'bg-[#F15A22]'
        : 'bg-[#0A6B3B]';
    const cashierAccentText =
      method === 'bKash'
        ? 'text-[#E2136E]'
        : method === 'Nagad'
        ? 'text-[#F15A22]'
        : 'text-[#0A6B3B]';
    const cashierButtonBg =
      method === 'bKash'
        ? 'bg-[#E2136E] hover:bg-[#C20E5D]'
        : method === 'Nagad'
        ? 'bg-[#F15A22] hover:bg-[#D94A16]'
        : 'bg-[#0A6B3B] hover:bg-[#08552F]';
    const walletMethodTitle =
      method === 'bKash'
        ? 'বিকাশ সেন্ড মানি'
        : method === 'Nagad'
        ? 'নগদ সেন্ড মানি'
        : 'USDT ডিপোজিট (+2% বোনাস)';
    const walletInstruction =
      method === 'bKash'
        ? 'এই বিকাশ পার্সোনাল অ্যাকাউন্টে টাকা পাঠাতে অবশ্যই '
        : method === 'Nagad'
        ? 'এই নগদ পার্সোনাল অ্যাকাউন্টে টাকা পাঠাতে অবশ্যই '
        : 'নিচের ওয়ালেট অ্যাড্রেসে সঠিক পরিমাণ ';

    const guideItems = [
      { label: 'সেন্ড মানি', icon: Send, color: 'text-[#E2136E]', highlight: true },
      { label: 'মোবাইল রিচার্জ', icon: Smartphone, color: 'text-emerald-600', highlight: false },
      { label: 'ক্যাশ আউট', icon: Banknote, color: 'text-cyan-600', highlight: false },
      { label: 'পেমেন্ট', icon: ShoppingBag, color: 'text-amber-500', highlight: false },
      { label: 'অ্যাড মানি', icon: PlusCircle, color: 'text-purple-600', highlight: false },
      { label: 'পে বিল', icon: Lightbulb, color: 'text-amber-500', highlight: false },
      { label: 'সেভিংস', icon: PiggyBank, color: 'text-pink-500', highlight: false },
      { label: 'ডোনেশন', icon: Heart, color: 'text-rose-500', highlight: false },
    ];

    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white text-slate-900 rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
          {/* Top Status Refresh Row */}
          <div className="px-4 py-3 bg-[#F4F6F9] border-b border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCashierStatusRefresh}
              className="px-3.5 py-2 min-h-[38px] rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:scale-[0.98] transition-all shadow-xs"
            >
              স্ট্যাটাস রিফ্রেশ করুন
            </button>
            <button
              type="button"
              onClick={() => setStep('select')}
              className="px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-950 inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              ফিরে যান
            </button>
          </div>

          {statusMessage && (
            <div className="px-4 py-2 bg-slate-100 text-slate-800 text-[11px] font-semibold text-center border-b border-slate-200">
              {statusMessage}
            </div>
          )}

          {/* Distinct Colored Header Banner */}
          <div className={`${cashierHeaderBg} text-white px-5 py-4 flex items-center justify-between gap-4`}>
            <div>
              <p className="font-mono text-xl sm:text-2xl font-extrabold tabular-nums">
                BDT {amount.toLocaleString('en-US')}
              </p>
              <p className="text-xs sm:text-sm font-medium text-white/90 mt-0.5">
                {isCrypto ? 'কম বা বেশি পাঠাবেন না' : 'কম বা বেশি সেন্ড মানি করবেন না'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="inline-flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded bg-white ${cashierAccentText} font-display text-xs font-extrabold`}>
                  পেমেন্ট
                </span>
                <span className="font-display text-sm font-medium tracking-wider">সার্ভিস</span>
              </div>
              <p className="font-mono text-xs text-white/90 tabular-nums mt-1">
                {formatTimer(countdownSec)}
              </p>
            </div>
          </div>

          <form onSubmit={handleCashierSubmit} className="p-4 sm:p-5 space-y-4">
            <p className="text-xs sm:text-sm font-bold text-[#DC2626] leading-snug">
              আপনি যদি টাকার পরিমাণ পরিবর্তন করেন (BDT {amount.toLocaleString('en-US')}), তবে আপনার অ্যাকাউন্টে টাকা যোগ হবে না।
            </p>

            {/* Method Brand Banner with Real Uploaded Logo */}
            <div className={`${cashierHeaderBg} text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm`}>
              <span className="w-11 h-11 rounded-full bg-white overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-xs">
                {method === 'bKash' ? (
                  <img
                    src={BKASH_LOGO}
                    alt="bKash"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : method === 'Nagad' ? (
                  <img
                    src={NAGAD_LOGO}
                    alt="Nagad"
                    className="w-full h-full object-contain rounded-full"
                  />
                ) : (
                  <span className="text-[#0E9F6E] font-bold text-lg">₮</span>
                )}
              </span>
              <div>
                <p className="font-display text-sm sm:text-base font-bold">{walletMethodTitle}</p>
                <p className="text-[11px] text-white/90">
                  চ্যানেল · {selectedChannel.label} ({selectedChannel.typeLabel})
                </p>
              </div>
            </div>

            {/* Wallet No & Copy Box */}
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-900">
                ওয়ালেট নম্বর <span className="text-purple-600">*</span>
              </p>
              <p className="text-xs sm:text-sm text-slate-800">
                {walletInstruction}
                <strong className="text-[#DC2626]">
                  {isCrypto ? 'USDT ট্রান্সফার' : 'সেন্ড মানি'}
                </strong>{' '}
                ব্যবহার করুন
              </p>

              <div className="rounded-xl bg-[#F4F5F7] border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                <span className="font-mono text-base sm:text-lg font-medium text-slate-900 tracking-wide truncate">
                  {selectedChannel.agentNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAgent}
                  aria-label="নম্বর কপি করুন"
                  className={`min-h-[38px] px-2.5 rounded-lg ${cashierAccentText} hover:bg-slate-200/60 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0`}
                >
                  {copiedWallet ? <Check className="w-4 h-4" /> : <Copy className="w-5 h-5" />}
                  <span>{copiedWallet ? 'কপি হয়েছে' : 'কপি'}</span>
                </button>
              </div>
            </div>

            {/* Wallet Send Money Visual Guide */}
            {!isCrypto && (
              <div className="space-y-1.5">
                <div
                  onClick={() => setZoomGuide(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setZoomGuide(true);
                  }}
                  className="relative rounded-2xl border border-slate-200 bg-white p-3 grid grid-cols-4 gap-2 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  {guideItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={`rounded-lg p-2 flex flex-col items-center justify-center gap-1 text-center ${
                          item.highlight
                            ? 'border-2 border-[#DC2626] bg-white shadow-xs'
                            : 'bg-white opacity-75'
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${item.color}`} />
                        <span
                          className={`text-[10px] leading-tight ${
                            item.highlight ? 'font-bold text-slate-900' : 'text-slate-600'
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                  <span className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-slate-600/80 text-white flex items-center justify-center">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </span>
                </div>
                <p className="text-right text-[11px] text-slate-500">গাইডলাইন বড় করে দেখতে ট্যাপ করুন</p>
              </div>
            )}

            {/* Required TrxID Field */}
            <div className="space-y-2 pt-1">
              <label htmlFor="cashier-trxid" className="block text-xs sm:text-sm font-bold text-slate-950">
                {isCrypto ? 'ট্রানজেকশন হ্যাশ / TxID লিখুন ' : 'সেন্ড মানির TrxID নাম্বারটি লিখুন '}
                <span className="text-[#DC2626]">(প্রয়োজন)</span>
              </label>
              <input
                id="cashier-trxid"
                type="text"
                required
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                placeholder="TrxID অবশ্যই পূরণ করতে হবে!"
                className="w-full min-h-[48px] px-4 rounded-xl border-2 border-[#DC2626] bg-white font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full min-h-[50px] rounded-xl ${cashierButtonBg} text-white font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50`}
            >
              {loading ? 'সাবমিট হচ্ছে...' : 'পেমেন্ট নিশ্চিত করুন'}
            </button>
          </form>
        </div>

        {/* Zoomed Send Money Guide Modal */}
        {zoomGuide && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold">কিভাবে সেন্ড মানি করবেন (নির্দেশিকা)</h3>
                <button
                  type="button"
                  onClick={() => setZoomGuide(false)}
                  aria-label="বন্ধ করুন"
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="space-y-2 text-xs text-slate-700 list-decimal list-inside leading-relaxed">
                <li>আপনার {methodBnLabel} অ্যাপ খুলুন এবং <strong>সেন্ড মানি</strong> অপশনে যান।</li>
                <li>পার্সোনাল নম্বর <strong className="font-mono text-slate-950">{selectedChannel.agentNumber}</strong> দিন।</li>
                <li>সঠিক পরিমাণ <strong className="font-mono text-slate-950">BDT {amount.toLocaleString('en-US')}</strong> পাঠিয়ে পিন দিয়ে নিশ্চিত করুন।</li>
                <li>লেনদেন সফল হওয়ার পর প্রাপ্ত <strong>TrxID</strong> কপি করে নিচের ঘরে বসিয়ে সাবমিট করুন।</li>
              </ol>
              <button
                type="button"
                onClick={() => setZoomGuide(false)}
                className={`w-full min-h-[44px] rounded-xl ${cashierButtonBg} text-white text-xs font-semibold`}
              >
                বুঝেছি
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // STEP 3: PENDING ADMIN CONFIRMATION RECEIPT
  // =========================================================================
  if (step === 'receipt') {
    const bonusAmount = method === 'USDT' ? Number(((amount * 2) / 100).toFixed(2)) : 0;
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white text-slate-900 rounded-3xl border border-slate-200 p-6 space-y-5 text-center">
          <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${themeGradient} text-white flex items-center justify-center mx-auto`}>
            <Check className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">ডিপোজিট রিকোয়েস্ট জমা হয়েছে</h1>
            <p className="text-xs text-slate-500 mt-1">
              আপনার ডিপোজিট রিকোয়েস্ট পাঠানো হয়েছে। অ্যাডমিন কনফার্ম করলে ব্যালেন্সে যোগ হবে।
            </p>
          </div>

          <dl className="rounded-2xl bg-slate-100 p-4 space-y-2 text-xs sm:text-sm text-left">
            <div className="flex justify-between">
              <dt className="text-slate-500">মাধ্যম ও চ্যানেল</dt>
              <dd className="font-semibold text-slate-950">
                {methodBnLabel} · {selectedChannel.label}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">পরিমাণ</dt>
              <dd className="font-mono font-bold text-slate-950 tabular-nums">
                BDT {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </dd>
            </div>
            {bonusAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-500">USDT +2% বোনাস</dt>
                <dd className="font-mono font-bold text-emerald-600 tabular-nums">
                  +BDT {bonusAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">TrxID</dt>
              <dd className="font-mono font-semibold text-slate-950">{receiptTxId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">স্ট্যাটাস</dt>
              <dd className="font-semibold text-amber-600">অ্যাডমিন যাচাইয়ের অপেক্ষায়</dd>
            </div>
          </dl>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenHistory}
              className="min-h-[46px] rounded-xl border border-slate-300 text-slate-900 text-xs sm:text-sm font-semibold hover:bg-slate-100"
            >
              ডিপোজিট ইতিহাস
            </button>
            <button
              type="button"
              onClick={onBack}
              className={`min-h-[46px] rounded-xl bg-gradient-to-r ${themeGradient} text-white text-xs sm:text-sm font-semibold hover:opacity-95`}
            >
              সম্পন্ন
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PAGE 1: DEPOSIT METHOD & CHANNEL SELECTION (Color Adapts to Nagad vs bKash)
  // =========================================================================
  return (
    <div className="max-w-lg mx-auto pb-20 sm:pb-6">
      <div className="bg-[#F4F6F9] text-slate-900 rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
        {/* Top Header */}
        <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[40px] min-w-[40px] -ml-1 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-800"
            aria-label="ফিরে যান"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-base sm:text-lg font-bold text-slate-900">ডিপোজিট</h1>
          <button
            type="button"
            onClick={onOpenHistory}
            className="text-xs font-medium text-slate-600 hover:text-slate-950 whitespace-nowrap"
          >
            ডিপোজিট ইতিহাস
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Dynamic Color Balance Banner */}
          <div className={`relative rounded-2xl bg-gradient-to-r ${themeGradient} text-white p-5 overflow-hidden shadow-md`}>
            <div className="flex items-center gap-2 text-xs font-medium text-white/95 mb-2">
              <Wallet className="w-4 h-4 text-amber-300" />
              <span>রিচার্জ ব্যালেন্স</span>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-mono text-2xl sm:text-3xl font-bold tabular-nums">
                ৳{user.rechargeBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <button
                type="button"
                onClick={handleRefresh}
                aria-label="ব্যালেন্স রিফ্রেশ করুন"
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="mt-4 flex justify-end gap-3 font-mono text-xs tracking-widest text-white/75">
              <span>****</span>
              <span>****</span>
            </div>
          </div>

          {/* 3 Method Cards with Uploaded Real Nagad & bKash Logos */}
          <div className="grid grid-cols-3 gap-2.5">
            {(
              [
                { id: 'Nagad', title: 'নগদ (Nagad)', activeClass: 'from-[#F15A22] to-[#DC2626]' },
                { id: 'bKash', title: 'বিকাশ (bKash)', activeClass: 'from-[#E2136E] to-[#B80D58]' },
                { id: 'USDT', title: 'USDT বোনাস', activeClass: 'from-[#0E9F6E] to-[#047857]' },
              ] as const
            ).map((item) => {
              const active = method === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectMethod(item.id)}
                  className={`relative rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 border transition-all min-h-[92px] ${
                    active
                      ? `bg-gradient-to-br ${item.activeClass} text-white border-transparent shadow-md`
                      : 'bg-white text-slate-700 border-slate-100 hover:border-slate-300'
                  }`}
                >
                  {item.id === 'USDT' && (
                    <span className="absolute -top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white text-[10px] font-bold flex items-center gap-0.5 shadow-xs">
                      <Gift className="w-2.5 h-2.5 text-amber-300" />
                      +2%
                    </span>
                  )}
                  <span className="w-11 h-11 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-xs p-1">
                    {item.id === 'Nagad' ? (
                      <img src={NAGAD_LOGO} alt="Nagad" className="w-full h-full object-contain" />
                    ) : item.id === 'bKash' ? (
                      <img src={BKASH_LOGO} alt="bKash" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="w-full h-full rounded-lg bg-[#0E9F6E] text-white font-bold text-lg flex items-center justify-center">
                        ₮
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Select Channel White Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <CreditCard className={`w-4 h-4 ${method === 'Nagad' ? 'text-[#F15A22]' : method === 'bKash' ? 'text-[#E2136E]' : 'text-[#0E9F6E]'}`} />
              <span>চ্যানেল নির্বাচন করুন · শুধুমাত্র সেন্ড মানি</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {channels.map((ch) => {
                const active = selectedChannel.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setChannelId(ch.id);
                      if (amount < ch.min) setAmount(ch.min);
                      setError(null);
                    }}
                    className={`rounded-xl p-3 text-left transition-all ${
                      active
                        ? `bg-gradient-to-r ${themeGradient} text-white shadow-sm`
                        : 'bg-[#F7F8FA] text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-bold truncate">{ch.label}</p>
                    <p
                      className={`text-[11px] font-mono mt-0.5 ${
                        active ? 'text-white/90' : 'text-slate-500'
                      }`}
                    >
                      {ch.rangeLabel}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deposit Amount White Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">ডিপোজিট পরিমাণ</span>
              <span className="text-[11px] font-mono text-slate-500">
                ৳{selectedChannel.min.toLocaleString('en-US')} - ৳{selectedChannel.max.toLocaleString('en-US')}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {DEPOSIT_AMOUNTS.map((preset) => {
                const active = amount === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount(preset);
                      setError(null);
                    }}
                    className={`min-h-[38px] rounded-xl font-mono text-xs font-semibold tabular-nums transition-all ${
                      active
                        ? `bg-gradient-to-r ${themeGradient} text-white`
                        : 'bg-[#F7F8FA] text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ৳{preset >= 1000 ? `${preset / 1000}K` : preset}
                  </button>
                );
              })}
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 font-mono text-base font-bold text-slate-900">৳</span>
              <input
                type="number"
                min={selectedChannel.min}
                max={selectedChannel.max}
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full min-h-[44px] pl-9 pr-4 rounded-xl border border-slate-200 bg-[#F7F8FA] font-mono text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:border-slate-900"
              />
            </div>

            {error && (
              <div role="alert" className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Deposit Summary Bar */}
        <div className="bg-white border-t border-slate-200 px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">রিচার্জ মাধ্যম · {methodBnLabel} (সেন্ড মানি)</p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              চ্যানেল · {selectedChannel.label}
            </p>
          </div>
          <button
            type="button"
            onClick={handleProceedToCashier}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r ${themeGradient} text-white font-mono text-xs sm:text-sm font-bold hover:opacity-95 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 shadow-md`}
          >
            ডিপোজিট ৳{Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </button>
        </div>
      </div>
    </div>
  );
}

interface WithdrawViewProps {
  user: UserProfile;
  products: UserProduct[];
  onBack: () => void;
  onGoToPlans: () => void;
  onGoToBankCard: () => void;
  onSubmit: (payload: { amount: number; password: string }) => Promise<void>;
}

export function WithdrawView({
  user,
  products,
  onBack,
  onGoToPlans,
  onGoToBankCard,
  onSubmit,
}: WithdrawViewProps) {
  const [amount, setAmount] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPackage = products.length > 0;
  const hasBankCard = Boolean(user.bankCardVerified && user.bankAccountNumber);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount < 200) {
      setError('সর্বনিম্ন উত্তোলন 200 BDT।');
      return;
    }
    if (numAmount > user.withdrawalBalance) {
      setError('উত্তোলন ব্যালেন্স পর্যাপ্ত নয়।');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ amount: numAmount, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'উত্তোলন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white text-slate-900 rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-900"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-base sm:text-lg font-bold">উত্তোলন</h1>
          <span className="w-10" />
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-gradient-to-r from-[#0B1325] to-[#1E3A8A] text-white p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-sky-200">উত্তোলন ব্যালেন্স</p>
              <p className="font-mono text-xl font-bold tabular-nums">
                BDT {user.withdrawalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            {hasPackage && hasBankCard && (
              <button
                type="button"
                onClick={() => setAmount(String(Math.floor(user.withdrawalBalance)))}
                className="min-h-[34px] px-3 rounded-full bg-white text-slate-950 text-xs font-bold"
              >
                সর্বোচ্চ
              </button>
            )}
          </div>

          {!hasPackage ? (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 space-y-3 text-center">
              <p className="text-xs sm:text-sm font-semibold text-red-700">
                উত্তোলন করতে হলে আগে রিচার্জ করে কমপক্ষে 1 টি VIP প্যাকেজ কিনতে হবে।
              </p>
              <button
                type="button"
                onClick={onGoToPlans}
                className="w-full min-h-[44px] rounded-full bg-[#0B1221] text-white text-xs font-semibold"
              >
                VIP প্যাকেজ দেখুন
              </button>
            </div>
          ) : !hasBankCard ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3 text-center">
              <p className="text-xs sm:text-sm font-semibold text-amber-800">
                উত্তোলন করার আগে আপনার ব্যাংক কার্ড সেটআপ সম্পন্ন করতে হবে।
              </p>
              <button
                type="button"
                onClick={onGoToBankCard}
                className="w-full min-h-[44px] rounded-full bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white text-xs font-semibold"
              >
                ব্যাংক কার্ড সেটআপ করুন
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-2xl bg-slate-100 border border-slate-200 p-3.5 flex items-center justify-between gap-3">
                <div className="text-xs space-y-0.5">
                  <p className="text-slate-500">সংযুক্ত ব্যাংক কার্ড · {user.bankName}</p>
                  <p className="font-mono font-bold text-slate-900">{user.bankAccountNumber}</p>
                  <p className="text-slate-600">{user.bankHolderName}</p>
                </div>
                <button
                  type="button"
                  onClick={onGoToBankCard}
                  className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
                >
                  পরিবর্তন
                </button>
              </div>

              {error && (
                <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <input
                type="number"
                min={200}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="পরিমাণ লিখুন (সর্বনিম্ন 200 BDT)"
                className="w-full min-h-[46px] px-4 rounded-full border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:border-blue-600"
              />

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="লগইন পাসওয়ার্ড (ডেমো: 123456)"
                className="w-full min-h-[46px] px-4 rounded-full border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] rounded-full bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white font-semibold text-sm hover:opacity-95 active:scale-[0.98] transition-all"
              >
                {loading ? 'জমা হচ্ছে...' : 'উত্তোলন নিশ্চিত করুন'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
