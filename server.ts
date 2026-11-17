import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GIFT_CODE_CATALOG, VIP_PLANS } from './src/data/plans.ts';
import type {
  AdminDepositRequest,
  AdminWithdrawRequest,
  PaymentNumberEntry,
  PayoutMethod,
  PublicAppConfig,
  TeamMember,
  TransactionRecord,
  UserAccountBundle,
  UserProduct,
  UserProfile,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '.data');
const DB_FILE = path.join(DATA_DIR, 'nexasworld-db.json');
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'admin123';

interface StoredUser extends UserProfile {
  passwordHash: string;
}

interface DatabaseSchema {
  users: Record<string, StoredUser>;
  sessions: Record<string, string>; // token -> userId
  products: Record<string, UserProduct[]>; // userId -> products
  transactions: Record<string, TransactionRecord[]>; // userId -> transactions
  team: Record<string, TeamMember[]>; // userId -> team members
  deposits: AdminDepositRequest[];
  withdrawals: AdminWithdrawRequest[];
  config: PublicAppConfig;
}

function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
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

function createDefaultConfig(): PublicAppConfig {
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
  };
}

function createSeedDatabase(): DatabaseSchema {
  const demoUserId = 'usr_demo_83100';
  const yesterdayIso = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();

  const demoUser: StoredUser = {
    id: demoUserId,
    phone: '+8801789083100',
    fullName: 'Arif Rahman',
    referralCode: 'NXW83100',
    rechargeBalance: 2500,
    withdrawalBalance: 850,
    invitedEarnings: 530,
    payoutMethod: 'bKash',
    payoutAccount: '01789083100',
    bankHolderName: 'Arif Rahman',
    bankName: 'bKash',
    bankAccountNumber: '01789083100',
    bankCardVerified: true,
    lastSalaryClaimDate: yesterdayIso.slice(0, 10),
    redeemedCodes: [],
    createdAt: fiveDaysAgo,
    passwordHash: hashPassword('123456'),
  };

  const demoProducts: UserProduct[] = [
    {
      id: 'prd_seed_01',
      planId: 'vip-1',
      tier: 'VIP 1',
      modelName: 'Obsidian Coupe GT',
      price: 500,
      dailyIncome: 10,
      totalIncome: 300,
      validityDays: 30,
      daysClaimed: 2,
      lastClaimedAt: yesterdayIso,
      purchasedAt: twoDaysAgo,
      image: VIP_PLANS[0].image,
      status: 'Active',
    },
  ];

  const demoTransactions: TransactionRecord[] = [
    {
      id: 'txn_seed_00',
      type: 'Registration Bonus',
      amount: 150,
      status: 'Completed',
      note: 'নতুন অ্যাকাউন্ট নিবন্ধন বোনাস ১৫০ টাকা',
      createdAt: fiveDaysAgo,
    },
    {
      id: 'txn_seed_01',
      type: 'Recharge',
      amount: 3000,
      method: 'bKash',
      channel: 'GOPAY-BK',
      txId: 'BKX904821A',
      status: 'Completed',
      note: 'Send Money via bKash (GOPAY-BK)',
      createdAt: fiveDaysAgo,
    },
    {
      id: 'txn_seed_02',
      type: 'Investment',
      amount: 500,
      status: 'Completed',
      note: 'Activated VIP 1 — Obsidian Coupe GT',
      createdAt: twoDaysAgo,
    },
    {
      id: 'txn_seed_03',
      type: 'Referral Bonus',
      amount: 375,
      status: 'Completed',
      note: 'Level 1 Commission (25%) from +88019****214',
      createdAt: twoDaysAgo,
    },
    {
      id: 'txn_seed_04',
      type: 'Daily Income',
      amount: 10,
      status: 'Completed',
      note: 'VIP 1 daily return payout',
      createdAt: yesterdayIso,
    },
  ];

  const demoTeam: TeamMember[] = [
    {
      id: 'tm_seed_01',
      phone: '+8801922014214',
      level: 1,
      joinedAt: twoDaysAgo,
      validVip: true,
      totalInvested: 1500,
      commissionEarned: 375,
    },
    {
      id: 'tm_seed_02',
      phone: '+8801841229901',
      level: 1,
      joinedAt: twoDaysAgo,
      validVip: true,
      totalInvested: 500,
      commissionEarned: 125,
    },
    {
      id: 'tm_seed_03',
      phone: '+8801611487720',
      level: 2,
      joinedAt: yesterdayIso,
      validVip: true,
      totalInvested: 1500,
      commissionEarned: 30,
    },
  ];

  return {
    users: {
      [demoUserId]: demoUser,
    },
    sessions: {
      demo_session_token: demoUserId,
    },
    products: {
      [demoUserId]: demoProducts,
    },
    transactions: {
      [demoUserId]: demoTransactions,
    },
    team: {
      [demoUserId]: demoTeam,
    },
    deposits: [],
    withdrawals: [],
    config: createDefaultConfig(),
  };
}

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
      const seeded = createSeedDatabase();
      // Backfill new schema keys seamlessly if an older DB exists
      const users: Record<string, StoredUser> = {};
      for (const [id, u] of Object.entries(parsed.users || seeded.users)) {
        users[id] = {
          ...u,
          bankHolderName: u.bankHolderName ?? u.fullName ?? '',
          bankName: u.bankName ?? u.payoutMethod ?? 'bKash',
          bankAccountNumber: u.bankAccountNumber ?? u.payoutAccount ?? '',
          bankCardVerified: u.bankCardVerified ?? Boolean(u.payoutAccount),
        };
      }
      const cfg = parsed.config || createDefaultConfig();
      if (Array.isArray(cfg.paymentNumbers)) {
        cfg.paymentNumbers = cfg.paymentNumbers.map((pn) => {
          if (
            (pn.id === 'pn_bk_1' && pn.number === '01580607823') ||
            (pn.id === 'pn_ng_1' && pn.number === '01844201938')
          ) {
            return { ...pn, number: '01964115795', typeLabel: 'পার্সোনাল (সেন্ড মানি)' };
          }
          return pn;
        });
      }
      return {
        users,
        sessions: parsed.sessions || seeded.sessions,
        products: parsed.products || seeded.products,
        transactions: parsed.transactions || seeded.transactions,
        team: parsed.team || seeded.team,
        deposits: parsed.deposits || [],
        withdrawals: parsed.withdrawals || [],
        config: cfg,
      };
    }
  } catch (err) {
    console.error('Failed to read DB file, resetting seed:', err);
  }
  const seeded = createSeedDatabase();
  saveDatabase(seeded);
  return seeded;
}

