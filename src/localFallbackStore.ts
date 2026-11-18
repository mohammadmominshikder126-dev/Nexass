import { GIFT_CODE_CATALOG, VIP_PLANS } from './data/plans';
import type {
  AdminDepositRequest,
  AdminOverviewData,
  AdminWithdrawRequest,
  PaymentNumberEntry,
  PayoutMethod,
  PublicAppConfig,
  TeamMember,
  TransactionRecord,
  UserAccountBundle,
  UserProduct,
  UserProfile,
  VipPlan,
} from './types';

const DB_STORAGE_KEY = 'nexasworld_client_db_v1';
const ADMIN_PASSCODE = 'admin123';
const SYNC_EVENT_NAME = 'nexasworld_local_sync';

interface LocalStoredUser extends UserProfile {
  password: string;
}

interface LocalDatabaseSchema {
  users: Record<string, LocalStoredUser>;
  sessions: Record<string, string>;
  products: Record<string, UserProduct[]>;
  transactions: Record<string, TransactionRecord[]>;
  team: Record<string, TeamMember[]>;
  deposits: AdminDepositRequest[];
  withdrawals: AdminWithdrawRequest[];
  config: PublicAppConfig;
}

let memoryFallbackDb: LocalDatabaseSchema | null = null;
let syncChannel: BroadcastChannel | null = null;

try {
  if (typeof BroadcastChannel !== 'undefined') {
    syncChannel = new BroadcastChannel('nexasworld_sync_channel');
  }
} catch {
  syncChannel = null;
}

function randomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePhone(input: string): string {
  const cleaned = input.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+880')) return cleaned;
  if (cleaned.startsWith('880')) return '+' + cleaned;
  if (cleaned.startsWith('01')) return '+88' + cleaned;
  if (cleaned.length === 10 && cleaned.startsWith('1')) return '+880' + cleaned;
  return cleaned.startsWith('+') ? cleaned : '+880' + cleaned;
}

function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return `${phone.slice(0, 6)}****${phone.slice(-3)}`;
}

export function createDefaultPublicConfig(): PublicAppConfig {
  return {
    telegramGroupUrl: 'https://t.me/nexasworld_official',
    supportUrl: 'https://t.me/nexasworld_support',
    welcomeNotice:
      'অফিসিয়াল টেলিগ্রাম গ্রুপে জয়েন করুন এবং যেকোনো ডিপোজিট বা উত্তোলন সহায়তার জন্য সাপোর্টে যোগাযোগ করুন।',
    registrationBonus: 150,
    paymentNumbers: [
      {
        id: 'pn_bk_1',
        method: 'bKash',
        channelLabel: 'GOPAY-BK',
        number: '01964115795',
        typeLabel: 'পার্সোনাল (সেন্ড মানি)',
      },
      {
        id: 'pn_ng_1',
        method: 'Nagad',
        channelLabel: 'GOPAY-NG',
        number: '01964115795',
        typeLabel: 'পার্সোনাল (সেন্ড মানি)',
      },
      {
        id: 'pn_usdt_1',
        method: 'USDT',
        channelLabel: 'USDT-TRC20',
        number: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
        typeLabel: 'TRC20 ওয়ালেট',
      },
      {
        id: 'pn_usdt_2',
        method: 'USDT',
        channelLabel: 'USDT-BEP20',
        number: '0x94F2bA8c0149E72d18c48A3091B622F911a084E2',
        typeLabel: 'BEP20 ওয়ালেট',
      },
    ],
    vipPlans: VIP_PLANS.map((p) => ({ ...p })),
  };
}

function createSeedLocalDatabase(): LocalDatabaseSchema {
  return {
    users: {},
    sessions: {},
    products: {},
    transactions: {},
    team: {},
    deposits: [],
    withdrawals: [],
    config: createDefaultPublicConfig(),
  };
}

function readDb(): LocalDatabaseSchema {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalDatabaseSchema>;
      const seed = createSeedLocalDatabase();
      const cfg = parsed.config || seed.config;
      if (!Array.isArray(cfg.vipPlans) || cfg.vipPlans.length === 0) {
        cfg.vipPlans = VIP_PLANS.map((p) => ({ ...p }));
      } else {
        cfg.vipPlans = cfg.vipPlans.map((p) =>
          p.id === 'vip-1' && p.price === 500 && p.dailyIncome === 10
            ? { ...p, price: 300, dailyIncome: 80, totalIncome: 2400 }
            : p
        );
      }
      const users = { ...(parsed.users || seed.users) };
      const sessions = { ...(parsed.sessions || seed.sessions) };
      const products = { ...(parsed.products || seed.products) };
      const transactions = { ...(parsed.transactions || seed.transactions) };
      const team = { ...(parsed.team || seed.team) };
      delete users['usr_demo_83100'];
      delete sessions['demo_session_token'];
      delete products['usr_demo_83100'];
      delete transactions['usr_demo_83100'];
      delete team['usr_demo_83100'];
      return {
        users,
        sessions,
        products,
        transactions,
        team,
        deposits: Array.isArray(parsed.deposits) ? parsed.deposits : [],
        withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
        config: cfg,
      };
    }
  } catch {
    if (memoryFallbackDb) return memoryFallbackDb;
  }
  const seeded = createSeedLocalDatabase();
  writeDb(seeded);
  return seeded;
}

