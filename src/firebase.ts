import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type {
  AdminDepositRequest,
  AdminWithdrawRequest,
  PayoutMethod,
  PublicAppConfig,
  UserProduct,
  UserProfile,
  VipPlan,
} from './types';

export const BOOTSTRAP_ADMIN_EMAIL = 'nexasworld5@gmail.com';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export function isVerifiedFirebaseUser(user: User | null): user is User {
  return Boolean(user && user.emailVerified);
}

export function isBootstrapAdminUser(user: User | null): boolean {
  return Boolean(
    user &&
      user.emailVerified &&
      user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()
  );
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/unauthorized-domain') {
      throw new Error(
        'এই কাস্টম ডোমেইনে Google লগইন অনুমোদিত নয়। অনুগ্রহ করে মোবাইল নম্বর দিয়ে লগইন/রেজিস্টার করুন।'
      );
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('ব্রাউজারে পপ-আপ ব্লক করা আছে। পপ-আপ অনুমতি দিয়ে আবার চেষ্টা করুন।');
    }
    if (code === 'auth/popup-closed-by-user') {
      throw new Error('Google লগইন বাতিল করা হয়েছে।');
    }
    throw err;
  }
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuthState(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

// =========================================================================
// Sanitization helpers matching firebase-blueprint.json & firestore.rules
// =========================================================================
const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const VALID_REFERRAL_REGEX = /^[A-Z0-9_\-]+$/;
const VALID_PAYOUT_METHODS: PayoutMethod[] = [
  'bKash',
  'Nagad',
  'Bank',
  'USDT-TRC20',
  'USDT-BEP20',
];

function sanitizeDocId(raw: string, prefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  if (cleaned.length >= 1 && VALID_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${prefix}_${Date.now()}`;
}

function sanitizePhoneField(raw: string | null | undefined, uid: string): string {
  const fallback = `usr_${uid.slice(0, 12)}`;
  const val = (raw || fallback).trim().slice(0, 32);
  return val.length >= 5 ? val : fallback;
}

function sanitizeFullName(raw: string | null | undefined): string {
  const val = (raw || 'Nexas সদস্য').trim().slice(0, 100);
  return val.length >= 1 ? val : 'Nexas সদস্য';
}

function generateReferralCode(uid: string): string {
  const base = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  const code = `NXW${base}`.slice(0, 24);
  return VALID_REFERRAL_REGEX.test(code) && code.length >= 4 ? code : `NXW${Date.now()}`.slice(0, 12);
}

function sanitizePayoutMethod(method: string | undefined): PayoutMethod {
  if (method && VALID_PAYOUT_METHODS.includes(method as PayoutMethod)) {
    return method as PayoutMethod;
  }
  return 'bKash';
}

export async function ensureFirebaseUserProfile(
  user: User,
  referredByCode?: string
): Promise<void> {
  if (!isVerifiedFirebaseUser(user)) return;
  const uid = sanitizeDocId(user.uid, 'usr');
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return;
    }

    let referredByUid: string | undefined;
    const cleanRefInput = referredByCode?.trim().toUpperCase().slice(0, 24);
    if (cleanRefInput && cleanRefInput.length >= 4 && VALID_REFERRAL_REGEX.test(cleanRefInput)) {
      try {
        const refSnap = await getDoc(doc(db, 'referrals', cleanRefInput));
        if (refSnap.exists()) {
          const ownerId = refSnap.data()?.ownerId;
          if (typeof ownerId === 'string' && ownerId !== uid) {
            referredByUid = ownerId.slice(0, 128);
          }
        }
      } catch {
        // Non-fatal if referral code lookup fails
      }
    }

    const referralCode = generateReferralCode(uid);
    const profilePayload: Record<string, unknown> = {
      uid,
      phone: sanitizePhoneField(user.phoneNumber || user.email, uid),
      fullName: sanitizeFullName(user.displayName || user.email?.split('@')[0]),
      referralCode,
      rechargeBalance: 150,
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (referredByUid) {
      profilePayload.referredBy = referredByUid;
    }

    await setDoc(userRef, profilePayload);

    const refIndexPath = `referrals/${referralCode}`;
    try {
      await setDoc(doc(db, 'referrals', referralCode), {
        ownerId: uid,
        referralCode,
        createdAt: serverTimestamp(),
      });
    } catch (refErr) {
      handleFirestoreError(refErr, OperationType.CREATE, refIndexPath);
    }

    const txId = sanitizeDocId(`tx_reg_${Date.now()}`, 'tx');
    const txPath = `users/${uid}/transactions/${txId}`;
    try {
      await setDoc(doc(db, 'users', uid, 'transactions', txId), {
        id: txId,
        userId: uid,
        type: 'Registration Bonus',
        amount: 150,
        status: 'Completed',
        note: 'নতুন অ্যাকাউন্ট নিবন্ধন বোনাস 150 BDT',
        createdAt: serverTimestamp(),
      });
    } catch (txErr) {
      handleFirestoreError(txErr, OperationType.CREATE, txPath);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function subscribeToAppConfig(
  onUpdate: (config: Partial<PublicAppConfig>) => void
): Unsubscribe {
  const path = 'config/app';
  return onSnapshot(
    doc(db, 'config', 'app'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          telegramGroupUrl:
            typeof data.telegramGroupUrl === 'string' ? data.telegramGroupUrl : undefined,
          supportUrl: typeof data.supportUrl === 'string' ? data.supportUrl : undefined,
          welcomeNotice:
            typeof data.welcomeNotice === 'string' ? data.welcomeNotice : undefined,
          registrationBonus:
            typeof data.registrationBonus === 'number' ? data.registrationBonus : undefined,
          paymentNumbers: Array.isArray(data.paymentNumbers)
            ? data.paymentNumbers
            : undefined,
        });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToUserProfile(
  uid: string,
  onUpdate: (profile: Partial<UserProfile>) => void
): Unsubscribe {
  const safeUid = sanitizeDocId(uid, 'usr');
  const path = `users/${safeUid}`;
  return onSnapshot(
    doc(db, 'users', safeUid),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onUpdate({
        id: safeUid,
        phone: typeof d.phone === 'string' ? d.phone : undefined,
        fullName: typeof d.fullName === 'string' ? d.fullName : undefined,
        referralCode: typeof d.referralCode === 'string' ? d.referralCode : undefined,
        rechargeBalance:
          typeof d.rechargeBalance === 'number' ? d.rechargeBalance : undefined,
        withdrawalBalance:
          typeof d.withdrawalBalance === 'number' ? d.withdrawalBalance : undefined,
        invitedEarnings:
          typeof d.invitedEarnings === 'number' ? d.invitedEarnings : undefined,
        payoutMethod: sanitizePayoutMethod(d.payoutMethod),
        payoutAccount: typeof d.payoutAccount === 'string' ? d.payoutAccount : undefined,
        bankHolderName: typeof d.bankHolderName === 'string' ? d.bankHolderName : undefined,
        bankName: typeof d.bankName === 'string' ? d.bankName : undefined,
        bankAccountNumber:
          typeof d.bankAccountNumber === 'string' ? d.bankAccountNumber : undefined,
        bankCardVerified:
          typeof d.bankCardVerified === 'boolean' ? d.bankCardVerified : undefined,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function syncBankCardToFirestore(
  uid: string,
  payload: {
    bankHolderName: string;
    bankName: PayoutMethod;
    bankAccountNumber: string;
  }
): Promise<void> {
  if (!isVerifiedFirebaseUser(auth.currentUser)) return;
  const safeUid = sanitizeDocId(uid, 'usr');
  const path = `users/${safeUid}`;
  try {
    await updateDoc(doc(db, 'users', safeUid), {
      bankHolderName: payload.bankHolderName.trim().slice(0, 100),
      bankName: sanitizePayoutMethod(payload.bankName),
      payoutMethod: sanitizePayoutMethod(payload.bankName),
      bankAccountNumber: payload.bankAccountNumber.trim().slice(0, 128),
      payoutAccount: payload.bankAccountNumber.trim().slice(0, 128),
      bankCardVerified: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncAccountDetailsToFirestore(
  uid: string,
  payload: {
    fullName?: string;
    payoutMethod?: PayoutMethod;
    payoutAccount?: string;
  }
): Promise<void> {
  if (!isVerifiedFirebaseUser(auth.currentUser)) return;
  const safeUid = sanitizeDocId(uid, 'usr');
  const path = `users/${safeUid}`;
  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (payload.fullName?.trim()) {
    patch.fullName = payload.fullName.trim().slice(0, 100);
  }
  if (payload.payoutMethod) {
    const safeMethod = sanitizePayoutMethod(payload.payoutMethod);
    patch.payoutMethod = safeMethod;
    patch.bankName = safeMethod;
  }
  if (payload.payoutAccount !== undefined) {
    const cleanAcc = payload.payoutAccount.trim().slice(0, 128);
    patch.payoutAccount = cleanAcc;
    patch.bankAccountNumber = cleanAcc;
    if (cleanAcc) {
      patch.bankCardVerified = true;
    }
  }
  try {
    await updateDoc(doc(db, 'users', safeUid), patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createDepositInFirestore(
  uid: string,
  userPhone: string,
  userName: string,
  payload: {
    id?: string;
    amount: number;
    bonusAmount?: number;
    method: string;
    channel?: string;
    txId?: string;
  }
): Promise<void> {
  if (!isVerifiedFirebaseUser(auth.currentUser)) return;
  const amount = Number(payload.amount);
  const cleanTxId = (payload.txId || '').trim().slice(0, 128);
  if (!Number.isFinite(amount) || amount < 300 || amount > 1000000 || cleanTxId.length < 4) {
    return;
  }
  const safeUid = sanitizeDocId(uid, 'usr');
  const depId = sanitizeDocId(payload.id || `dep_${Date.now()}`, 'dep');
  const depPath = `deposits/${depId}`;
  const bonusAmount = Math.min(Math.max(Number(payload.bonusAmount || 0), 0), 50000);

  try {
    await setDoc(doc(db, 'deposits', depId), {
      id: depId,
      userId: safeUid,
      userPhone: sanitizePhoneField(userPhone, safeUid),
      userName: sanitizeFullName(userName),
      amount,
      bonusAmount,
      method: (payload.method || 'bKash').trim().slice(0, 40),
      channel: (payload.channel || payload.method || 'GOPAY-BK').trim().slice(0, 64),
      txId: cleanTxId,
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, depPath);
  }

  const txPath = `users/${safeUid}/transactions/${depId}`;
  try {
    await setDoc(doc(db, 'users', safeUid, 'transactions', depId), {
      id: depId,
      userId: safeUid,
      type: 'Recharge',
      amount: amount + bonusAmount,
      method: (payload.method || 'bKash').trim().slice(0, 40),
      channel: (payload.channel || payload.method || 'GOPAY-BK').trim().slice(0, 64),
      txId: cleanTxId,
      status: 'Processing',
      note: `${payload.method} সেন্ড মানি · TrxID ${cleanTxId}`.slice(0, 300),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, txPath);
  }
}

export async function createWithdrawalInFirestore(
  uid: string,
  user: UserProfile,
  amount: number,
  withdrawId?: string
): Promise<void> {
  if (!isVerifiedFirebaseUser(auth.currentUser)) return;
  const numAmount = Number(amount);
  const cleanAccount = (user.bankAccountNumber || user.payoutAccount || '').trim().slice(0, 128);
  if (!Number.isFinite(numAmount) || numAmount < 200 || numAmount > 1000000 || cleanAccount.length < 4) {
    return;
  }
  const safeUid = sanitizeDocId(uid, 'usr');
  const wdId = sanitizeDocId(withdrawId || `wd_${Date.now()}`, 'wd');
  const wdPath = `withdrawals/${wdId}`;
  const method = sanitizePayoutMethod(user.payoutMethod);

  try {
    await setDoc(doc(db, 'withdrawals', wdId), {
      id: wdId,
      userId: safeUid,
      userPhone: sanitizePhoneField(user.phone, safeUid),
      userName: sanitizeFullName(user.fullName),
      amount: numAmount,
      method,
      accountNumber: cleanAccount,
      bankHolderName: sanitizeFullName(user.bankHolderName || user.fullName),
      bankName: (user.bankName || method).trim().slice(0, 64),
      status: 'Processing',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, wdPath);
  }

  const txPath = `users/${safeUid}/transactions/${wdId}`;
  try {
    await setDoc(doc(db, 'users', safeUid, 'transactions', wdId), {
      id: wdId,
      userId: safeUid,
      type: 'Withdraw',
      amount: numAmount,
      method,
      accountRef: cleanAccount,
      status: 'Processing',
      note: `${user.bankName || method} (${cleanAccount}) উত্তোলন অনুরোধ`.slice(0, 300),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, txPath);
  }
}

export async function createUserProductInFirestore(
  uid: string,
  plan: VipPlan,
  productId?: string
): Promise<void> {
  if (!isVerifiedFirebaseUser(auth.currentUser)) return;
  const safeUid = sanitizeDocId(uid, 'usr');
  const prodId = sanitizeDocId(productId || `prd_${Date.now()}`, 'prd');
  const prodPath = `users/${safeUid}/products/${prodId}`;

  try {
    await setDoc(doc(db, 'users', safeUid, 'products', prodId), {
      id: prodId,
      userId: safeUid,
      planId: plan.id.slice(0, 64),
      tier: plan.tier.slice(0, 32),
      modelName: plan.modelName.slice(0, 100),
      price: plan.price,
      dailyIncome: plan.dailyIncome,
      totalIncome: plan.totalIncome,
      validityDays: plan.validityDays,
      daysClaimed: 0,
      lastClaimedAt: null,
      purchasedAt: serverTimestamp(),
      image: plan.image.slice(0, 300),
      status: 'Active',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, prodPath);
  }
}

export async function claimUserProductInFirestore(
  uid: string,
  product: UserProduct
): Promise<void> {
  if (!isVerifiedFirebaseUser(auth.currentUser)) return;
  const safeUid = sanitizeDocId(uid, 'usr');
  const prodId = sanitizeDocId(product.id, 'prd');
  const prodPath = `users/${safeUid}/products/${prodId}`;

  try {
    const prodRef = doc(db, 'users', safeUid, 'products', prodId);
    const snap = await getDoc(prodRef);
    if (!snap.exists()) return;
    const current = snap.data();
    const nextDays = Math.min(Number(current.daysClaimed || 0) + 1, Number(current.validityDays || 30));
    const nextStatus = nextDays >= Number(current.validityDays || 30) ? 'Completed' : 'Active';
    await updateDoc(prodRef, {
      daysClaimed: nextDays,
      lastClaimedAt: serverTimestamp(),
      status: nextStatus,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, prodPath);
  }
}

// =========================================================================
// Admin Firestore Controls (Active when signed in as Bootstrap Admin)
// =========================================================================
export async function adminSaveAppConfigInFirestore(config: PublicAppConfig): Promise<void> {
  if (!isBootstrapAdminUser(auth.currentUser)) return;
  const path = 'config/app';
  try {
    await setDoc(doc(db, 'config', 'app'), {
      telegramGroupUrl: (config.telegramGroupUrl || '').slice(0, 300),
      supportUrl: (config.supportUrl || '').slice(0, 300),
      welcomeNotice: (config.welcomeNotice || '').slice(0, 500),
      registrationBonus: Math.min(Math.max(Number(config.registrationBonus || 0), 0), 10000),
      paymentNumbers: (config.paymentNumbers || []).slice(0, 20),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminUpdateDepositStatusInFirestore(
  depositId: string,
  status: 'Confirmed' | 'Rejected'
): Promise<void> {
  if (!isBootstrapAdminUser(auth.currentUser)) return;
  const safeId = sanitizeDocId(depositId, 'dep');
  const path = `deposits/${safeId}`;
  try {
    const depRef = doc(db, 'deposits', safeId);
    const depSnap = await getDoc(depRef);
    if (!depSnap.exists()) return;
    const depData = depSnap.data();
    if (depData.status !== 'Pending') return;

    await updateDoc(depRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    if (status === 'Confirmed' && typeof depData.userId === 'string') {
      const targetUserId = sanitizeDocId(depData.userId, 'usr');
      const userRef = doc(db, 'users', targetUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const cur = Number(userSnap.data().rechargeBalance || 0);
        const addAmt = Number(depData.amount || 0) + Number(depData.bonusAmount || 0);
        await updateDoc(userRef, {
          rechargeBalance: Number((cur + addAmt).toFixed(2)),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdateWithdrawStatusInFirestore(
  withdrawId: string,
  status: 'Approved' | 'Rejected'
): Promise<void> {
  if (!isBootstrapAdminUser(auth.currentUser)) return;
  const safeId = sanitizeDocId(withdrawId, 'wd');
  const path = `withdrawals/${safeId}`;
  try {
    const wdRef = doc(db, 'withdrawals', safeId);
    const wdSnap = await getDoc(wdRef);
    if (!wdSnap.exists()) return;
    const wdData = wdSnap.data();
    if (wdData.status !== 'Processing') return;

    await updateDoc(wdRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    if (status === 'Rejected' && typeof wdData.userId === 'string') {
      const targetUserId = sanitizeDocId(wdData.userId, 'usr');
      const userRef = doc(db, 'users', targetUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const cur = Number(userSnap.data().withdrawalBalance || 0);
        await updateDoc(userRef, {
          withdrawalBalance: Number((cur + Number(wdData.amount || 0)).toFixed(2)),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminAdjustBalanceInFirestore(
  userId: string,
  walletType: 'recharge' | 'withdrawal',
  action: 'add' | 'deduct',
  amount: number
): Promise<void> {
  if (!isBootstrapAdminUser(auth.currentUser)) return;
  const safeUid = sanitizeDocId(userId, 'usr');
  const path = `users/${safeUid}`;
  try {
    const userRef = doc(db, 'users', safeUid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    const data = userSnap.data();
    const field = walletType === 'withdrawal' ? 'withdrawalBalance' : 'rechargeBalance';
    const current = Number(data[field] || 0);
    const delta = Number(amount || 0);
    const next =
      action === 'deduct'
        ? Math.max(0, Number((current - delta).toFixed(2)))
        : Number((current + delta).toFixed(2));
    await updateDoc(userRef, {
      [field]: next,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchUserDepositsFromFirestore(
  uid: string
): Promise<AdminDepositRequest[]> {
  if (!isVerifiedFirebaseUser(auth.currentUser)) return [];
  const safeUid = sanitizeDocId(uid, 'usr');
  const path = 'deposits';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', safeUid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: String(data.userId || safeUid),
        userPhone: String(data.userPhone || ''),
        userName: String(data.userName || ''),
        amount: Number(data.amount || 0),
        bonusAmount: Number(data.bonusAmount || 0),
        method: String(data.method || 'bKash'),
        channel: String(data.channel || 'GOPAY-BK'),
        txId: String(data.txId || ''),
        status: (data.status as AdminDepositRequest['status']) || 'Pending',
        createdAt: new Date().toISOString(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchUserWithdrawalsFromFirestore(
  uid: string
): Promise<AdminWithdrawRequest[]> {
  if (!isVerifiedFirebaseUser(auth.currentUser)) return [];
  const safeUid = sanitizeDocId(uid, 'usr');
  const path = 'withdrawals';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', safeUid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: String(data.userId || safeUid),
        userPhone: String(data.userPhone || ''),
        userName: String(data.userName || ''),
        amount: Number(data.amount || 0),
        method: sanitizePayoutMethod(data.method),
        accountNumber: String(data.accountNumber || ''),
        bankHolderName: String(data.bankHolderName || ''),
        bankName: String(data.bankName || ''),
        status: (data.status as AdminWithdrawRequest['status']) || 'Processing',
        createdAt: new Date().toISOString(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
