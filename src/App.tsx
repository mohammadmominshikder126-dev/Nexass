import type { User as FirebaseUser } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import {
  buyVipPlan,
  claimDailyProductIncome,
  claimDailySalary,
  clearStoredToken,
  fetchAppConfig,
  fetchSession,
  getStoredToken,
  isExpressBackendActive,
  loginAccount,
  loginWithGoogleAccount,
  redeemGiftCode,
  registerAccount,
  saveBankCard,
  submitRecharge,
  submitWithdraw,
  updateAccountDetails,
} from './api';
import { createDefaultPublicConfig, subscribeLocalSync } from './localFallbackStore';
import { VIP_PLANS } from './data/plans';
import {
  claimUserProductInFirestore,
  createDepositInFirestore,
  createUserProductInFirestore,
  createWithdrawalInFirestore,
  ensureFirebaseUserProfile,
  isVerifiedFirebaseUser,
  signInWithGoogle,
  signOutFirebase,
  subscribeAuthState,
  subscribeToAppConfig,
  subscribeToUserProfile,
  syncAccountDetailsToFirestore,
  syncBankCardToFirestore,
} from './firebase';
import {
  AccountDetailsView,
  BankCardView,
  CustomerServiceModal,
  DailySalaryModal,
  GiftCodeModal,
  NotificationsDrawer,
  PaymentRecordView,
  PlanConfirmModal,
  SideMenuDrawer,
  TelegramJoinModal,
} from './components/AccountModals';
import { AdminPanel } from './components/AdminPanel';
import { AuthView } from './components/AuthView';
import { HomeView } from './components/HomeView';
import { BottomTabBar, TopHeader } from './components/Navigation';
import { RechargeView, WithdrawView } from './components/PaymentSubPages';
import { ProductsView } from './components/ProductsView';
import { ProfileView } from './components/ProfileView';
import { TeamView } from './components/TeamView';
import type {
  PayoutMethod,
  PublicAppConfig,
  SubPage,
  TabKey,
  UserAccountBundle,
  VipPlan,
} from './types';

const DEFAULT_PUBLIC_CONFIG: PublicAppConfig = createDefaultPublicConfig();