function writeDb(next: LocalDatabaseSchema): void {
  memoryFallbackDb = next;
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota / private mode issues
  }
  try {
    syncChannel?.postMessage({ ts: Date.now() });
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME));
  } catch {
    // Ignore
  }
}

export function subscribeLocalSync(callback: () => void): () => void {
  const onEvent = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (e.key === DB_STORAGE_KEY) callback();
  };
  const onChannel = () => callback();

  window.addEventListener(SYNC_EVENT_NAME, onEvent);
  window.addEventListener('storage', onStorage);
  syncChannel?.addEventListener('message', onChannel);

  return () => {
    window.removeEventListener(SYNC_EVENT_NAME, onEvent);
    window.removeEventListener('storage', onStorage);
    syncChannel?.removeEventListener('message', onChannel);
  };
}

function toPublicUser(u: LocalStoredUser): UserProfile {
  const { password: _, ...rest } = u;
  return rest;
}

function buildBundle(db: LocalDatabaseSchema, userId: string, token: string): UserAccountBundle {
  const user = db.users[userId];
  return {
    token,
    user: toPublicUser(user),
    products: db.products[userId] || [],
    transactions: db.transactions[userId] || [],
    team: (db.team[userId] || []).map((m) => ({
      ...m,
      phone: maskPhone(m.phone),
    })),
  };
}

function requireUser(
  db: LocalDatabaseSchema,
  token: string | null
): { userId: string; token: string } {
  if (!token) {
    throw new Error('অনুগ্রহ করে আগে লগইন করুন।');
  }
  const userId = db.sessions[token];
  if (!userId || !db.users[userId]) {
    throw new Error('অনুগ্রহ করে আগে লগইন করুন।');
  }
  return { userId, token };
}

export function localGetConfig(): PublicAppConfig {
  return readDb().config;
}

export function localGetSession(token: string | null): UserAccountBundle {
  const db = readDb();
  const auth = requireUser(db, token);
  return buildBundle(db, auth.userId, auth.token);
}

export function localLogin(phone: string, password: string): UserAccountBundle {
  const db = readDb();
  const normalized = normalizePhone(phone);
  const matched = Object.values(db.users).find((u) => u.phone === normalized);
  if (!matched || matched.password !== password) {
    throw new Error('মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়।');
  }
  const token = randomId('tok');
  db.sessions[token] = matched.id;
  writeDb(db);
  return buildBundle(db, matched.id, token);
}

