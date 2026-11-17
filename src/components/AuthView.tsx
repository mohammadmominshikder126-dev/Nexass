import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, Phone, Tag, User } from 'lucide-react';
import { AUTH_GRILLE_IMAGE } from '../data/plans';
import { BrandMark } from './BrandMark';

interface AuthViewProps {
  onLogin: (phone: string, password: string) => Promise<void>;
  onRegister: (payload: {
    phone: string;
    password: string;
    fullName?: string;
    referralCode?: string;
  }) => Promise<void>;
  onGoogleLogin?: (referralCode?: string) => Promise<void>;
  onCancel?: () => void;
  initialReferralCode?: string;
  initialMode?: 'login' | 'register';
}

export function AuthView({
  onLogin,
  onRegister,
  onGoogleLogin,
  onCancel,
  initialReferralCode = '',
  initialMode = 'register',
}: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>(
    initialReferralCode ? 'register' : initialMode
  );
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode);
      setMode('register');
    } else {
      setMode(initialMode);
    }
  }, [initialReferralCode, initialMode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(phone, password);
      } else {
        await onRegister({ phone, password, fullName, referralCode });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লগইন বা নিবন্ধন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await onLogin('+8801789083100', '123456');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ডেমো সাইন ইন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!onGoogleLogin) return;
    setError(null);
    setLoading(true);
    try {
      await onGoogleLogin(referralCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google সাইন ইন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-6 px-4 bg-[#081123]">
      <div className="w-full max-w-sm rounded-[28px] overflow-hidden bg-[#060E24] border border-slate-800 shadow-2xl">
        {/* Top Automotive Grille Banner */}
        <div className="relative h-44 bg-[#071535] flex flex-col justify-between p-4">
          {!imgError && (
            <img
              src={AUTH_GRILLE_IMAGE}
              alt="অটোমোটিভ গ্রিল ব্যানার"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/50 via-blue-900/20 to-[#060E24]/85" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <BrandMark className="w-7 h-6" />
              <span className="font-display text-sm font-bold">
                Nexas<span className="text-[#00D2FF]">World</span>
              </span>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-medium text-white bg-black/50 px-3 py-1.5 rounded-full"
              >
                ফিরে যান
              </button>
            )}
          </div>
        </div>

        {/* Overlapping White Login Sheet */}
        <div className="relative -mt-6 bg-white text-slate-900 rounded-[26px] px-5 py-7 space-y-4">
          {mode === 'register' && (
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold text-center">
              নতুন অ্যাকাউন্ট নিবন্ধন করলেই পাচ্ছেন 150 BDT ফ্রি বোনাস!
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="আপনার পুরো নাম"
                  className="w-full min-h-[46px] pl-11 pr-4 rounded-full border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
            )}

            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 আপনার মোবাইল নম্বর লিখুন"
                className="w-full min-h-[46px] pl-11 pr-4 rounded-full border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="লগইন পাসওয়ার্ড"
                className="w-full min-h-[46px] pl-11 pr-11 rounded-full border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                className="absolute right-3 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {mode === 'register' && (
              <div className="relative flex items-center">
                <Tag className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="ইনভাইটেশন কোড (ঐচ্ছিক)"
                  className="w-full min-h-[46px] pl-11 pr-4 rounded-full border border-slate-300 bg-white font-mono text-xs sm:text-sm uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[46px] mt-1 rounded-full bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white font-semibold text-sm shadow-lg shadow-blue-500/30 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading
                ? 'অপেক্ষা করুন...'
                : mode === 'login'
                ? 'লগইন করুন'
                : 'রেজিস্টার করুন (150 BDT বোনাস)'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 pt-1">
            {mode === 'login' ? (
              <>
                অ্যাকাউন্ট নেই?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('register');
                  }}
                  className="font-bold text-blue-600 underline underline-offset-4"
                >
                  এখনই রেজিস্টার করুন
                </button>
              </>
            ) : (
              <>
                ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('login');
                  }}
                  className="font-bold text-blue-600 underline underline-offset-4"
                >
                  লগইন করুন
                </button>
              </>
            )}
          </p>

          {onGoogleLogin && (
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full min-h-[42px] rounded-full border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              Google দিয়ে লগইন করুন
            </button>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleDemoLogin}
            className="w-full min-h-[40px] rounded-full border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50"
          >
            ডেমো লগইন (+8801789083100)
          </button>
        </div>

        {/* Bottom Royal Blue Wave Footer */}
        <div className="h-14 bg-[#071535] relative overflow-hidden">
          <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full" aria-hidden="true">
            <path d="M0,25 C120,55 240,5 400,30 L400,60 L0,60 Z" fill="#1D4ED8" fillOpacity="0.45" />
          </svg>
        </div>
      </div>
    </div>
  );
}