function isAdminPath(): boolean {
  return (
    window.location.pathname === '/admin' ||
    window.location.pathname.startsWith('/admin/') ||
    window.location.hash.startsWith('#/admin')
  );
}

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => isAdminPath());
  const [bundle, setBundle] = useState<UserAccountBundle | null>(null);
  const [appConfig, setAppConfig] = useState<PublicAppConfig>(DEFAULT_PUBLIC_CONFIG);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [productsSubTab, setProductsSubTab] = useState<'catalog' | 'active'>('catalog');
  const [subPage, setSubPage] = useState<SubPage>(null);
  const [selectedPlan, setSelectedPlan] = useState<VipPlan | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showTelegramPopup, setShowTelegramPopup] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('register');

  const searchParams = new URLSearchParams(window.location.search);
  const urlRefCode = (searchParams.get('ref') || '').trim();
  const isRegisterUrl =
    Boolean(urlRefCode) ||
    window.location.pathname === '/register' ||
    window.location.hash.startsWith('#/register') ||
    searchParams.get('mode') === 'register';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((current) => (current === msg ? null : current));
    }, 3500);
  };

  const refreshLiveData = useCallback(async () => {
    try {
      const cfg = await fetchAppConfig();
      setAppConfig(cfg);
    } catch {
      // Keep current config on transient errors
    }

    if (getStoredToken()) {
      try {
        const session = await fetchSession();
        setBundle(session);
      } catch {
        // Ignore if unauthenticated
      }
    }
  }, []);

  useEffect(() => {
    const syncRoute = () => setIsAdminRoute(isAdminPath());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const hasToken = Boolean(getStoredToken());
        const [cfgResult, sessionResult] = await Promise.allSettled([
          fetchAppConfig(),
          hasToken ? fetchSession() : Promise.reject(new Error('No session')),
        ]);
        if (!active) return;
        if (cfgResult.status === 'fulfilled') {
          setAppConfig(cfgResult.value);
        }
        if (sessionResult.status === 'fulfilled') {
          const loaded = sessionResult.value;
          setBundle(loaded);
          if (
            isRegisterUrl &&
            (!urlRefCode ||
              urlRefCode.toUpperCase() !== (loaded.user.referralCode || '').toUpperCase())
          ) {
            setAuthInitialMode('register');
            setSubPage('auth');
          }
        } else {
          setBundle(null);
          setAuthInitialMode('register');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [isRegisterUrl, urlRefCode]);

  // Real-time sync: Express SSE when Node server is active, BroadcastChannel/storage on static hosting
  useEffect(() => {
    let events: EventSource | null = null;
    let cancelled = false;
    const handleSync = () => {
      void refreshLiveData();
    };
    const unsubLocal = subscribeLocalSync(handleSync);

    void isExpressBackendActive().then((active) => {
      if (cancelled || !active) return;
      events = new EventSource('/api/events');
      events.addEventListener('sync', handleSync);
    });

    return () => {
      cancelled = true;
      unsubLocal();
      if (events) {
        events.removeEventListener('sync', handleSync);
        events.close();
      }
    };
  }, [refreshLiveData]);

  // Track Firebase Auth readiness state
  useEffect(() => {
    const unsubscribe = subscribeAuthState((user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Attach Firestore listeners ONLY when auth is ready and user is authenticated
  useEffect(() => {
    if (!authReady || !isVerifiedFirebaseUser(firebaseUser)) return;
    const unsubConfig = subscribeToAppConfig((cfgPatch) => {
      setAppConfig((prev) => ({
        ...prev,
        ...cfgPatch,
        paymentNumbers: cfgPatch.paymentNumbers ?? prev.paymentNumbers,
      }));
    });
    const unsubProfile = subscribeToUserProfile(firebaseUser.uid, (profilePatch) => {
      setBundle((prev) => {
        if (!prev || prev.user.id !== firebaseUser.uid) return prev;
        return {
          ...prev,
          user: {
            ...prev.user,
            ...profilePatch,
          },
        };
      });
    });
    return () => {
      unsubConfig();
      unsubProfile();
    };
  }, [authReady, firebaseUser]);

  const handleSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
    setSubPage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = () => {
    clearStoredToken();
    void signOutFirebase().catch(() => {});
    setBundle(null);
    setAuthInitialMode('login');
    setSubPage('auth');
  };

  const clearReferralUrl = () => {
    if (
      window.location.search.includes('ref=') ||
      window.location.search.includes('mode=') ||
      window.location.pathname === '/register' ||
      window.location.hash.startsWith('#/register')
    ) {
      window.history.replaceState(null, '', '/');
    }
  };

  const handleLogin = async (phone: string, password: string) => {
    const next = await loginAccount(phone, password);
    clearReferralUrl();
    setBundle(next);
    setSubPage(null);
    setActiveTab('home');
    setShowTelegramPopup(true);
    showToast(`${next.user.phone} নম্বরে সাইন ইন সফল হয়েছে`);
  };

  const handleRegister = async (payload: {
    phone: string;
    password: string;
    fullName?: string;
    referralCode?: string;
  }) => {
    const next = await registerAccount(payload);
    clearReferralUrl();
    setBundle(next);
    setSubPage(null);
    setActiveTab('home');
    setShowTelegramPopup(true);
    showToast(
      `রেজিস্ট্রেশন সফল! ${appConfig.registrationBonus} BDT বোনাস আপনার অ্যাকাউন্টে যোগ হয়েছে।`
    );
  };

  const handleGoogleLogin = async (referralCode?: string) => {
    const fbUser = await signInWithGoogle();
    await ensureFirebaseUserProfile(fbUser, referralCode || urlRefCode);
    const next = await loginWithGoogleAccount({
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      referralCode: referralCode || urlRefCode,
    });
    clearReferralUrl();
    setBundle(next);
    setSubPage(null);
    setActiveTab('home');
    setShowTelegramPopup(true);
    showToast(`${next.user.fullName} হিসেবে Google লগইন সফল হয়েছে`);
  };

  const handleSelectPlan = (plan: VipPlan) => {
    if (!bundle) {
      setSubPage('auth');
      return;
    }
    setSelectedPlan(plan);
  };

  const handleConfirmPlan = async (planId: string) => {
    const next = await buyVipPlan(planId);
    if (isVerifiedFirebaseUser(firebaseUser)) {
      const matchedPlan = VIP_PLANS.find((p) => p.id === planId);
      if (matchedPlan) {
        await createUserProductInFirestore(
          firebaseUser.uid,
          matchedPlan,
          next.products[0]?.id
        );
      }
    }
    setBundle(next);
    setSelectedPlan(null);
    setProductsSubTab('active');
    setActiveTab('products');
    setSubPage(null);
    showToast('VIP প্ল্যান অ্যাক্টিভ হয়েছে! আমার পণ্য পেজে 24 ঘণ্টার রিমাইন্ডার দেখুন।');
  };

  const handleClaimIncome = async (productId: string) => {
    setClaimingId(productId);
    try {
      const targetProd = bundle?.products.find((p) => p.id === productId);
      const next = await claimDailyProductIncome(productId);
      if (isVerifiedFirebaseUser(firebaseUser) && targetProd) {
        await claimUserProductInFirestore(firebaseUser.uid, targetProd);
      }
      setBundle(next);
      showToast('দৈনিক আয় আপনার উত্তোলন ব্যালেন্সে যোগ হয়েছে।');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'আয় সংগ্রহ করা যায়নি');
    } finally {
      setClaimingId(null);
    }
  };

  const handleRefreshBalance = async () => {
    const next = await fetchSession();
    setBundle(next);
  };

  const handleRechargeSubmit = async (payload: {
    amount: number;
    method: string;
    channel?: string;
    txId?: string;
    bonusPct?: number;
  }) => {
    const next = await submitRecharge(payload);
    if (isVerifiedFirebaseUser(firebaseUser)) {
      const bonusAmount =
        payload.bonusPct && payload.bonusPct > 0
          ? Number(((payload.amount * payload.bonusPct) / 100).toFixed(2))
          : 0;
      await createDepositInFirestore(
        firebaseUser.uid,
        next.user.phone,
        next.user.fullName,
        {
          id: next.transactions[0]?.id,
          amount: payload.amount,
          bonusAmount,
          method: payload.method,
          channel: payload.channel,
          txId: payload.txId,
        }
      );
    }
    setBundle(next);
    showToast('রিচার্জ অনুরোধ জমা হয়েছে। অ্যাডমিন কনফার্ম করলে ব্যালেন্স যোগ হবে।');
  };

  const handleWithdrawSubmit = async (payload: { amount: number; password: string }) => {
    const next = await submitWithdraw(payload);
    if (isVerifiedFirebaseUser(firebaseUser)) {
      await createWithdrawalInFirestore(
        firebaseUser.uid,
        next.user,
        payload.amount,
        next.transactions[0]?.id
      );
    }
    setBundle(next);
    setSubPage('records');
    showToast(`BDT ${payload.amount.toLocaleString('en-US')} উত্তোলনের অনুরোধ জমা হয়েছে।`);
  };

  const handleSaveBankCard = async (payload: {
    bankHolderName: string;
    bankName: PayoutMethod;
    bankAccountNumber: string;
  }) => {
    const next = await saveBankCard(payload);
    if (isVerifiedFirebaseUser(firebaseUser)) {
      await syncBankCardToFirestore(firebaseUser.uid, payload);
    }
    setBundle(next);
    showToast('ব্যাংক কার্ড সফলভাবে সেভ হয়েছে।');
  };

  const handleClaimSalary = async () => {
    const next = await claimDailySalary();
    setBundle(next);
    showToast('দৈনিক বেতন বোনাস আপনার উত্তোলন ব্যালেন্সে যোগ হয়েছে।');
  };

  const handleRedeemGift = async (code: string) => {
    const next = await redeemGiftCode(code);
    setBundle(next);
    showToast(`গিফট কোড ${code.toUpperCase()} সফলভাবে রিডিম হয়েছে।`);
  };

  const handleUpdateAccount = async (payload: {
    fullName?: string;
    payoutMethod?: PayoutMethod;
    payoutAccount?: string;
    newPassword?: string;
  }) => {
    const next = await updateAccountDetails(payload);
    if (isVerifiedFirebaseUser(firebaseUser)) {
      await syncAccountDetailsToFirestore(firebaseUser.uid, payload);
    }
    setBundle(next);
    showToast('অ্যাকাউন্ট সেটিংস সেভ হয়েছে।');
  };

  if (isAdminRoute) {
    return (
      <AdminPanel
        onExitToApp={() => {
          window.history.pushState(null, '', '/');
          setIsAdminRoute(false);
          void refreshLiveData();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#081123] text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-sky-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">NexasWorld লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!bundle || !bundle.user || subPage === 'auth') {
    return (
      <div className="min-h-screen bg-[#081123] text-slate-50">
        <AuthView
          onLogin={handleLogin}
          onRegister={handleRegister}
          onGoogleLogin={handleGoogleLogin}
          onCancel={bundle?.user ? () => setSubPage(null) : undefined}
          initialReferralCode={urlRefCode}
          initialMode={isRegisterUrl ? 'register' : authInitialMode}
        />
      </div>
    );
  }

  const safeTransactions = Array.isArray(bundle.transactions) ? bundle.transactions : [];
  const safeProducts = Array.isArray(bundle.products) ? bundle.products : [];
  const safeTeam = Array.isArray(bundle.team) ? bundle.team : [];
  const safeRedeemedCodes = Array.isArray(bundle.user.redeemedCodes)
    ? bundle.user.redeemedCodes
    : [];

  return (
    <div className="min-h-screen bg-[#081123] text-slate-50 pb-24 md:pb-12">
      <TopHeader
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        unreadCount={safeTransactions.length > 0 ? 1 : 0}
      />

      <main className="max-w-5xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6">
        {subPage === 'recharge' ? (
          <RechargeView
            user={bundle.user}
            config={appConfig}
            onBack={() => setSubPage(null)}
            onOpenHistory={() => setSubPage('records')}
            onRefreshBalance={handleRefreshBalance}
            onSubmit={handleRechargeSubmit}
          />
        ) : subPage === 'withdraw' ? (
          <WithdrawView
            user={bundle.user}
            products={safeProducts}
            onBack={() => setSubPage(null)}
            onGoToPlans={() => {
              setSubPage(null);
              setActiveTab('home');
            }}
            onGoToBankCard={() => setSubPage('bank-card')}
            onSubmit={handleWithdrawSubmit}
          />
        ) : subPage === 'bank-card' ? (
          <BankCardView
            user={bundle.user}
            onBack={() => setSubPage(null)}
            onSave={handleSaveBankCard}
          />
        ) : subPage === 'account' ? (
          <AccountDetailsView
            user={bundle.user}
            onBack={() => setSubPage(null)}
            onSave={handleUpdateAccount}
          />
        ) : subPage === 'records' ? (
          <PaymentRecordView transactions={safeTransactions} onBack={() => setSubPage(null)} />
        ) : activeTab === 'home' ? (
          <HomeView
            onSelectPlan={handleSelectPlan}
            onOpenRecharge={() => setSubPage('recharge')}
            onOpenWithdraw={() => setSubPage('withdraw')}
            onOpenSupport={() => setSubPage('support')}
          />
        ) : activeTab === 'products' ? (
          <ProductsView
            products={safeProducts}
            onClaimIncome={handleClaimIncome}
            onSelectPlan={handleSelectPlan}
            claimingId={claimingId}
            defaultTab={productsSubTab}
          />
        ) : activeTab === 'team' ? (
          <TeamView user={bundle.user} team={safeTeam} />
        ) : (
          <ProfileView
            user={bundle.user}
            team={safeTeam}
            onOpenSubPage={(page) => setSubPage(page)}
            onOpenProducts={() => {
              setProductsSubTab('active');
              handleSelectTab('products');
            }}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      <BottomTabBar activeTab={activeTab} onSelectTab={handleSelectTab} />

      {menuOpen && (
        <SideMenuDrawer
          user={bundle.user}
          onClose={() => setMenuOpen(false)}
          onNavigateTab={handleSelectTab}
          onOpenSubPage={(page) => setSubPage(page)}
          onSignOut={handleSignOut}
        />
      )}

      {notificationsOpen && (
        <NotificationsDrawer
          transactions={safeTransactions}
          onClose={() => setNotificationsOpen(false)}
        />
      )}

      {selectedPlan && (
        <PlanConfirmModal
          plan={selectedPlan}
          rechargeBalance={bundle.user.rechargeBalance}
          onClose={() => setSelectedPlan(null)}
          onConfirm={handleConfirmPlan}
          onGoToRecharge={() => {
            setSelectedPlan(null);
            setSubPage('recharge');
          }}
        />
      )}

      {subPage === 'salary' && (
        <DailySalaryModal
          user={bundle.user}
          team={safeTeam}
          onClose={() => setSubPage(null)}
          onClaim={handleClaimSalary}
        />
      )}

      {subPage === 'gift' && (
        <GiftCodeModal
          redeemedCodes={safeRedeemedCodes}
          onClose={() => setSubPage(null)}
          onRedeem={handleRedeemGift}
        />
      )}

      {subPage === 'support' && (
        <CustomerServiceModal
          telegramGroupUrl={appConfig.telegramGroupUrl}
          supportUrl={appConfig.supportUrl}
          onClose={() => setSubPage(null)}
        />
      )}

      {showTelegramPopup && (
        <TelegramJoinModal
          telegramGroupUrl={appConfig.telegramGroupUrl}
          supportUrl={appConfig.supportUrl}
          welcomeNotice={appConfig.welcomeNotice}
          onClose={() => setShowTelegramPopup(false)}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-white text-black text-xs sm:text-sm font-semibold shadow-2xl border border-zinc-200 max-w-[90vw] text-center"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