export function localRegister(payload: {
  phone: string;
  password: string;
  fullName?: string;
  referralCode?: string;
}): UserAccountBundle {
  const db = readDb();
  if (!payload.phone || !payload.password || payload.password.length < 4) {
    throw new Error('সঠিক মোবাইল নম্বর এবং কমপক্ষে 4 অক্ষরের পাসওয়ার্ড দিন।');
  }
  const normalized = normalizePhone(payload.phone);
  const existing = Object.values(db.users).find((u) => u.phone === normalized);
  if (existing) {
    throw new Error('এই মোবাইল নম্বরটি ইতিমধ্যে নিবন্ধিত আছে।');
  }

  const userId = randomId('usr');
  const newCode = 'NXW' + Math.floor(10000 + Math.random() * 89999);
  const referrer = payload.referralCode
    ? Object.values(db.users).find(
        (u) => u.referralCode.toUpperCase() === payload.referralCode!.trim().toUpperCase()
      )
    : undefined;
  const regBonus = db.config.registrationBonus || 150;
  const nowIso = new Date().toISOString();

  const newUser: LocalStoredUser = {
    id: userId,
    phone: normalized,
    fullName: payload.fullName?.trim() || 'Nexas সদস্য',
    referralCode: newCode,
    referredBy: referrer?.id,
    rechargeBalance: regBonus,
    withdrawalBalance: 0,
    invitedEarnings: 0,
    payoutMethod: 'bKash',
    payoutAccount: '',
    bankHolderName: '',
    bankName: 'bKash',
    bankAccountNumber: '',
    bankCardVerified: false,
    lastSalaryClaimDate: null,
    redeemedCodes: [],
    createdAt: nowIso,
    password: payload.password,
  };

  db.users[userId] = newUser;
  db.products[userId] = [];
  db.transactions[userId] = [
    {
      id: randomId('txn_reg'),
      type: 'Registration Bonus',
      amount: regBonus,
      status: 'Completed',
      note: `নিবন্ধন বোনাস ${regBonus} BDT`,
      createdAt: nowIso,
    },
  ];
  db.team[userId] = [];

  if (referrer) {
    db.team[referrer.id] = db.team[referrer.id] || [];
    db.team[referrer.id].unshift({
      id: 'tm_' + userId,
      phone: normalized,
      level: 1,
      joinedAt: nowIso,
      validVip: false,
      totalInvested: 0,
      commissionEarned: 0,
    });
    if (referrer.referredBy && db.users[referrer.referredBy]) {
      const l2Id = referrer.referredBy;
      db.team[l2Id] = db.team[l2Id] || [];
      db.team[l2Id].unshift({
        id: 'tm_l2_' + userId,
        phone: normalized,
        level: 2,
        joinedAt: nowIso,
        validVip: false,
        totalInvested: 0,
        commissionEarned: 0,
      });
      const l2User = db.users[l2Id];
      if (l2User.referredBy && db.users[l2User.referredBy]) {
        const l3Id = l2User.referredBy;
        db.team[l3Id] = db.team[l3Id] || [];
        db.team[l3Id].unshift({
          id: 'tm_l3_' + userId,
          phone: normalized,
          level: 3,
          joinedAt: nowIso,
          validVip: false,
          totalInvested: 0,
          commissionEarned: 0,
        });
      }
    }
  }

  const token = randomId('tok');
  db.sessions[token] = userId;
  writeDb(db);
  return buildBundle(db, userId, token);
}

export function localGoogleAuth(payload: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  referralCode?: string;
}): UserAccountBundle {
  const db = readDb();
  const cleanUid = payload.uid.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  let user = db.users[cleanUid];
  if (!user) {
    const regBonus = db.config.registrationBonus || 150;
    const newCode = 'NXW' + cleanUid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    const referrer = payload.referralCode
      ? Object.values(db.users).find(
          (u) => u.referralCode.toUpperCase() === payload.referralCode!.trim().toUpperCase()
        )
      : undefined;
    const safePhone = (payload.email || `usr_${cleanUid.slice(0, 10)}`).trim().slice(0, 32);
    const nowIso = new Date().toISOString();

    user = {
      id: cleanUid,
      phone: safePhone,
      fullName: payload.displayName?.trim() || payload.email?.split('@')[0] || 'Nexas সদস্য',
      referralCode: newCode.length >= 4 ? newCode : `NXW${Math.floor(10000 + Math.random() * 89999)}`,
      referredBy: referrer?.id,
      rechargeBalance: regBonus,
      withdrawalBalance: 0,
      invitedEarnings: 0,
      payoutMethod: 'bKash',
      payoutAccount: '',
      bankHolderName: '',
      bankName: 'bKash',
      bankAccountNumber: '',
      bankCardVerified: false,
      lastSalaryClaimDate: null,
      redeemedCodes: [],
      createdAt: nowIso,
      password: '123456',
    };
    db.users[cleanUid] = user;
    db.products[cleanUid] = [];
    db.transactions[cleanUid] = [
      {
        id: randomId('txn_reg'),
        type: 'Registration Bonus',
        amount: regBonus,
        status: 'Completed',
        note: `Google নিবন্ধন বোনাস ${regBonus} BDT`,
        createdAt: nowIso,
      },
    ];
    db.team[cleanUid] = [];
    if (referrer) {
      db.team[referrer.id] = db.team[referrer.id] || [];
      db.team[referrer.id].unshift({
        id: 'tm_' + cleanUid,
        phone: safePhone,
        level: 1,
        joinedAt: nowIso,
        validVip: false,
        totalInvested: 0,
        commissionEarned: 0,
      });
    }
  }
  const token = randomId('tok');
  db.sessions[token] = user.id;
  writeDb(db);
  return buildBundle(db, user.id, token);
}