function saveDatabase(db: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

const db = loadDatabase();

// Live SSE subscribers for instant admin-to-user sync
const sseClients = new Set<express.Response>();

function broadcastSync(reason: string): void {
  const payload = JSON.stringify({ reason, ts: Date.now() });
  for (const res of sseClients) {
    try {
      res.write(`event: sync\ndata: ${payload}\n\n`);
    } catch {
      sseClients.delete(res);
    }
  }
}

function toPublicUser(user: StoredUser): UserProfile {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

function buildBundle(userId: string, token: string): UserAccountBundle {
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

function getAuthenticatedUserId(req: express.Request): { userId: string; token: string } | null {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : 'demo_session_token';
  const userId = db.sessions[token];
  if (!userId || !db.users[userId]) {
    return null;
  }
  return { userId, token };
}

function isAdminAuthorized(req: express.Request): boolean {
  const key = req.headers['x-admin-key'];
  return typeof key === 'string' && key === ADMIN_PASSCODE;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/config', (_req, res) => {
    res.json(db.config);
  });

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.get('/api/me', (req, res) => {
    const auth = getAuthenticatedUserId(req);
    if (!auth) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    res.json(buildBundle(auth.userId, auth.token));
  });

  app.post('/api/auth/login', (req, res) => {
    const { phone, password } = req.body as { phone?: string; password?: string };
    if (!phone || !password) {
      res.status(400).json({ error: 'মোবাইল নম্বর এবং পাসওয়ার্ড দিন।' });
      return;
    }
    const normalized = normalizePhone(phone);
    const matched = Object.values(db.users).find((u) => u.phone === normalized);
    if (!matched || matched.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: 'মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়।' });
      return;
    }
    const token = 'tok_' + crypto.randomBytes(16).toString('hex');
    db.sessions[token] = matched.id;
    saveDatabase(db);
    res.json(buildBundle(matched.id, token));
  });

  app.post('/api/auth/register', (req, res) => {
    const { phone, password, fullName, referralCode } = req.body as {
      phone?: string;
      password?: string;
      fullName?: string;
      referralCode?: string;
    };
    if (!phone || !password || password.length < 4) {
      res.status(400).json({ error: 'সঠিক মোবাইল নম্বর এবং কমপক্ষে 4 অক্ষরের পাসওয়ার্ড দিন।' });
      return;
    }
    const normalized = normalizePhone(phone);
    const existing = Object.values(db.users).find((u) => u.phone === normalized);
    if (existing) {
      res.status(409).json({ error: 'এই মোবাইল নম্বরটি ইতিমধ্যে নিবন্ধিত আছে।' });
      return;
    }

    const userId = 'usr_' + crypto.randomBytes(6).toString('hex');
    const newCode = 'NXW' + Math.floor(10000 + Math.random() * 89999);
    const referrer = referralCode
      ? Object.values(db.users).find(
          (u) => u.referralCode.toUpperCase() === referralCode.trim().toUpperCase()
        )
      : undefined;

    const regBonus = db.config.registrationBonus || 150;

    const newUser: StoredUser = {
      id: userId,
      phone: normalized,
      fullName: fullName?.trim() || 'Nexas সদস্য',
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
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(password),
    };

    db.users[userId] = newUser;
    db.products[userId] = [];
    db.transactions[userId] = [
      {
        id: 'txn_reg_' + crypto.randomBytes(4).toString('hex'),
        type: 'Registration Bonus',
        amount: regBonus,
        status: 'Completed',
        note: `নিবন্ধন বোনাস ${regBonus} BDT`,
        createdAt: newUser.createdAt,
      },
    ];
    db.team[userId] = [];

    if (referrer) {
      db.team[referrer.id] = db.team[referrer.id] || [];
      db.team[referrer.id].unshift({
        id: 'tm_' + userId,
        phone: normalized,
        level: 1,
        joinedAt: newUser.createdAt,
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
          joinedAt: newUser.createdAt,
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
            joinedAt: newUser.createdAt,
            validVip: false,
            totalInvested: 0,
            commissionEarned: 0,
          });
        }
      }
    }

    const token = 'tok_' + crypto.randomBytes(16).toString('hex');
    db.sessions[token] = userId;
    saveDatabase(db);
    broadcastSync('register');
    res.json(buildBundle(userId, token));
  });

  app.post('/api/auth/google', (req, res) => {
    const { uid, email, displayName, referralCode } = req.body as {
      uid?: string;
      email?: string;
      displayName?: string;
      referralCode?: string;
    };
    const cleanUid = uid?.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
    if (!cleanUid || cleanUid.length < 4) {
      res.status(400).json({ error: 'সঠিক Google অ্যাকাউন্ট তথ্য পাওয়া যায়নি।' });
      return;
    }

    let existingUser = db.users[cleanUid];
    if (!existingUser) {
      const regBonus = db.config.registrationBonus || 150;
      const newCode = 'NXW' + cleanUid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
      const referrer = referralCode
        ? Object.values(db.users).find(
            (u) => u.referralCode.toUpperCase() === referralCode.trim().toUpperCase()
          )
        : undefined;
      const safePhone = (email || `usr_${cleanUid.slice(0, 10)}`).trim().slice(0, 32);

      existingUser = {
        id: cleanUid,
        phone: safePhone,
        fullName: displayName?.trim().slice(0, 100) || email?.split('@')[0] || 'Nexas সদস্য',
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
        createdAt: new Date().toISOString(),
        passwordHash: hashPassword('123456'),
      };

      db.users[cleanUid] = existingUser;
      db.products[cleanUid] = [];
      db.transactions[cleanUid] = [
        {
          id: 'txn_reg_' + crypto.randomBytes(4).toString('hex'),
          type: 'Registration Bonus',
          amount: regBonus,
          status: 'Completed',
          note: `Google নিবন্ধন বোনাস ${regBonus} BDT`,
          createdAt: existingUser.createdAt,
        },
      ];
      db.team[cleanUid] = [];

      if (referrer) {
        db.team[referrer.id] = db.team[referrer.id] || [];
        db.team[referrer.id].unshift({
          id: 'tm_' + cleanUid,
          phone: safePhone,
          level: 1,
          joinedAt: existingUser.createdAt,
          validVip: false,
          totalInvested: 0,
          commissionEarned: 0,
        });
      }
    }

    const token = 'tok_' + crypto.randomBytes(16).toString('hex');
    db.sessions[token] = existingUser.id;
    saveDatabase(db);
    broadcastSync('google_auth');
    res.json(buildBundle(existingUser.id, token));
  });

  // Deposit submission creates a Pending Deposit for Admin confirmation
  app.post('/api/recharge', (req, res) => {
    const auth = getAuthenticatedUserId(req);
    if (!auth) {
      res.status(401).json({ error: 'Please sign in first.' });
      return;
    }
    const { amount, method, channel, txId, bonusPct } = req.body as {
      amount?: number;
      method?: string;
      channel?: string;
      txId?: string;
      bonusPct?: number;
    };
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 300) {
      res.status(400).json({ error: 'সর্বনিম্ন রিচার্জ পরিমাণ 300 BDT।' });
      return;
    }
    const cleanTxId = txId?.trim();
    if (!cleanTxId || cleanTxId.length < 4) {
      res.status(400).json({ error: 'TrxID অবশ্যই পূরণ করতে হবে!' });
      return;
    }

    const bonus = bonusPct && bonusPct > 0 ? Number(((numericAmount * bonusPct) / 100).toFixed(2)) : 0;
    const user = db.users[auth.userId];
    const depId = 'dep_' + crypto.randomBytes(6).toString('hex');

    const depositReq: AdminDepositRequest = {
      id: depId,
      userId: user.id,
      userPhone: user.phone,
      userName: user.fullName,
      amount: numericAmount,
      bonusAmount: bonus,
      method: method || 'bKash',
      channel: channel || 'GOPAY-BK',
      txId: cleanTxId,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    db.deposits.unshift(depositReq);

    const txn: TransactionRecord = {
      id: depId,
      type: 'Recharge',
      amount: numericAmount + bonus,
      method: depositReq.method,
      channel: depositReq.channel,
      txId: cleanTxId,
      status: 'Processing',
      note: `${depositReq.method} (${depositReq.channel}) সেন্ড মানি · TrxID ${cleanTxId} (অ্যাডমিন যাচাইয়ের অপেক্ষায়)`,
      createdAt: depositReq.createdAt,
    };
    db.transactions[auth.userId].unshift(txn);
    saveDatabase(db);
    broadcastSync('new_deposit');
    res.json(buildBundle(auth.userId, auth.token));
  });

  // Withdraw enforces: 1) Active/purchased VIP package required, 2) Bank Card setup required
  app.post('/api/withdraw', (req, res) => {
    const auth = getAuthenticatedUserId(req);
    if (!auth) {
      res.status(401).json({ error: 'অনুগ্রহ করে আগে লগইন করুন।' });
      return;
    }
    const user = db.users[auth.userId];
    const userProducts = db.products[auth.userId] || [];

    if (userProducts.length === 0) {
      res.status(400).json({
        error: 'উত্তোলন করতে হলে আগে রিচার্জ করে কমপক্ষে 1 টি VIP প্যাকেজ কিনতে হবে।',
      });
      return;
    }

    if (!user.bankCardVerified || !user.bankAccountNumber?.trim()) {
      res.status(400).json({
        error: 'উত্তোলন করার আগে আপনার ব্যাংক কার্ড সেটআপ সম্পন্ন করুন।',
      });
      return;
    }

    const { amount, password } = req.body as {
      amount?: number;
      password?: string;
    };
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 200) {
      res.status(400).json({ error: 'সর্বনিম্ন উত্তোলন 200 BDT।' });
      return;
    }
    if (numericAmount > user.withdrawalBalance) {
      res.status(400).json({ error: 'উত্তোলন ব্যালেন্স পর্যাপ্ত নয়।' });
      return;
    }
    if (!password || user.passwordHash !== hashPassword(password)) {
      res.status(403).json({ error: 'অ্যাকাউন্টের পাসওয়ার্ড সঠিক নয়।' });
      return;
    }

    user.withdrawalBalance = Number((user.withdrawalBalance - numericAmount).toFixed(2));
    const wdId = 'wd_' + crypto.randomBytes(6).toString('hex');
    const createdAt = new Date().toISOString();

    const withdrawReq: AdminWithdrawRequest = {
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
    };
    db.withdrawals.unshift(withdrawReq);

    const txn: TransactionRecord = {
      id: wdId,
      type: 'Withdraw',
      amount: numericAmount,
      method: user.payoutMethod,
      accountRef: user.bankAccountNumber,
      status: 'Processing',
      note: `${user.bankName} (${user.bankAccountNumber}) নম্বরে উত্তোলন অনুরোধ`,
      createdAt,
    };
    db.transactions[auth.userId].unshift(txn);
    saveDatabase(db);
    broadcastSync('new_withdraw');
    res.json(buildBundle(auth.userId, auth.token));
  });

  app.put('/api/account/bank-card', (req, res) => {
    const auth = getAuthenticatedUserId(req);
    if (!auth) {
      res.status(401).json({ error: 'Please sign in first.' });
      return;
    }
    const { bankHolderName, bankName, bankAccountNumber } = req.body as {
      bankHolderName?: string;
      bankName?: PayoutMethod;
      bankAccountNumber?: string;
    };
    if (!bankHolderName?.trim() || !bankName || !bankAccountNumber?.trim()) {
      res.status(400).json({ error: 'অ্যাকাউন্ট হোল্ডারের নাম, ব্যাংক/মেথড এবং নম্বর দিন।' });
      return;
    }
    const user = db.users[auth.userId];
    user.bankHolderName = bankHolderName.trim();
    user.bankName = bankName;
    user.payoutMethod = bankName;
    user.bankAccountNumber = bankAccountNumber.trim();
    user.payoutAccount = bankAccountNumber.trim();
    user.bankCardVerified = true;
    saveDatabase(db);
    res.json(buildBundle(auth.userId, auth.token));
  });

  app.post('/api/products/buy', (req, res) => {
    const auth = getAuthenticatedUserId(req);
    if (!auth) {
      res.status(401).json({ error: 'Please sign in first.' });
      return;
    }
    const { planId } = req.body as { planId?: string };
    const plan = VIP_PLANS.find((p) => p.id === planId);
    if (!plan) {
      res.status(404).json({ error: 'VIP plan not found.' });
      return;
    }
    const user = db.users[auth.userId];
    if (user.rechargeBalance < plan.price) {
      res.status(400).json({
        error: `রিচার্জ ব্যালেন্স পর্যাপ্ত নয়। প্রয়োজন ${plan.price.toLocaleString()} BDT।`,
      });
      return;
    }

    user.rechargeBalance = Number((user.rechargeBalance - plan.price).toFixed(2));
    const nowIso = new Date().toISOString();
    const purchased: UserProduct = {
      id: 'prd_' + crypto.randomBytes(6).toString('hex'),
      planId: plan.id,
      tier: plan.tier,
      modelName: plan.modelName,
      price: plan.price,
      dailyIncome: plan.dailyIncome,
      totalIncome: plan.totalIncome,
      validityDays: plan.validityDays,
      daysClaimed: 0,
      lastClaimedAt: nowIso, // Starts 24-hour cycle reminder from purchase
      purchasedAt: nowIso,
      image: plan.image,
      status: 'Active',
    };
    db.products[auth.userId].unshift(purchased);

    db.transactions[auth.userId].unshift({
      id: 'txn_' + crypto.randomBytes(6).toString('hex'),
      type: 'Investment',
      amount: plan.price,
      status: 'Completed',
      note: `${plan.tier} সক্রিয় হয়েছে — ${plan.modelName}`,
      createdAt: nowIso,
    });

    // Referral commissions: 25%, 2%, 1%
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
        id: 'txn_' + crypto.randomBytes(6).toString('hex'),
        type: 'Referral Bonus',
        amount: commission,
        status: 'Completed',
        note: `লেভেল ${lvl + 1} কমিশন (${rates[lvl] * 100}%) · ${maskPhone(user.phone)}`,
        createdAt: nowIso,
      });
      currentRefId = upline.referredBy;
    }

    saveDatabase(db);
    broadcastSync('buy_plan');
    res.json(buildBundle(auth.userId, auth.token));
  });

  // 24-hour cycle claim check
  app.post('/api/products/claim', (req, res) => {
    const auth = getAuthenticatedUserId(req);
    if (!auth) {
      res.status(401).json({ error: 'অনুগ্রহ করে আগে লগইন করুন।' });
      return;
    }
    const { productId } = req.body as { productId?: string };
    const products = db.products[auth.userId] || [];
    const product = products.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: 'পণ্যটি পাওয়া যায়নি।' });
      return;
    }
    if (product.status === 'Completed' || product.daysClaimed >= product.validityDays) {
      res.status(400).json({ error: 'এই প্ল্যানের 30 দিনের মেয়াদ সম্পন্ন হয়েছে।' });
      return;
    }

    const nowMs = Date.now();
    if (product.lastClaimedAt) {
      const lastMs = new Date(product.lastClaimedAt).getTime();
      const diffMs = nowMs - lastMs;
      if (Number.isFinite(lastMs) && diffMs < 24 * 3600 * 1000) {
        const remHours = Math.ceil((24 * 3600 * 1000 - diffMs) / 3600000);
        res.status(400).json({
          error: `24 ঘণ্টা পূর্ণ হয়নি। প্রায় ${remHours} ঘণ্টা পর আবার ক্লেইম করতে পারবেন।`,
        });
        return;
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
      id: 'txn_' + crypto.randomBytes(6).toString('hex'),
      type: 'Daily Income',
      amount: product.dailyIncome,
      status: 'Completed',
      note: `${product.tier} দৈনিক আয় (দিন ${product.daysClaimed}/${product.validityDays})`,
      createdAt: product.lastClaimedAt,
    });

    saveDatabase(db);
    res.json(buildBundle(auth.userId, auth.token));
  });

  app.post('/api/salary/claim', (req, res) => {
    const auth = getAuthenticatedUserId(req);
    if (!auth) {
      res.status(401).json({ error: 'অনুগ্রহ করে আগে লগইন করুন।' });
      return;
    }
    const user = db.users[auth.userId];
    const today = todayIsoDate();
    if (user.lastSalaryClaimDate === today) {
      res.status(400).json({ error: 'আজকের দৈনিক বেতন ইতিমধ্যে নেওয়া হয়েছে।' });
      return;
    }
    const validTeamCount = (db.team[auth.userId] || []).filter((m) => m.validVip).length;
    const bonus = validTeamCount >= 10 ? 150 : validTeamCount >= 3 ? 50 : 15;
    user.lastSalaryClaimDate = today;
    user.withdrawalBalance = Number((user.withdrawalBalance + bonus).toFixed(2));
    db.transactions[auth.userId].unshift({
      id: 'txn_' + crypto.randomBytes(6).toString('hex'),
      type: 'Daily Salary',
      amount: bonus,
      status: 'Completed',
      note: `দৈনিক বেতন বোনাস (${validTeamCount} জন বৈধ রেফারেল)`,
      createdAt: new Date().toISOString(),
    });
    saveDatabase(db);
    res.json(buildBundle(auth.userId, auth.token));
  });

  app.post('/api/gift/redeem', (req, res) => {
    const auth = getAuthenticatedUserId(req);
    if (!auth) {
      res.status(401).json({ error: 'অনুগ্রহ করে আগে লগইন করুন।' });
      return;
    }
    const { code } = req.body as { code?: string };
    const normalized = code?.trim().toUpperCase() || '';
    const gift = GIFT_CODE_CATALOG[normalized];
    if (!gift) {
      res.status(404).json({ error: 'গিফট কোডটি সঠিক নয় বা মেয়াদ শেষ হয়েছে।' });
      return;
    }
    const user = db.users[auth.userId];
    if (user.redeemedCodes.includes(normalized)) {
      res.status(400).json({ error: 'আপনি ইতিমধ্যে এই গিফট কোডটি ব্যবহার করেছেন।' });
      return;
    }
    user.redeemedCodes.push(normalized);
    user.rechargeBalance = Number((user.rechargeBalance + gift.amount).toFixed(2));
    db.transactions[auth.userId].unshift({
      id: 'txn_' + crypto.randomBytes(6).toString('hex'),
      type: 'Gift Code',
      amount: gift.amount,
      status: 'Completed',
      note: `গিফট কোড ${normalized} রিডিম হয়েছে`,
      createdAt: new Date().toISOString(),
    });
    saveDatabase(db);
    res.json(buildBundle(auth.userId, auth.token));
  });

  app.put('/api/account/details', (req, res) => {
    const auth = getAuthenticatedUserId(req);
    if (!auth) {
      res.status(401).json({ error: 'Please sign in first.' });
      return;
    }
    const { fullName, payoutMethod, payoutAccount, newPassword } = req.body as {
      fullName?: string;
      payoutMethod?: PayoutMethod;
      payoutAccount?: string;
      newPassword?: string;
    };
    const user = db.users[auth.userId];
    if (fullName?.trim()) user.fullName = fullName.trim();
    if (payoutMethod) {
      user.payoutMethod = payoutMethod;
      user.bankName = payoutMethod;
    }
    if (payoutAccount?.trim()) {
      user.payoutAccount = payoutAccount.trim();
      user.bankAccountNumber = payoutAccount.trim();
      user.bankHolderName = user.bankHolderName || user.fullName;
      user.bankCardVerified = true;
    }
    if (newPassword && newPassword.trim().length >= 4) {
      user.passwordHash = hashPassword(newPassword.trim());
    }
    saveDatabase(db);
    res.json(buildBundle(auth.userId, auth.token));
  });

  // =========================================================================
  // ADMIN PANEL API ROUTES (Separate /admin route, live broadcast to users)
  // =========================================================================
  app.post('/api/admin/login', (req, res) => {
    const { passcode } = req.body as { passcode?: string };
    if (!passcode || passcode !== ADMIN_PASSCODE) {
      res.status(401).json({ error: 'ভুল অ্যাডমিন পাসকোড।' });
      return;
    }
    res.json({ ok: true });
  });

  app.get('/api/admin/overview', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Admin authorization required' });
      return;
    }
    const allUsers = Object.values(db.users).map((u) => ({
      ...toPublicUser(u),
      productCount: (db.products[u.id] || []).length,
    }));
    const totalActiveInvestors = allUsers.filter((u) => u.productCount > 0).length;
    const totalConfirmedDeposits = db.deposits
      .filter((d) => d.status === 'Confirmed')
      .reduce((sum, d) => sum + d.amount + d.bonusAmount, 0);

    res.json({
      totalUsers: allUsers.length,
      totalActiveInvestors,
      totalConfirmedDeposits,
      pendingDepositCount: db.deposits.filter((d) => d.status === 'Pending').length,
      pendingWithdrawCount: db.withdrawals.filter((w) => w.status === 'Processing').length,
      users: allUsers.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      deposits: db.deposits,
      withdrawals: db.withdrawals,
      config: db.config,
    });
  });

  app.post('/api/admin/users/balance', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Admin authorization required' });
      return;
    }
    const { userId, walletType, action, amount, reason } = req.body as {
      userId?: string;
      walletType?: 'recharge' | 'withdrawal';
      action?: 'add' | 'deduct';
      amount?: number;
      reason?: string;
    };
    const user = userId ? db.users[userId] : undefined;
    if (!user) {
      res.status(404).json({ error: 'ইউজার পাওয়া যায়নি।' });
      return;
    }
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      res.status(400).json({ error: 'সঠিক অ্যামাউন্ট দিন।' });
      return;
    }

    if (walletType === 'withdrawal') {
      if (action === 'deduct') {
        user.withdrawalBalance = Math.max(0, Number((user.withdrawalBalance - num).toFixed(2)));
      } else {
        user.withdrawalBalance = Number((user.withdrawalBalance + num).toFixed(2));
      }
    } else {
      if (action === 'deduct') {
        user.rechargeBalance = Math.max(0, Number((user.rechargeBalance - num).toFixed(2)));
      } else {
        user.rechargeBalance = Number((user.rechargeBalance + num).toFixed(2));
      }
    }

    db.transactions[user.id] = db.transactions[user.id] || [];
    db.transactions[user.id].unshift({
      id: 'txn_adm_' + crypto.randomBytes(5).toString('hex'),
      type: action === 'deduct' ? 'Withdraw' : 'Recharge',
      amount: num,
      status: 'Completed',
      note:
        reason?.trim() ||
        `অ্যাডমিন ${walletType === 'withdrawal' ? 'উত্তোলন' : 'রিচার্জ'} ব্যালেন্স ${
          action === 'deduct' ? 'কেটে নিয়েছেন' : 'যোগ করেছেন'
        }`,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(db);
    broadcastSync('admin_balance_update');
    res.json({ ok: true });
  });

  app.post('/api/admin/deposits/:id/confirm', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'অ্যাডমিন অনুমোদন প্রয়োজন' });
      return;
    }
    const dep = db.deposits.find((d) => d.id === req.params.id);
    if (!dep) {
      res.status(404).json({ error: 'ডিপোজিট পাওয়া যায়নি' });
      return;
    }
    if (dep.status !== 'Pending') {
      res.status(400).json({ error: 'ডিপোজিট ইতিমধ্যে প্রসেস করা হয়েছে' });
      return;
    }
    dep.status = 'Confirmed';
    const user = db.users[dep.userId];
    if (user) {
      const total = Number((dep.amount + dep.bonusAmount).toFixed(2));
      user.rechargeBalance = Number((user.rechargeBalance + total).toFixed(2));
      const txn = (db.transactions[user.id] || []).find((t) => t.id === dep.id);
      if (txn) {
        txn.status = 'Completed';
        txn.note = `কনফার্মড ${dep.method} (${dep.channel}) · TrxID ${dep.txId}`;
      }
    }
    saveDatabase(db);
    broadcastSync('deposit_confirmed');
    res.json({ ok: true });
  });

  app.post('/api/admin/deposits/:id/reject', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'অ্যাডমিন অনুমোদন প্রয়োজন' });
      return;
    }
    const dep = db.deposits.find((d) => d.id === req.params.id);
    if (!dep) {
      res.status(404).json({ error: 'ডিপোজিট পাওয়া যায়নি' });
      return;
    }
    if (dep.status !== 'Pending') {
      res.status(400).json({ error: 'ডিপোজিট ইতিমধ্যে প্রসেস করা হয়েছে' });
      return;
    }
    dep.status = 'Rejected';
    const txn = (db.transactions[dep.userId] || []).find((t) => t.id === dep.id);
    if (txn) {
      txn.status = 'Rejected';
      txn.note = `বাতিলকৃত ${dep.method} (${dep.channel}) · TrxID ${dep.txId}`;
    }
    saveDatabase(db);
    broadcastSync('deposit_rejected');
    res.json({ ok: true });
  });

  app.post('/api/admin/withdrawals/:id/approve', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Admin authorization required' });
      return;
    }
    const wd = db.withdrawals.find((w) => w.id === req.params.id);
    if (!wd) {
      res.status(404).json({ error: 'Withdrawal not found' });
      return;
    }
    wd.status = 'Approved';
    const txn = (db.transactions[wd.userId] || []).find((t) => t.id === wd.id);
    if (txn) {
      txn.status = 'Completed';
    }
    saveDatabase(db);
    broadcastSync('withdraw_approved');
    res.json({ ok: true });
  });

  app.post('/api/admin/withdrawals/:id/reject', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Admin authorization required' });
      return;
    }
    const wd = db.withdrawals.find((w) => w.id === req.params.id);
    if (!wd) {
      res.status(404).json({ error: 'Withdrawal not found' });
      return;
    }
    if (wd.status !== 'Processing') {
      res.status(400).json({ error: 'Already processed' });
      return;
    }
    wd.status = 'Rejected';
    const user = db.users[wd.userId];
    if (user) {
      user.withdrawalBalance = Number((user.withdrawalBalance + wd.amount).toFixed(2));
    }
    const txn = (db.transactions[wd.userId] || []).find((t) => t.id === wd.id);
    if (txn) {
      txn.status = 'Rejected';
      txn.note = `Withdraw refunded by admin (${wd.method})`;
    }
    saveDatabase(db);
    broadcastSync('withdraw_rejected');
    res.json({ ok: true });
  });

  app.post('/api/admin/payment-numbers', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Admin authorization required' });
      return;
    }
    const { method, channelLabel, number, typeLabel } = req.body as Partial<PaymentNumberEntry>;
    if (!method || !channelLabel?.trim() || !number?.trim()) {
      res.status(400).json({ error: 'মেথড, চ্যানেল এবং পেমেন্ট নম্বর দিন।' });
      return;
    }
    const entry: PaymentNumberEntry = {
      id: 'pn_' + crypto.randomBytes(4).toString('hex'),
      method,
      channelLabel: channelLabel.trim(),
      number: number.trim(),
      typeLabel: typeLabel?.trim() || 'Personal (Send Money)',
    };
    db.config.paymentNumbers.unshift(entry);
    saveDatabase(db);
    broadcastSync('payment_numbers_updated');
    res.json(db.config);
  });

  app.delete('/api/admin/payment-numbers/:id', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Admin authorization required' });
      return;
    }
    db.config.paymentNumbers = db.config.paymentNumbers.filter((p) => p.id !== req.params.id);
    saveDatabase(db);
    broadcastSync('payment_numbers_updated');
    res.json(db.config);
  });

  app.put('/api/admin/settings', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Admin authorization required' });
      return;
    }
    const { telegramGroupUrl, supportUrl, welcomeNotice, registrationBonus } =
      req.body as Partial<PublicAppConfig>;
    if (typeof telegramGroupUrl === 'string' && telegramGroupUrl.trim()) {
      db.config.telegramGroupUrl = telegramGroupUrl.trim();
    }
    if (typeof supportUrl === 'string' && supportUrl.trim()) {
      db.config.supportUrl = supportUrl.trim();
    }
    if (typeof welcomeNotice === 'string') {
      db.config.welcomeNotice = welcomeNotice.trim();
    }
    if (typeof registrationBonus === 'number' && registrationBonus >= 0) {
      db.config.registrationBonus = registrationBonus;
    }
    saveDatabase(db);
    broadcastSync('settings_updated');
    res.json(db.config);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexasWorld server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
