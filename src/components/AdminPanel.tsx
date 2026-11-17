import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Check,
  Lock,
  LogOut,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  adminAddPaymentNumber,
  adminAdjustBalance,
  adminApproveWithdraw,
  adminConfirmDeposit,
  adminDeletePaymentNumber,
  adminLogin,
  adminRejectDeposit,
  adminRejectWithdraw,
  adminSaveSettings,
  clearStoredAdminKey,
  fetchAdminOverview,
  getStoredAdminKey,
} from '../api';
import {
  adminAdjustBalanceInFirestore,
  adminSaveAppConfigInFirestore,
  adminUpdateDepositStatusInFirestore,
  adminUpdateWithdrawStatusInFirestore,
  isBootstrapAdminUser,
  signInWithGoogle,
  subscribeAuthState,
} from '../firebase';
import type { AdminOverviewData } from '../types';

export function AdminPanel({ onExitToApp }: { onExitToApp: () => void }) {
  const [authorized, setAuthorized] = useState<boolean>(Boolean(getStoredAdminKey()));
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'deposits' | 'users' | 'withdrawals' | 'payments' | 'settings'>(
    'deposits'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  const [adjustTarget, setAdjustTarget] = useState<{
    userId: string;
    phone: string;
    name: string;
    action: 'add' | 'deduct';
  } | null>(null);
  const [adjustWallet, setAdjustWallet] = useState<'recharge' | 'withdrawal'>('recharge');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [newMethod, setNewMethod] = useState<'bKash' | 'Nagad' | 'USDT'>('bKash');
  const [newChannel, setNewChannel] = useState('GOPAY-BK');
  const [newNumber, setNewNumber] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('পার্সোনাল (সেন্ড মানি)');

  const [tgUrl, setTgUrl] = useState('');
  const [supUrl, setSupUrl] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [regBonus, setRegBonus] = useState(150);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((c) => (c === msg ? null : c)), 3000);
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const overview = await fetchAdminOverview();
      setData(overview);
      setTgUrl(overview.config.telegramGroupUrl);
      setSupUrl(overview.config.supportUrl);
      setNoticeText(overview.config.welcomeNotice);
      setRegBonus(overview.config.registrationBonus);
    } catch {
      clearStoredAdminKey();
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeAuthState((user) => setFirebaseUser(user));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadOverview();
    const es = new EventSource('/api/events');
    es.addEventListener('sync', () => {
      loadOverview();
    });
    return () => es.close();
  }, [authorized, loadOverview]);

  const handleConnectGoogleAdmin = async () => {
    try {
      const user = await signInWithGoogle();
      if (!isBootstrapAdminUser(user)) {
        showToast('এই Google অ্যাকাউন্টটি অ্যাডমিন হিসেবে অনুমোদিত নয়।');
        return;
      }
      if (data?.config) {
        await adminSaveAppConfigInFirestore(data.config);
      }
      showToast('Google Admin Firestore সিঙ্ক চালু হয়েছে।');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Google সংযোগ ব্যর্থ হয়েছে');
    }
  };

  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await adminLogin(passcode);
      setAuthorized(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'লগইন ব্যর্থ হয়েছে');
    }
  };

  const handleAdjustSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    try {
      await adminAdjustBalance({
        userId: adjustTarget.userId,
        walletType: adjustWallet,
        action: adjustTarget.action,
        amount: Number(adjustAmount),
        reason: adjustReason,
      });
      await adminAdjustBalanceInFirestore(
        adjustTarget.userId,
        adjustWallet,
        adjustTarget.action,
        Number(adjustAmount)
      );
      setAdjustTarget(null);
      setAdjustAmount('');
      setAdjustReason('');
      await loadOverview();
      showToast('ব্যালেন্স আপডেট করা হয়েছে এবং ইউজার প্যানেলে সিঙ্ক হয়েছে।');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'আপডেট ব্যর্থ হয়েছে');
    }
  };

  const handleAddPaymentNumber = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const updatedConfig = await adminAddPaymentNumber({
        method: newMethod,
        channelLabel: newChannel,
        number: newNumber,
        typeLabel: newTypeLabel,
      });
      await adminSaveAppConfigInFirestore(updatedConfig);
      setNewNumber('');
      await loadOverview();
      showToast('নতুন পেমেন্ট নম্বর যুক্ত হয়েছে।');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ব্যর্থ হয়েছে');
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const updatedConfig = await adminSaveSettings({
        telegramGroupUrl: tgUrl,
        supportUrl: supUrl,
        welcomeNotice: noticeText,
        registrationBonus: Number(regBonus),
      });
      await adminSaveAppConfigInFirestore(updatedConfig);
      await loadOverview();
      showToast('সেটিংস সেভ ও লাইভ আপডেট হয়েছে।');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ব্যর্থ হয়েছে');
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#081123] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-[#0B1221] text-white flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </span>
              <div>
                <h1 className="font-display text-lg font-bold">NexasWorld অ্যাডমিন</h1>
                <p className="text-xs text-slate-500">কন্ট্রোল প্যানেল প্রবেশ</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onExitToApp}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              ইউজার অ্যাপ
            </button>
          </div>

          {authError && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-3.5">
            <div>
              <label htmlFor="adm-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                অ্যাডমিন পাসকোড
              </label>
              <input
                id="adm-pass"
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="পাসকোড লিখুন (ডিফল্ট: admin123)"
                className="w-full min-h-[46px] px-4 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
            <button
              type="submit"
              className="w-full min-h-[46px] rounded-xl bg-[#0B1221] text-white font-semibold text-sm hover:bg-slate-800"
            >
              অ্যাডমিন প্যানেল আনলক করুন
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredUsers = (data?.users || []).filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.phone.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.referralCode.toLowerCase().includes(q)
    );
  });

  const depositStatusBn = {
    Pending: 'অপেক্ষমাণ',
    Confirmed: 'কনফার্মড',
    Rejected: 'বাতিল',
  } as const;

  const withdrawStatusBn = {
    Processing: 'প্রক্রিয়াধীন',
    Approved: 'অ্যাপ্রুভড',
    Rejected: 'ফেরত/বাতিল',
  } as const;

  return (
    <div className="min-h-screen bg-[#081123] text-slate-100 pb-16">
      <header className="sticky top-0 z-30 bg-[#0B1325]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExitToApp}
              className="min-h-[38px] px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              ইউজার অ্যাপ
            </button>
            <h1 className="font-display text-base sm:text-lg font-bold text-white">
              অ্যাডমিন প্যানেল · <span className="text-sky-400">NexasWorld</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {!isBootstrapAdminUser(firebaseUser) && (
              <button
                type="button"
                onClick={handleConnectGoogleAdmin}
                className="min-h-[38px] px-3 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-200 text-xs font-semibold hover:bg-sky-500/30"
              >
                Firebase সিঙ্ক
              </button>
            )}
            <button
              type="button"
              onClick={loadOverview}
              aria-label="রিফ্রেশ"
              className="min-h-[38px] min-w-[38px] rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center hover:bg-slate-800"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                clearStoredAdminKey();
                setAuthorized(false);
              }}
              className="min-h-[38px] px-3 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              লক করুন
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl bg-[#101A30] border border-slate-800 p-4">
            <p className="text-xs text-slate-400">মোট রেজিস্ট্রেশন</p>
            <p className="font-mono text-2xl font-bold text-white tabular-nums mt-1">
              {data?.totalUsers ?? 0}
            </p>
            <p className="text-[11px] text-sky-400 mt-0.5">
              সক্রিয় বিনিয়োগকারী: {data?.totalActiveInvestors ?? 0}
            </p>
          </div>

          <div className="rounded-2xl bg-[#101A30] border border-slate-800 p-4">
            <p className="text-xs text-slate-400">পেন্ডিং ডিপোজিট</p>
            <p className="font-mono text-2xl font-bold text-amber-400 tabular-nums mt-1">
              {data?.pendingDepositCount ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">কনফার্মেশনের অপেক্ষায়</p>
          </div>

          <div className="rounded-2xl bg-[#101A30] border border-slate-800 p-4">
            <p className="text-xs text-slate-400">পেন্ডিং উত্তোলন</p>
            <p className="font-mono text-2xl font-bold text-rose-400 tabular-nums mt-1">
              {data?.pendingWithdrawCount ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">পেমেন্টের অপেক্ষায়</p>
          </div>

          <div className="rounded-2xl bg-[#101A30] border border-slate-800 p-4">
            <p className="text-xs text-slate-400">কনফার্মড ডিপোজিট</p>
            <p className="font-mono text-2xl font-bold text-emerald-400 tabular-nums mt-1">
              ৳{(data?.totalConfirmedDeposits ?? 0).toLocaleString('en-US')}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">মোট অনুমোদিত</p>
          </div>
        </section>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#101A30] border border-slate-800 overflow-x-auto">
          {(
            [
              { key: 'deposits', label: `ডিপোজিট কনফার্ম (${data?.pendingDepositCount ?? 0})` },
              { key: 'users', label: `অ্যাকাউন্ট ও ব্যালেন্স (${data?.totalUsers ?? 0})` },
              { key: 'withdrawals', label: `উত্তোলন (${data?.pendingWithdrawCount ?? 0})` },
              { key: 'payments', label: 'পেমেন্ট নম্বর' },
              { key: 'settings', label: 'টেলিগ্রাম ও বোনাস' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === item.key
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* TAB 1: DEPOSIT CONFIRMATIONS */}
        {tab === 'deposits' && (
          <section className="rounded-2xl bg-[#101A30] border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="font-display text-base font-bold text-white">ডিপোজিট অনুরোধসমূহ</h2>
            </div>
            {(data?.deposits || []).length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                কোনো ডিপোজিট রিকোয়েস্ট এখনো আসেনি।
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {data?.deposits.map((dep) => (
                  <div
                    key={dep.id}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-sm font-bold text-white">
                          {dep.userPhone}
                        </span>
                        <span className="text-xs text-slate-400">({dep.userName})</span>
                        <span
                          className={`text-xs font-semibold ${
                            dep.status === 'Confirmed'
                              ? 'text-emerald-400'
                              : dep.status === 'Rejected'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          · {depositStatusBn[dep.status]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono">
                        {dep.method} ({dep.channel}) · TrxID: <strong className="text-white">{dep.txId}</strong>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(dep.createdAt).toLocaleString('en-GB')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-mono text-base font-bold text-white tabular-nums">
                          ৳{dep.amount.toLocaleString('en-US')}
                        </p>
                        {dep.bonusAmount > 0 && (
                          <p className="text-[11px] font-mono text-emerald-400">
                            +৳{dep.bonusAmount} বোনাস
                          </p>
                        )}
                      </div>

                      {dep.status === 'Pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await adminConfirmDeposit(dep.id);
                              await adminUpdateDepositStatusInFirestore(dep.id, 'Confirmed');
                              await loadOverview();
                              showToast('ডিপোজিট কনফার্ম হয়েছে!');
                            }}
                            className="min-h-[38px] px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            কনফার্ম
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await adminRejectDeposit(dep.id);
                              await adminUpdateDepositStatusInFirestore(dep.id, 'Rejected');
                              await loadOverview();
                              showToast('ডিপোজিট বাতিল হয়েছে।');
                            }}
                            className="min-h-[38px] px-3 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-semibold"
                          >
                            বাতিল
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: USERS SEARCH & ADD/DEDUCT BALANCE */}
        {tab === 'users' && (
          <section className="space-y-4">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="অ্যাকাউন্ট নাম্বার (+880...), নাম বা রেফারেল কোড দিয়ে খুঁজুন..."
                className="w-full min-h-[46px] pl-11 pr-4 rounded-2xl bg-[#101A30] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="rounded-2xl bg-[#101A30] border border-slate-800 divide-y divide-slate-800">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  <Users className="w-7 h-7 mx-auto mb-2 text-slate-500" />
                  কোনো অ্যাকাউন্ট পাওয়া যায়নি।
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-white">{u.phone}</span>
                        <span className="text-xs text-slate-400">· {u.fullName}</span>
                        <span className="text-xs font-mono text-sky-400">· {u.referralCode}</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        রিচার্জ: <strong className="text-white font-mono">৳{u.rechargeBalance.toLocaleString('en-US')}</strong> ·{' '}
                        উত্তোলন: <strong className="text-white font-mono">৳{u.withdrawalBalance.toLocaleString('en-US')}</strong> ·{' '}
                        প্ল্যান: <strong className="text-white font-mono">{u.productCount}</strong> ·{' '}
                        ব্যাংক: {u.bankCardVerified ? `${u.bankName} (${u.bankAccountNumber})` : 'সেটআপ হয়নি'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setAdjustTarget({
                            userId: u.id,
                            phone: u.phone,
                            name: u.fullName,
                            action: 'add',
                          })
                        }
                        className="min-h-[38px] px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        ব্যালেন্স যোগ
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAdjustTarget({
                            userId: u.id,
                            phone: u.phone,
                            name: u.fullName,
                            action: 'deduct',
                          })
                        }
                        className="min-h-[38px] px-3.5 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                        ব্যালেন্স কাটুন
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* TAB 3: WITHDRAWAL REQUESTS */}
        {tab === 'withdrawals' && (
          <section className="rounded-2xl bg-[#101A30] border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="font-display text-base font-bold text-white">উত্তোলন অনুরোধসমূহ</h2>
            </div>
            {(data?.withdrawals || []).length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                কোনো উত্তোলন রিকোয়েস্ট নেই।
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {data?.withdrawals.map((wd) => (
                  <div
                    key={wd.id}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white">{wd.userPhone}</span>
                        <span className="text-xs text-slate-400">({wd.bankHolderName})</span>
                        <span
                          className={`text-xs font-semibold ${
                            wd.status === 'Approved'
                              ? 'text-emerald-400'
                              : wd.status === 'Rejected'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          · {withdrawStatusBn[wd.status]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono">
                        {wd.bankName} · {wd.accountNumber}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(wd.createdAt).toLocaleString('en-GB')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-base font-bold text-white tabular-nums">
                        ৳{wd.amount.toLocaleString('en-US')}
                      </span>
                      {wd.status === 'Processing' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await adminApproveWithdraw(wd.id);
                              await adminUpdateWithdrawStatusInFirestore(wd.id, 'Approved');
                              await loadOverview();
                              showToast('উত্তোলন অ্যাপ্রুভ হয়েছে।');
                            }}
                            className="min-h-[38px] px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                          >
                            অ্যাপ্রুভ
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await adminRejectWithdraw(wd.id);
                              await adminUpdateWithdrawStatusInFirestore(wd.id, 'Rejected');
                              await loadOverview();
                              showToast('উত্তোলন বাতিল করে ব্যালেন্স ফেরত দেওয়া হয়েছে।');
                            }}
                            className="min-h-[38px] px-3 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 text-xs font-semibold"
                          >
                            ফেরত দিন
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 4: PAYMENT NUMBERS MANAGEMENT */}
        {tab === 'payments' && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <form
              onSubmit={handleAddPaymentNumber}
              className="rounded-2xl bg-[#101A30] border border-slate-800 p-5 space-y-4"
            >
              <h2 className="font-display text-base font-bold text-white">
                নতুন পেমেন্ট নম্বর যোগ করুন
              </h2>

              <div className="grid grid-cols-3 gap-2">
                {(['bKash', 'Nagad', 'USDT'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setNewMethod(m);
                      setNewChannel(
                        m === 'bKash' ? 'GOPAY-BK' : m === 'Nagad' ? 'GOPAY-NG' : 'USDT-TRC20'
                      );
                    }}
                    className={`min-h-[40px] rounded-xl text-xs font-semibold border ${
                      newMethod === m
                        ? 'bg-sky-500 text-white border-sky-500'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}
                  >
                    {m === 'bKash' ? 'বিকাশ (bKash)' : m === 'Nagad' ? 'নগদ (Nagad)' : 'USDT'}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">চ্যানেল নাম</label>
                <input
                  type="text"
                  required
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  placeholder="যেমন: GOPAY-BK"
                  className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  অ্যাকাউন্ট নম্বর / ওয়ালেট অ্যাড্রেস
                </label>
                <input
                  type="text"
                  required
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="01XXXXXXXXX / ওয়ালেট অ্যাড্রেস"
                  className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">অ্যাকাউন্ট ধরন</label>
                <input
                  type="text"
                  value={newTypeLabel}
                  onChange={(e) => setNewTypeLabel(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold"
              >
                পেমেন্ট নম্বর সেভ করুন
              </button>
            </form>

            <div className="rounded-2xl bg-[#101A30] border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h2 className="font-display text-base font-bold text-white">সক্রিয় পেমেন্ট নম্বরসমূহ</h2>
              </div>
              <div className="divide-y divide-slate-800">
                {(data?.config.paymentNumbers || []).map((pn) => (
                  <div key={pn.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-sky-400">
                        {pn.method} · {pn.channelLabel}
                      </p>
                      <p className="font-mono text-sm font-semibold text-white truncate">
                        {pn.number}
                      </p>
                      <p className="text-[11px] text-slate-400">{pn.typeLabel}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const updatedConfig = await adminDeletePaymentNumber(pn.id);
                        await adminSaveAppConfigInFirestore(updatedConfig);
                        await loadOverview();
                        showToast('পেমেন্ট নম্বর ডিলিট হয়েছে।');
                      }}
                      aria-label="নম্বর মুছুন"
                      className="min-h-[36px] min-w-[36px] rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TAB 5: TELEGRAM, SUPPORT LINKS & BONUS SETTINGS */}
        {tab === 'settings' && (
          <form
            onSubmit={handleSaveSettings}
            className="max-w-xl rounded-2xl bg-[#101A30] border border-slate-800 p-5 space-y-4"
          >
            <h2 className="font-display text-base font-bold text-white">
              টেলিগ্রাম, সাপোর্ট লিংক এবং বোনাস সেটিংস
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">টেলিগ্রাম গ্রুপ লিংক</label>
              <input
                type="url"
                required
                value={tgUrl}
                onChange={(e) => setTgUrl(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">কাস্টমার সাপোর্ট লিংক</label>
              <input
                type="url"
                required
                value={supUrl}
                onChange={(e) => setSupUrl(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                পপ-আপ নোটিশ (লগইন / রিফ্রেশে দেখাবে)
              </label>
              <textarea
                rows={3}
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                রেজিস্ট্রেশন বোনাস (BDT)
              </label>
              <input
                type="number"
                min={0}
                value={regBonus}
                onChange={(e) => setRegBonus(Number(e.target.value))}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm"
            >
              সেটিংস সেভ করুন (লাইভ আপডেট)
            </button>
          </form>
        )}
      </main>

      {/* Add / Deduct Balance Modal */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold">
                  {adjustTarget.action === 'add' ? 'ব্যালেন্স যোগ করুন' : 'ব্যালেন্স কেটে নিন'}
                </h3>
                <p className="font-mono text-xs text-slate-500">
                  {adjustTarget.phone} ({adjustTarget.name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(['recharge', 'withdrawal'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setAdjustWallet(w)}
                    className={`min-h-[38px] rounded-xl text-xs font-semibold border ${
                      adjustWallet === w
                        ? 'bg-[#0B1221] text-white border-[#0B1221]'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {w === 'recharge' ? 'রিচার্জ ব্যালেন্স' : 'উত্তোলন ব্যালেন্স'}
                  </button>
                ))}
              </div>

              <input
                type="number"
                min={1}
                required
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="পরিমাণ লিখুন (BDT)"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 font-mono text-sm"
              />

              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="কারণ / নোট (ঐচ্ছিক)"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm"
              />

              <button
                type="submit"
                className={`w-full min-h-[44px] rounded-xl text-white font-semibold text-sm ${
                  adjustTarget.action === 'add' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {adjustTarget.action === 'add' ? 'ব্যালেন্স যোগ নিশ্চিত করুন' : 'ব্যালেন্স কাটা নিশ্চিত করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-white text-slate-950 text-xs font-semibold shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