export function localSubmitRecharge(
  token: string | null,
  payload: {
    amount: number;
    method: string;
    channel?: string;
    txId?: string;
    bonusPct?: number;
  }
): UserAccountBundle {
  const db = readDb();
  const auth = requireUser(db, token);
  const numericAmount = Number(payload.amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 300) {
    throw new Error('সর্বনিম্ন রিচার্জ পরিমাণ 300 BDT।');
  }
  const cleanTxId = payload.txId?.trim();
  if (!cleanTxId || cleanTxId.length < 4) {
    throw new Error('TrxID অবশ্যই পূরণ করতে হবে!');
  }

  const bonus =
    payload.bonusPct && payload.bonusPct > 0
      ? Number(((numericAmount * payload.bonusPct) / 100).toFixed(2))
      : 0;
  const user = db.users[auth.userId];
  const depId = randomId('dep');
  const createdAt = new Date().toISOString();

  db.deposits.unshift({
    id: depId,
    userId: user.id,
    userPhone: user.phone,
    userName: user.fullName,
    amount: numericAmount,
    bonusAmount: bonus,
    method: payload.method || 'bKash',
    channel: payload.channel || 'GOPAY-BK',
    txId: cleanTxId,
    status: 'Pending',
    createdAt,
  });

  db.transactions[auth.userId] = db.transactions[auth.userId] || [];
  db.transactions[auth.userId].unshift({
    id: depId,
    type: 'Recharge',
    amount: numericAmount + bonus,
    method: payload.method || 'bKash',
    channel: payload.channel || 'GOPAY-BK',
    txId: cleanTxId,
    status: 'Processing',
    note: `${payload.method || 'bKash'} (${payload.channel || 'GOPAY-BK'}) সেন্ড মানি · TrxID ${cleanTxId} (অ্যাডমিন যাচাইয়ের অপেক্ষায়)`,
    createdAt,
  });

  writeDb(db);
  return buildBundle(db, auth.userId, auth.token);
}

export function localSubmitWithdraw(
  token: string | null,
  payload: { amount: number; password: string }
): UserAccountBundle {
  const db = readDb();
  const auth = requireUser(db, token);
  const user = db.users[auth.userId];
  const userProducts = db.products[auth.userId] || [];

  if (userProducts.length === 0) {
    throw new Error('উত্তোলন করতে হলে আগে রিচার্জ করে কমপক্ষে 1 টি VIP প্যাকেজ কিনতে হবে।');
  }
  if (!user.bankCardVerified || !user.bankAccountNumber?.trim()) {
    throw new Error('উত্তোলন করার আগে আপনার ব্যাংক কার্ড সেটআপ সম্পন্ন করুন।');
  }

  const numericAmount = Number(payload.amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 200) {
    throw new Error('সর্বনিম্ন উত্তোলন 200 BDT।');
  }
  if (numericAmount > user.withdrawalBalance) {
    throw new Error('উত্তোলন ব্যালেন্স পর্যাপ্ত নয়।');
  }
  if (!payload.password || user.password !== payload.password) {
    throw new Error('অ্যাকাউন্টের পাসওয়ার্ড সঠিক নয়।');
  }

  user.withdrawalBalance = Number((user.withdrawalBalance - numericAmount).toFixed(2));
  const wdId = randomId('wd');
  const createdAt = new Date().toISOString();

  db.withdrawals.unshift({
    id: wdId,
    userId: user.id,
    userPhone: user.phone,
    userName: user.fullName,
    amount: numericAmount,
    method: user.payoutMethod,
    accountNumber: user.bankAccountNumber,
    bankHolderName: user.bankHolderName,
    bankName: user.bankName,
    status: 'Processing',
    createdAt,
  });

  db.transactions[auth.userId] = db.transactions[auth.userId] || [];
  db.transactions[auth.userId].unshift({
    id: wdId,
    type: 'Withdraw',
    amount: numericAmount,
    method: user.payoutMethod,
    accountRef: user.bankAccountNumber,
    status: 'Processing',
    note: `${user.bankName} (${user.bankAccountNumber}) নম্বরে উত্তোলন অনুরোধ`,
    createdAt,
  });

  writeDb(db);
  return buildBundle(db, auth.userId, auth.token);
}

export function localSaveBankCard(
  token: string | null,
  payload: { bankHolderName: string; bankName: PayoutMethod; bankAccountNumber: string }
): UserAccountBundle {
  const db = readDb();
  const auth = requireUser(db, token);
  if (!payload.bankHolderName?.trim() || !payload.bankName || !payload.bankAccountNumber?.trim()) {
    throw new Error('অ্যাকাউন্ট হোল্ডারের নাম, ব্যাংক/মেথড এবং নম্বর দিন।');
  }
  const user = db.users[auth.userId];
  user.bankHolderName = payload.bankHolderName.trim();
  user.bankName = payload.bankName;
  user.payoutMethod = payload.bankName;
  user.bankAccountNumber = payload.bankAccountNumber.trim();
  user.payoutAccount = payload.bankAccountNumber.trim();
  user.bankCardVerified = true;
  writeDb(db);
  return buildBundle(db, auth.userId, auth.token);
}

