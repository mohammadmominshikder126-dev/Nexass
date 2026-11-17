import { useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Gift, Headphones, Star, X } from 'lucide-react';
import { GIFT_CODE_CATALOG } from '../data/plans';
import type { PayoutMethod, TeamMember, TransactionRecord, UserProfile, VipPlan } from '../types';

const TYPE_LABEL_BN: Record<TransactionRecord['type'], string> = {
  Recharge: 'রিচার্জ',
  Withdraw: 'উত্তোলন',
  Investment: 'বিনিয়োগ',
  'Daily Income': 'দৈনিক আয়',
  'Referral Bonus': 'রেফারেল বোনাস',
  'Registration Bonus': 'নিবন্ধন বোনাস',
  'Gift Code': 'গিফট কোড',
  'Daily Salary': 'দৈনিক বেতন',
};

const STATUS_LABEL_BN: Record<TransactionRecord['status'], string> = {
  Completed: 'সম্পন্ন',
  Processing: 'প্রক্রিয়াধীন',
  Rejected: 'বাতিল',
};

export function AccountDetailsView({
  user,
  onBack,
  onSave,
}: {
  user: UserProfile;
  onBack: () => void;
  onSave: (payload: {
    fullName?: string;
    payoutMethod?: PayoutMethod;
    payoutAccount?: string;
    newPassword?: string;
  }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>(user.payoutMethod);
  const [payoutAccount, setPayoutAccount] = useState(user.payoutAccount);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await onSave({
        fullName,
        payoutMethod,
        payoutAccount,
        newPassword: newPassword.trim() || undefined,
      });
      setNewPassword('');
      setMessage('অ্যাকাউন্ট তথ্য সফলভাবে আপডেট হয়েছে।');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'আপডেট ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white text-zinc-950 rounded-3xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-xl hover:bg-zinc-100"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-bold">অ্যাকাউন্ট তথ্য</h1>
          <span className="w-10" />
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {message && (
            <div className="p-3 rounded-xl bg-zinc-950 text-white text-xs font-medium">
              {message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-100 text-xs">
            <div>
              <span className="text-zinc-500 block">নিবন্ধিত মোবাইল নম্বর</span>
              <span className="font-mono font-semibold text-zinc-950">{user.phone}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">রেফারেল কোড</span>
              <span className="font-mono font-semibold text-zinc-950">{user.referralCode}</span>
            </div>
          </div>

          <div>
            <label htmlFor="acc-name" className="block text-xs font-medium text-zinc-700 mb-1">
              পুরো নাম
            </label>
            <input
              id="acc-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full min-h-[46px] px-4 rounded-xl border border-zinc-300 bg-white text-sm text-zinc-950 focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              ডিফল্ট পেমেন্ট মাধ্যম
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['bKash', 'Nagad', 'USDT-TRC20', 'USDT-BEP20'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayoutMethod(m)}
                  className={`min-h-[42px] px-2 rounded-xl border text-xs font-semibold ${
                    payoutMethod === m
                      ? 'bg-zinc-950 text-white border-zinc-950'
                      : 'bg-white text-zinc-800 border-zinc-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="acc-payout" className="block text-xs font-medium text-zinc-700 mb-1">
              পেমেন্ট অ্যাকাউন্ট / ওয়ালেট অ্যাড্রেস
            </label>
            <input
              id="acc-payout"
              type="text"
              value={payoutAccount}
              onChange={(e) => setPayoutAccount(e.target.value)}
              className="w-full min-h-[46px] px-4 rounded-xl border border-zinc-300 bg-white font-mono text-sm text-zinc-950 focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div>
            <label htmlFor="acc-pw" className="block text-xs font-medium text-zinc-700 mb-1">
              নতুন পাসওয়ার্ড (পরিবর্তন না করলে খালি রাখুন)
            </label>
            <input
              id="acc-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="সর্বনিম্ন 4 অক্ষর"
              className="w-full min-h-[46px] px-4 rounded-xl border border-zinc-300 bg-white text-sm text-zinc-950 focus:outline-none focus:border-zinc-950"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-zinc-950 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors"
          >
            {loading ? 'সেভ হচ্ছে...' : 'পরিবর্তন সেভ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function PaymentRecordView({
  transactions,
  onBack,
}: {
  transactions: TransactionRecord[];
  onBack: () => void;
}) {
  const [filter, setFilter] = useState<'All' | 'Recharge' | 'Withdraw' | 'Investment' | 'Earnings'>(
    'All'
  );

  const filterLabels: Record<typeof filter, string> = {
    All: 'সব',
    Recharge: 'রিচার্জ',
    Withdraw: 'উত্তোলন',
    Investment: 'বিনিয়োগ',
    Earnings: 'আয়',
  };

  const filtered = transactions.filter((t) => {
    if (filter === 'All') return true;
    if (filter === 'Earnings') {
      return (
        t.type === 'Daily Income' ||
        t.type === 'Referral Bonus' ||
        t.type === 'Registration Bonus' ||
        t.type === 'Gift Code' ||
        t.type === 'Daily Salary'
      );
    }
    return t.type === filter;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
              লেনদেনের রেকর্ড
            </h1>
            <p className="text-xs text-zinc-400">সকল ডিপোজিট, উত্তোলন এবং আয়ের তালিকা</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 overflow-x-auto">
        {(['All', 'Recharge', 'Withdraw', 'Investment', 'Earnings'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filter === tab ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {filterLabels[tab]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center text-sm text-zinc-400">
          এই ক্যাটাগরিতে কোনো লেনদেন পাওয়া যায়নি।
        </div>
      ) : (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800/80">
          {filtered.map((txn) => {
            const isOutflow = txn.type === 'Withdraw' || txn.type === 'Investment';
            return (
              <div
                key={txn.id}
                className="px-4 sm:px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{txn.note}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {TYPE_LABEL_BN[txn.type]} · {new Date(txn.createdAt).toLocaleString('en-GB')} ·{' '}
                    {STATUS_LABEL_BN[txn.status]}
                  </p>
                </div>
                <p
                  className={`font-mono text-sm font-bold tabular-nums shrink-0 ${
                    isOutflow ? 'text-zinc-300' : 'text-white'
                  }`}
                >
                  {isOutflow ? '-' : '+'}BDT{' '}
                  {txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PlanConfirmModal({
  plan,
  rechargeBalance,
  onClose,
  onConfirm,
  onGoToRecharge,
}: {
  plan: VipPlan;
  rechargeBalance: number;
  onClose: () => void;
  onConfirm: (planId: string) => Promise<void>;
  onGoToRecharge: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasEnough = rechargeBalance >= plan.price;

  const handleConfirm = async () => {
    setError(null);
    setLoading(true);
    try {
      await onConfirm(plan.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'অ্যাক্টিভেশন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white text-zinc-950 rounded-t-3xl sm:rounded-3xl border border-zinc-200 p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">{plan.tier} অ্যাক্টিভেশন</h2>
            <p className="text-xs text-zinc-500">{plan.modelName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <dl className="rounded-2xl bg-zinc-100 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600">প্ল্যান মূল্য</dt>
            <dd className="font-mono font-bold tabular-nums">
              BDT {plan.price.toLocaleString('en-US')}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-600">দৈনিক আয়</dt>
            <dd className="font-mono font-semibold tabular-nums">
              BDT {plan.dailyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-600">30 দিনে মোট আয়</dt>
            <dd className="font-mono font-semibold tabular-nums">
              BDT {plan.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </dd>
          </div>
          <div className="flex justify-between pt-2 border-t border-zinc-200">
            <dt className="text-zinc-600">আপনার রিচার্জ ব্যালেন্স</dt>
            <dd className="font-mono font-bold tabular-nums">
              BDT {rechargeBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </dd>
          </div>
        </dl>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-zinc-950 text-white text-xs font-medium">
            {error}
          </div>
        )}

        {hasEnough ? (
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className="w-full min-h-[48px] rounded-xl bg-zinc-950 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors"
          >
            {loading ? 'প্ল্যান অ্যাক্টিভ হচ্ছে...' : `নিশ্চিত করুন · BDT ${plan.price.toLocaleString('en-US')}`}
          </button>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs text-zinc-600 text-center">
              রিচার্জ ব্যালেন্স পর্যাপ্ত নয়। এই প্ল্যানটি কিনতে কমপক্ষে আরও{' '}
              <span className="font-mono font-bold">
                {(plan.price - rechargeBalance).toLocaleString('en-US')} BDT
              </span>{' '}
              রিচার্জ করুন।
            </p>
            <button
              type="button"
              onClick={onGoToRecharge}
              className="w-full min-h-[48px] rounded-xl bg-zinc-950 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors"
            >
              এখনই রিচার্জ করুন
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function DailySalaryModal({
  user,
  team,
  onClose,
  onClaim,
}: {
  user: UserProfile;
  team: TeamMember[];
  onClose: () => void;
  onClaim: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const claimedToday = user.lastSalaryClaimDate === today;
  const validCount = team.filter((m) => m.validVip).length;
  const currentReward = validCount >= 10 ? 150 : validCount >= 3 ? 50 : 15;

  const handleClaim = async () => {
    setLoading(true);
    setError(null);
    try {
      await onClaim();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ক্লেইম ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white text-zinc-950 rounded-t-3xl sm:rounded-3xl border border-zinc-200 p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Star className="w-5 h-5 text-zinc-950" />
            <h2 className="font-display text-lg font-bold">দৈনিক বেতন প্ল্যান</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-zinc-100 divide-y divide-zinc-200 text-xs sm:text-sm">
          <div className="p-3.5 flex justify-between">
            <span>0–2 জন বৈধ রেফারেল</span>
            <span className="font-mono font-bold">15 BDT / দিন</span>
          </div>
          <div className="p-3.5 flex justify-between">
            <span>3–9 জন বৈধ রেফারেল</span>
            <span className="font-mono font-bold">50 BDT / দিন</span>
          </div>
          <div className="p-3.5 flex justify-between">
            <span>10+ জন বৈধ রেফারেল</span>
            <span className="font-mono font-bold">150 BDT / দিন</span>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-zinc-950 text-white text-xs font-medium">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={claimedToday || loading}
          onClick={handleClaim}
          className={`w-full min-h-[48px] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${
            claimedToday
              ? 'bg-zinc-100 text-zinc-500 border border-zinc-200'
              : 'bg-zinc-950 text-white hover:bg-zinc-800'
          }`}
        >
          {claimedToday ? (
            <>
              <Check className="w-4 h-4" />
              আজকের বেতন নেওয়া হয়েছে
            </>
          ) : loading ? (
            'যোগ হচ্ছে...'
          ) : (
            `আজকের বেতন ক্লেইম করুন · BDT ${currentReward}`
          )}
        </button>
      </div>
    </div>
  );
}

export function GiftCodeModal({
  redeemedCodes,
  onClose,
  onRedeem,
}: {
  redeemedCodes: string[];
  onClose: () => void;
  onRedeem: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await onRedeem(code);
      setSuccess(`কোড ${code.toUpperCase()} রিডিম হয়ে রিচার্জ ব্যালেন্সে যোগ হয়েছে।`);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'রিডিম ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white text-zinc-950 rounded-t-3xl sm:rounded-3xl border border-zinc-200 p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Gift className="w-5 h-5 text-zinc-950" />
            <h2 className="font-display text-lg font-bold">গিফট কোড রিডিম করুন</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="গিফট কোড লিখুন"
            className="w-full min-h-[46px] px-4 rounded-xl border border-zinc-300 bg-white font-mono text-sm uppercase text-zinc-950 focus:outline-none focus:border-zinc-950"
          />

          <div className="flex flex-wrap gap-2">
            {Object.entries(GIFT_CODE_CATALOG).map(([key, info]) => {
              const used = redeemedCodes.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={used}
                  onClick={() => setCode(key)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono ${
                    used
                      ? 'bg-zinc-100 text-zinc-400 border-zinc-200 line-through'
                      : 'bg-zinc-50 text-zinc-900 border-zinc-300 hover:border-zinc-950'
                  }`}
                >
                  {key} (+{info.amount})
                </button>
              );
            })}
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-zinc-950 text-white text-xs font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-zinc-100 border border-zinc-300 text-zinc-950 text-xs font-medium">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-zinc-950 text-white font-semibold text-sm hover:bg-zinc-800"
          >
            {loading ? 'রিডিম হচ্ছে...' : 'কোড রিডিম করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function BankCardView({
  user,
  onBack,
  onSave,
}: {
  user: UserProfile;
  onBack: () => void;
  onSave: (payload: {
    bankHolderName: string;
    bankName: PayoutMethod;
    bankAccountNumber: string;
  }) => Promise<void>;
}) {
  const [bankHolderName, setBankHolderName] = useState(user.bankHolderName || user.fullName || '');
  const [bankName, setBankName] = useState<PayoutMethod>(
    (user.bankName as PayoutMethod) || 'bKash'
  );
  const [bankAccountNumber, setBankAccountNumber] = useState(user.bankAccountNumber || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await onSave({ bankHolderName, bankName, bankAccountNumber });
      setMessage('ব্যাংক কার্ড সফলভাবে সেটআপ হয়েছে। এখন উত্তোলন করতে পারবেন।');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ব্যাংক কার্ড সেভ ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white text-slate-900 rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[40px] min-w-[40px] -ml-2 flex items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-bold">ব্যাংক কার্ড সেটআপ</h1>
          <span className="w-10" />
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              {message}
            </div>
          )}

          <div>
            <label htmlFor="bc-holder" className="block text-xs font-semibold text-slate-700 mb-1">
              অ্যাকাউন্ট হোল্ডারের নাম
            </label>
            <input
              id="bc-holder"
              type="text"
              required
              value={bankHolderName}
              onChange={(e) => setBankHolderName(e.target.value)}
              placeholder="আপনার পুরো নাম লিখুন"
              className="w-full min-h-[46px] px-4 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ব্যাংক / পেমেন্ট মেথড নির্বাচন করুন
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['bKash', 'Nagad', 'Bank', 'USDT-TRC20', 'USDT-BEP20'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBankName(m)}
                  className={`min-h-[40px] px-2 rounded-xl border text-xs font-semibold ${
                    bankName === m
                      ? 'bg-[#0B1221] text-white border-[#0B1221]'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {m === 'Bank' ? 'ব্যাংক' : m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="bc-num" className="block text-xs font-semibold text-slate-700 mb-1">
              ব্যাংক / মোবাইল ব্যাংকিং নম্বর বা ওয়ালেট
            </label>
            <input
              id="bc-num"
              type="text"
              required
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="01XXXXXXXXX / ব্যাংক অ্যাকাউন্ট নম্বর"
              className="w-full min-h-[46px] px-4 rounded-xl border border-slate-300 bg-white font-mono text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-full bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white font-semibold text-sm hover:opacity-95"
          >
            {loading ? 'সেভ হচ্ছে...' : 'ব্যাংক কার্ড সেভ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function TelegramJoinModal({
  telegramGroupUrl,
  supportUrl,
  welcomeNotice,
  onClose,
}: {
  telegramGroupUrl: string;
  supportUrl: string;
  welcomeNotice: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl border border-slate-200 p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-950">
              টেলিগ্রাম গ্রুপ ও সাপোর্ট সার্ভিসে জয়েন করুন
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">NexasWorld অফিসিয়াল কমিউনিটি</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 bg-slate-100 rounded-2xl p-3.5 leading-relaxed">
          {welcomeNotice || 'অফিসিয়াল আপডেট এবং দ্রুত সাপোর্টের জন্য আমাদের টেলিগ্রাম গ্রুপে জয়েন করুন।'}
        </p>

        <div className="space-y-2.5">
          <a
            href={telegramGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[46px] rounded-full bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95"
          >
            টেলিগ্রাম গ্রুপে জয়েন করুন
          </a>
          <a
            href={supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[46px] rounded-full bg-[#0B1221] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-800"
          >
            <Headphones className="w-4 h-4" />
            টেলিগ্রাম সাপোর্ট সার্ভিস
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[42px] rounded-full border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
          >
            ড্যাশবোর্ডে প্রবেশ করুন
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomerServiceModal({
  telegramGroupUrl,
  supportUrl,
  onClose,
}: {
  telegramGroupUrl?: string;
  supportUrl?: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSent(true);
    setMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white text-zinc-950 rounded-t-3xl sm:rounded-3xl border border-zinc-200 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Headphones className="w-5 h-5 text-blue-600" />
            <h2 className="font-display text-lg font-bold">24/7 কাস্টমার সার্ভিস</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={telegramGroupUrl || 'https://t.me/nexasworld_official'}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[42px] px-3 rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center justify-center text-center"
          >
            টেলিগ্রাম গ্রুপ
          </a>
          <a
            href={supportUrl || 'https://t.me/nexasworld_support'}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[42px] px-3 rounded-xl bg-[#0B1221] text-white text-xs font-semibold flex items-center justify-center text-center"
          >
            লাইভ সাপোর্ট
          </a>
        </div>

        <div className="rounded-2xl bg-zinc-100 p-3.5 space-y-1 text-xs text-zinc-700">
          <p className="font-semibold text-zinc-950">সাপোর্ট সময়: 24/7 লাইভ ডেস্ক</p>
          <p>ডিপোজিট যাচাই সময়: গড়ে 5–10 মিনিট</p>
          <p>উত্তোলন সময়: 15–30 মিনিট (bKash, Nagad, Bank, USDT)</p>
        </div>

        {sent ? (
          <div className="p-4 rounded-2xl bg-zinc-950 text-white text-xs space-y-1">
            <p className="font-semibold">সাপোর্ট মেসেজ পাঠানো হয়েছে</p>
            <p className="text-zinc-300">
              আমাদের প্রতিনিধি আপনার বার্তা পেয়েছেন এবং শীঘ্রই উত্তর দেবেন।
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-3">
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="আপনার ডিপোজিট, উত্তোলন বা VIP প্ল্যান সম্পর্কে লিখুন..."
              className="w-full p-3.5 rounded-xl border border-zinc-300 bg-white text-sm text-zinc-950 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              className="w-full min-h-[46px] rounded-xl bg-[#0B1221] text-white font-semibold text-sm hover:bg-slate-800"
            >
              বার্তা পাঠান
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function SideMenuDrawer({
  user,
  onClose,
  onNavigateTab,
  onOpenSubPage,
  onSignOut,
}: {
  user: UserProfile;
  onClose: () => void;
  onNavigateTab: (tab: 'home' | 'products' | 'team' | 'profile') => void;
  onOpenSubPage: (
    page: 'recharge' | 'withdraw' | 'salary' | 'gift' | 'bank-card' | 'account' | 'records' | 'support'
  ) => void;
  onSignOut: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex">
      <div className="w-72 max-w-[85vw] h-full bg-zinc-950 border-r border-zinc-800 p-5 flex flex-col justify-between">
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <p className="font-display text-base font-bold text-white">NexasWorld</p>
              <p className="font-mono text-xs text-zinc-400">{user.phone}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="মেনু বন্ধ করুন"
              className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1 text-sm">
            {[
              { label: 'হোম', action: () => onNavigateTab('home') },
              { label: 'আমার পণ্য', action: () => onNavigateTab('products') },
              { label: 'আমার টিম', action: () => onNavigateTab('team') },
              { label: 'প্রোফাইল', action: () => onNavigateTab('profile') },
              { label: 'রিচার্জ / ডিপোজিট', action: () => onOpenSubPage('recharge') },
              { label: 'উত্তোলন', action: () => onOpenSubPage('withdraw') },
              { label: 'ব্যাংক কার্ড সেটআপ', action: () => onOpenSubPage('bank-card') },
              { label: 'দৈনিক বেতন প্ল্যান', action: () => onOpenSubPage('salary') },
              { label: 'গিফট কোড', action: () => onOpenSubPage('gift') },
              { label: 'লেনদেনের রেকর্ড', action: () => onOpenSubPage('records') },
              { label: 'কাস্টমার সার্ভিস', action: () => onOpenSubPage('support') },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className="w-full min-h-[40px] px-3 rounded-xl text-left text-zinc-200 hover:bg-zinc-900 hover:text-white font-medium transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            onSignOut();
          }}
          className="w-full min-h-[44px] rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200"
        >
          সাইন আউট
        </button>
      </div>
      <div className="flex-1" onClick={onClose} aria-hidden="true" />
    </div>
  );
}

export function NotificationsDrawer({
  transactions,
  onClose,
}: {
  transactions: TransactionRecord[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white text-black rounded-t-3xl sm:rounded-3xl border border-zinc-200 p-5 space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">নোটিফিকেশন</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="w-9 h-9 rounded-full hover:bg-zinc-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-2.5 pr-1">
          <div className="p-3.5 rounded-2xl bg-zinc-100 text-xs space-y-1">
            <p className="font-bold text-black">VIP প্ল্যান সমূহ সক্রিয়</p>
            <p className="text-zinc-600">
              সকল 30 দিনের অটোমোটিভ VIP বিনিয়োগ প্ল্যানের দৈনিক আয় সরাসরি আপনার উত্তোলন ব্যালেন্সে যোগ হয়।
            </p>
          </div>
          {transactions.slice(0, 5).map((txn) => (
            <div key={txn.id} className="p-3.5 rounded-2xl border border-zinc-200 text-xs space-y-0.5">
              <div className="flex justify-between font-semibold text-black">
                <span>{TYPE_LABEL_BN[txn.type]}</span>
                <span className="font-mono tabular-nums">BDT {txn.amount.toLocaleString('en-US')}</span>
              </div>
              <p className="text-zinc-500">{txn.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