export function localBuyVipPlan(token: string | null, planId: string): UserAccountBundle {
  const db = readDb();
  const auth = requireUser(db, token);
  const catalog = db.config.vipPlans && db.config.vipPlans.length > 0 ? db.config.vipPlans : VIP_PLANS;
  const plan = catalog.find((p) => p.id === planId);
  if (!plan) {
    throw new Error('VIP প্ল্যানটি পাওয়া যায়নি।');
  }
  const user = db.users[auth.userId];
  if (user.rechargeBalance < plan.price) {
    throw new Error(`রিচার্জ ব্যালেন্স পর্যাপ্ত নয়। প্রয়োজন ${plan.price.toLocaleString('en-US')} BDT।`);
  }

  user.rechargeBalance = Number((user.rechargeBalance - plan.price).toFixed(2));
  const nowIso = new Date().toISOString();
  const purchased: UserProduct = {
    id: randomId('prd'),
    planId: plan.id,
    tier: plan.tier,
    modelName: plan.modelName,
    price: plan.price,
    dailyIncome: plan.dailyIncome,
    totalIncome: plan.totalIncome,
    validityDays: plan.validityDays,
    daysClaimed: 0,
    lastClaimedAt: nowIso,
    purchasedAt: nowIso,
    image: plan.image,
    status: 'Active',
  };
  db.products[auth.userId] = db.products[auth.userId] || [];
  db.products[auth.userId].unshift(purchased);

  db.transactions[auth.userId] = db.transactions[auth.userId] || [];
  db.transactions[auth.userId].unshift({
    id: randomId('txn'),
    type: 'Investment',
    amount: plan.price,
    status: 'Completed',
    note: `${plan.tier} সক্রিয় হয়েছে — ${plan.modelName}`,
    createdAt: nowIso,
  });

  // Referral commission 25%, 2%, 1%
  const rates = [0.25, 0.02, 0.01];
  let currentRefId = user.referredBy;
  for (let lvl = 0; lvl < 3 && currentRefId; lvl++) {
    const upline = db.users[currentRefId];
    if (!upline) break;
    const commission = Number((plan.price * rates[lvl]).toFixed(2));
    upline.withdrawalBalance = Number((upline.withdrawalBalance + commission).toFixed(2));
    upline.invitedEarnings = Number((upline.invitedEarnings + commission).toFixed(2));
    const teamList = db.team[upline.id] || [];
    const memberEntry = teamList.find((m) => m.phone === user.phone);
    if (memberEntry) {
      memberEntry.validVip = true;
      memberEntry.totalInvested += plan.price;
      memberEntry.commissionEarned = Number((memberEntry.commissionEarned + commission).toFixed(2));
    }
    db.transactions[upline.id] = db.transactions[upline.id] || [];
    db.transactions[upline.id].unshift({
      id: randomId('txn'),
      type: 'Referral Bonus',
      amount: commission,
      status: 'Completed',
      note: `লেভেল ${lvl + 1} কমিশন (${rates[lvl] * 100}%) · ${maskPhone(user.phone)}`,
      createdAt: nowIso,
    });
    currentRefId = upline.referredBy;
  }

  writeDb(db);
  return buildBundle(db, auth.userId, auth.token);
}

export function localClaimProductIncome(
  token: string | null,
  productId: string
): UserAccountBundle {
  const db = readDb();
  const auth = requireUser(db, token);
  const products = db.products[auth.userId] || [];
  const product = products.find((p) => p.id === productId);
  if (!product) {
    throw new Error('পণ্যটি পাওয়া যায়নি।');
  }
  if (product.status === 'Completed' || product.daysClaimed >= product.validityDays) {
    throw new Error(`এই প্ল্যানের ${product.validityDays} দিনের মেয়াদ সম্পন্ন হয়েছে।`);
  }
  const nowMs = Date.now();
  if (product.lastClaimedAt) {
    const lastMs = new Date(product.lastClaimedAt).getTime();
    const diffMs = nowMs - lastMs;
    if (Number.isFinite(lastMs) && diffMs < 24 * 3600 * 1000) {
      const remHours = Math.ceil((24 * 3600 * 1000 - diffMs) / 3600000);
      throw new Error(`24 ঘণ্টা পূর্ণ হয়নি। প্রায় ${remHours} ঘণ্টা পর আবার ক্লেইম করতে পারবেন।`);
    }
  }

  product.daysClaimed += 1;
  product.lastClaimedAt = new Date(nowMs).toISOString();
  if (product.daysClaimed >= product.validityDays) {
    product.status = 'Completed';
  }
  const user = db.users[auth.userId];
  user.withdrawalBalance = Number((user.withdrawalBalance + product.dailyIncome).toFixed(2));
  db.transactions[auth.userId].unshift({
    id: randomId('txn'),
    type: 'Daily Income',
    amount: product.dailyIncome,
    status: 'Completed',
    note: `${product.tier} দৈনিক আয় (দিন ${product.daysClaimed}/${product.validityDays})`,
    createdAt: product.lastClaimedAt,
  });
  writeDb(db);
  return buildBundle(db, auth.userId, auth.token);
}

export function localClaimDailySalary(token: string | null): UserAccountBundle {
  const db = readDb();
  const auth = requireUser(db, token);
  const user = db.users[auth.userId];
  const today = new Date().toISOString().slice(0, 10);
  if (user.lastSalaryClaimDate === today) {
    throw new Error('আজকের দৈনিক বেতন ইতিমধ্যে নেওয়া হয়েছে।');
  }
  const validTeamCount = (db.team[auth.userId] || []).filter((m) => m.validVip).length;
  const bonus = validTeamCount >= 10 ? 150 : validTeamCount >= 3 ? 50 : 15;
  user.lastSalaryClaimDate = today;
  user.withdrawalBalance = Number((user.withdrawalBalance + bonus).toFixed(2));
  db.transactions[auth.userId].unshift({
    id: randomId('txn'),
    type: 'Daily Salary',
    amount: bonus,
    status: 'Completed',
    note: `দৈনিক বেতন বোনাস (${validTeamCount} জন বৈধ রেফারেল)`,
    createdAt: new Date().toISOString(),
  });
  writeDb(db);
  return buildBundle(db, auth.userId, auth.token);
}

export function localRedeemGiftCode(token: string | null, code: string): UserAccountBundle {
  const db = readDb();
  const auth = requireUser(db, token);
  const normalized = code.trim().toUpperCase();
  const gift = GIFT_CODE_CATALOG[normalized];
  if (!gift) {
    throw new Error('গিফট কোডটি সঠিক নয় বা মেয়াদ শেষ হয়েছে।');
  }
  const user = db.users[auth.userId];
  if (user.redeemedCodes.includes(normalized)) {
    throw new Error('আপনি ইতিমধ্যে এই গিফট কোডটি ব্যবহার করেছেন।');
  }
  user.redeemedCodes.push(normalized);
  user.rechargeBalance = Number((user.rechargeBalance + gift.amount).toFixed(2));
  db.transactions[auth.userId].unshift({
    id: randomId('txn'),
    type: 'Gift Code',
    amount: gift.amount,
    status: 'Completed',
    note: `গিফট কোড ${normalized} রিডিম হয়েছে`,
    createdAt: new Date().toISOString(),
  });
  writeDb(db);
  return buildBundle(db, auth.userId, auth.token);
}

export function localUpdateAccountDetails(
  token: string | null,
  payload: {
    fullName?: string;
    payoutMethod?: PayoutMethod;
    payoutAccount?: string;
    newPassword?: string;
  }
): UserAccountBundle {
  const db = readDb();
  const auth = requireUser(db, token);
  const user = db.users[auth.userId];
  if (payload.fullName?.trim()) user.fullName = payload.fullName.trim();
  if (payload.payoutMethod) {
    user.payoutMethod = payload.payoutMethod;
    user.bankName = payload.payoutMethod;
  }
  if (payload.payoutAccount?.trim()) {
    user.payoutAccount = payload.payoutAccount.trim();
    user.bankAccountNumber = payload.payoutAccount.trim();
    user.bankHolderName = user.bankHolderName || user.fullName;
    user.bankCardVerified = true;
  }
  if (payload.newPassword && payload.newPassword.trim().length >= 4) {
    user.password = payload.newPassword.trim();
  }
  writeDb(db);
  return buildBundle(db, auth.userId, auth.token);
}

// Admin local fallback operations
export function localAdminLogin(passcode: string): void {
  if (!passcode || passcode !== ADMIN_PASSCODE) {
    throw new Error('ভুল অ্যাডমিন পাসকোড।');
  }
}

function checkLocalAdmin(adminKey: string | null): void {
  if (!adminKey || adminKey !== ADMIN_PASSCODE) {
    throw new Error('অ্যাডমিন অনুমোদন প্রয়োজন');
  }
}

export function localAdminOverview(adminKey: string | null): AdminOverviewData {
  checkLocalAdmin(adminKey);
  const db = readDb();
  const allUsers = Object.values(db.users).map((u) => ({
    ...toPublicUser(u),
    productCount: (db.products[u.id] || []).length,
  }));
  const totalActiveInvestors = allUsers.filter((u) => u.productCount > 0).length;
  const totalConfirmedDeposits = db.deposits
    .filter((d) => d.status === 'Confirmed')
    .reduce((sum, d) => sum + d.amount + d.bonusAmount, 0);

  return {
    totalUsers: allUsers.length,
    totalActiveInvestors,
    totalConfirmedDeposits,
    pendingDepositCount: db.deposits.filter((d) => d.status === 'Pending').length,
    pendingWithdrawCount: db.withdrawals.filter((w) => w.status === 'Processing').length,
    users: allUsers.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    deposits: db.deposits,
    withdrawals: db.withdrawals,
    config: db.config,
  };
}

export function localAdminAdjustBalance(
  adminKey: string | null,
  payload: {
    userId: string;
    walletType: 'recharge' | 'withdrawal';
    action: 'add' | 'deduct';
    amount: number;
    reason?: string;
  }
): void {
  checkLocalAdmin(adminKey);
  const db = readDb();
  const user = db.users[payload.userId];
  if (!user) throw new Error('ইউজার পাওয়া যায়নি।');
  const num = Number(payload.amount);
  if (!Number.isFinite(num) || num <= 0) throw new Error('সঠিক অ্যামাউন্ট দিন।');

  if (payload.walletType === 'withdrawal') {
    user.withdrawalBalance =
      payload.action === 'deduct'
        ? Math.max(0, Number((user.withdrawalBalance - num).toFixed(2)))
        : Number((user.withdrawalBalance + num).toFixed(2));
  } else {
    user.rechargeBalance =
      payload.action === 'deduct'
        ? Math.max(0, Number((user.rechargeBalance - num).toFixed(2)))
        : Number((user.rechargeBalance + num).toFixed(2));
  }

  db.transactions[user.id] = db.transactions[user.id] || [];
  db.transactions[user.id].unshift({
    id: randomId('txn_adm'),
    type: payload.action === 'deduct' ? 'Withdraw' : 'Recharge',
    amount: num,
    status: 'Completed',
    note:
      payload.reason?.trim() ||
      `অ্যাডমিন ${payload.walletType === 'withdrawal' ? 'উত্তোলন' : 'রিচার্জ'} ব্যালেন্স ${
        payload.action === 'deduct' ? 'কেটে নিয়েছেন' : 'যোগ করেছেন'
      }`,
    createdAt: new Date().toISOString(),
  });
  writeDb(db);
}

export function localAdminConfirmDeposit(adminKey: string | null, id: string): void {
  checkLocalAdmin(adminKey);
  const db = readDb();
  const dep = db.deposits.find((d) => d.id === id);
  if (!dep) throw new Error('ডিপোজিট পাওয়া যায়নি');
  if (dep.status !== 'Pending') throw new Error('ডিপোজিট ইতিমধ্যে প্রসেস করা হয়েছে');
  dep.status = 'Confirmed';
  const user = db.users[dep.userId];
  if (user) {
    user.rechargeBalance = Number((user.rechargeBalance + dep.amount + dep.bonusAmount).toFixed(2));
    const txn = (db.transactions[user.id] || []).find((t) => t.id === dep.id);
    if (txn) {
      txn.status = 'Completed';
      txn.note = `কনফার্মড ${dep.method} (${dep.channel}) · TrxID ${dep.txId}`;
    }
  }
  writeDb(db);
}

export function localAdminRejectDeposit(adminKey: string | null, id: string): void {
  checkLocalAdmin(adminKey);
  const db = readDb();
  const dep = db.deposits.find((d) => d.id === id);
  if (!dep) throw new Error('ডিপোজিট পাওয়া যায়নি');
  if (dep.status !== 'Pending') throw new Error('ডিপোজিট ইতিমধ্যে প্রসেস করা হয়েছে');
  dep.status = 'Rejected';
  const txn = (db.transactions[dep.userId] || []).find((t) => t.id === dep.id);
  if (txn) {
    txn.status = 'Rejected';
    txn.note = `বাতিলকৃত ${dep.method} (${dep.channel}) · TrxID ${dep.txId}`;
  }
  writeDb(db);
}

export function localAdminApproveWithdraw(adminKey: string | null, id: string): void {
  checkLocalAdmin(adminKey);
  const db = readDb();
  const wd = db.withdrawals.find((w) => w.id === id);
  if (!wd) throw new Error('উত্তোলন পাওয়া যায়নি');
  wd.status = 'Approved';
  const txn = (db.transactions[wd.userId] || []).find((t) => t.id === wd.id);
  if (txn) txn.status = 'Completed';
  writeDb(db);
}

export function localAdminRejectWithdraw(adminKey: string | null, id: string): void {
  checkLocalAdmin(adminKey);
  const db = readDb();
  const wd = db.withdrawals.find((w) => w.id === id);
  if (!wd) throw new Error('উত্তোলন পাওয়া যায়নি');
  if (wd.status !== 'Processing') throw new Error('ইতিমধ্যে প্রসেস হয়েছে');
  wd.status = 'Rejected';
  const user = db.users[wd.userId];
  if (user) {
    user.withdrawalBalance = Number((user.withdrawalBalance + wd.amount).toFixed(2));
  }
  const txn = (db.transactions[wd.userId] || []).find((t) => t.id === wd.id);
  if (txn) {
    txn.status = 'Rejected';
    txn.note = `অ্যাডমিন কর্তৃক বাতিল ও ব্যালেন্স ফেরত (${wd.method})`;
  }
  writeDb(db);
}

export function localAdminAddPaymentNumber(
  adminKey: string | null,
  payload: Omit<PaymentNumberEntry, 'id'>
): PublicAppConfig {
  checkLocalAdmin(adminKey);
  const db = readDb();
  if (!payload.method || !payload.channelLabel?.trim() || !payload.number?.trim()) {
    throw new Error('মেথড, চ্যানেল এবং পেমেন্ট নম্বর দিন।');
  }
  db.config.paymentNumbers.unshift({
    id: randomId('pn'),
    method: payload.method,
    channelLabel: payload.channelLabel.trim(),
    number: payload.number.trim(),
    typeLabel: payload.typeLabel?.trim() || 'পার্সোনাল (সেন্ড মানি)',
  });
  writeDb(db);
  return db.config;
}

export function localAdminDeletePaymentNumber(
  adminKey: string | null,
  id: string
): PublicAppConfig {
  checkLocalAdmin(adminKey);
  const db = readDb();
  db.config.paymentNumbers = db.config.paymentNumbers.filter((p) => p.id !== id);
  writeDb(db);
  return db.config;
}

export function localAdminSaveSettings(
  adminKey: string | null,
  payload: Partial<PublicAppConfig>
): PublicAppConfig {
  checkLocalAdmin(adminKey);
  const db = readDb();
  if (typeof payload.telegramGroupUrl === 'string' && payload.telegramGroupUrl.trim()) {
    db.config.telegramGroupUrl = payload.telegramGroupUrl.trim();
  }
  if (typeof payload.supportUrl === 'string' && payload.supportUrl.trim()) {
    db.config.supportUrl = payload.supportUrl.trim();
  }
  if (typeof payload.welcomeNotice === 'string') {
    db.config.welcomeNotice = payload.welcomeNotice.trim();
  }
  if (typeof payload.registrationBonus === 'number' && payload.registrationBonus >= 0) {
    db.config.registrationBonus = payload.registrationBonus;
  }
  writeDb(db);
  return db.config;
}

export function localAdminSavePlans(adminKey: string | null, plans: VipPlan[]): PublicAppConfig {
  checkLocalAdmin(adminKey);
  if (!Array.isArray(plans) || plans.length === 0) {
    throw new Error('সঠিক প্ল্যানের তথ্য দিন।');
  }
  const db = readDb();
  const sanitized: VipPlan[] = plans.map((p) => {
    const price = Number(p.price);
    const dailyIncome = Number(p.dailyIncome);
    const validityDays = Math.round(Number(p.validityDays));
    const totalIncome = Number(p.totalIncome);
    if (!Number.isFinite(price) || price < 1) {
      throw new Error(`${p.tier} এর দাম কমপক্ষে 1 BDT হতে হবে।`);
    }
    if (!Number.isFinite(dailyIncome) || dailyIncome < 1) {
      throw new Error(`${p.tier} এর দৈনিক আয় কমপক্ষে 1 BDT হতে হবে।`);
    }
    if (!Number.isFinite(validityDays) || validityDays < 1 || validityDays > 365) {
      throw new Error(`${p.tier} এর মেয়াদ 1 থেকে 365 দিনের মধ্যে হতে হবে।`);
    }
    const safeTotal =
      Number.isFinite(totalIncome) && totalIncome >= 1
        ? Number(totalIncome.toFixed(2))
        : Number((dailyIncome * validityDays).toFixed(2));
    return {
      ...p,
      price: Number(price.toFixed(2)),
      dailyIncome: Number(dailyIncome.toFixed(2)),
      validityDays,
      totalIncome: safeTotal,
    };
  });
  db.config.vipPlans = sanitized;
  writeDb(db);
  return db.config;
}
