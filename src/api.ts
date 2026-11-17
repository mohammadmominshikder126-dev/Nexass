import {
  localAdminAddPaymentNumber,
  localAdminAdjustBalance,
  localAdminApproveWithdraw,
  localAdminConfirmDeposit,
  localAdminDeletePaymentNumber,
  localAdminLogin,
  localAdminOverview,
  localAdminRejectDeposit,
  localAdminRejectWithdraw,
  localAdminSavePlans,
  localAdminSaveSettings,
  localBuyVipPlan,
  localClaimDailySalary,
  localClaimProductIncome,
  localGetConfig,
  localGetSession,
  localGoogleAuth,
  localLogin,
  localRedeemGiftCode,
  localRegister,
  localSaveBankCard,
  localSubmitRecharge,
  localSubmitWithdraw,
  localUpdateAccountDetails,
} from './localFallbackStore';
import { VIP_PLANS } from './data/plans';
import type {
  AdminOverviewData,
  PaymentNumberEntry,
  PayoutMethod,
  PublicAppConfig,
  UserAccountBundle,
  VipPlan,
} from './types';

const TOKEN_KEY = 'nexas_auth_token';
const LOGOUT_FLAG = 'nexas_logged_out';
const ADMIN_KEY = 'nexas_admin_passcode';

class BackendUnavailableError extends Error {}

function safeStorageGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore strict private mode errors
  }
}

function safeStorageRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore
  }
}

export function getStoredToken(): string | null {
  if (safeStorageGet(localStorage, LOGOUT_FLAG) === 'true') {
    return null;
  }
  return safeStorageGet(localStorage, TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  safeStorageRemove(localStorage, LOGOUT_FLAG);
  safeStorageSet(localStorage, TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  safeStorageRemove(localStorage, TOKEN_KEY);
  safeStorageSet(localStorage, LOGOUT_FLAG, 'true');
}

export function getStoredAdminKey(): string | null {
  return safeStorageGet(sessionStorage, ADMIN_KEY);
}

export function setStoredAdminKey(passcode: string): void {
  safeStorageSet(sessionStorage, ADMIN_KEY, passcode);
}

export function clearStoredAdminKey(): void {
  safeStorageRemove(sessionStorage, ADMIN_KEY);
}

export async function isExpressBackendActive(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return false;
    const data = (await res.json()) as { ok?: boolean };
    return Boolean(data && data.ok);
  } catch {
    return false;
  }
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new BackendUnavailableError('Network error');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new BackendUnavailableError('Static host returned non-JSON response');
  }

  const data = await res.json().catch(() => null);
  if (!data || typeof data !== 'object') {
    throw new BackendUnavailableError('Invalid JSON response');
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'অনুরোধ সম্পন্ন করা যায়নি');
  }
  return data as T;
}

async function adminRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const adminKey = getStoredAdminKey() || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-admin-key': adminKey,
    ...(options.headers as Record<string, string> | undefined),
  };

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new BackendUnavailableError('Network error');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new BackendUnavailableError('Static host returned non-JSON response');
  }

  const data = await res.json().catch(() => null);
  if (!data || typeof data !== 'object') {
    throw new BackendUnavailableError('Invalid JSON response');
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'অ্যাডমিন অনুরোধ ব্যর্থ হয়েছে');
  }
  return data as T;
}

function isValidBundle(data: unknown): data is UserAccountBundle {
  if (!data || typeof data !== 'object') return false;
  const b = data as Partial<UserAccountBundle>;
  return Boolean(
    b.user &&
      typeof b.user.id === 'string' &&
      Array.isArray(b.products) &&
      Array.isArray(b.transactions) &&
      Array.isArray(b.team)
  );
}

export async function fetchSession(): Promise<UserAccountBundle> {
  try {
    const data = await apiRequest<UserAccountBundle>('/api/me');
    if (isValidBundle(data)) return data;
    throw new BackendUnavailableError('Malformed bundle');
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localGetSession(getStoredToken());
    }
    throw err;
  }
}

export async function fetchAppConfig(): Promise<PublicAppConfig> {
  try {
    const data = await apiRequest<PublicAppConfig>('/api/config');
    if (data && Array.isArray(data.paymentNumbers)) {
      return {
        ...data,
        vipPlans:
          Array.isArray(data.vipPlans) && data.vipPlans.length > 0 ? data.vipPlans : VIP_PLANS,
      };
    }
    throw new BackendUnavailableError('Malformed config');
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localGetConfig();
    }
    throw err;
  }
}

export async function loginAccount(phone: string, password: string): Promise<UserAccountBundle> {
  try {
    const bundle = await apiRequest<UserAccountBundle>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    if (!isValidBundle(bundle)) throw new BackendUnavailableError('Malformed login bundle');
    setStoredToken(bundle.token);
    return bundle;
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      const bundle = localLogin(phone, password);
      setStoredToken(bundle.token);
      return bundle;
    }
    throw err;
  }
}

export async function registerAccount(payload: {
  phone: string;
  password: string;
  fullName?: string;
  referralCode?: string;
}): Promise<UserAccountBundle> {
  try {
    const bundle = await apiRequest<UserAccountBundle>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!isValidBundle(bundle)) throw new BackendUnavailableError('Malformed register bundle');
    setStoredToken(bundle.token);
    return bundle;
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      const bundle = localRegister(payload);
      setStoredToken(bundle.token);
      return bundle;
    }
    throw err;
  }
}

export async function loginWithGoogleAccount(payload: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  referralCode?: string;
}): Promise<UserAccountBundle> {
  try {
    const bundle = await apiRequest<UserAccountBundle>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!isValidBundle(bundle)) throw new BackendUnavailableError('Malformed google bundle');
    setStoredToken(bundle.token);
    return bundle;
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      const bundle = localGoogleAuth(payload);
      setStoredToken(bundle.token);
      return bundle;
    }
    throw err;
  }
}

export async function submitRecharge(payload: {
  amount: number;
  method: string;
  channel?: string;
  txId?: string;
  bonusPct?: number;
}): Promise<UserAccountBundle> {
  try {
    const data = await apiRequest<UserAccountBundle>('/api/recharge', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!isValidBundle(data)) throw new BackendUnavailableError('Malformed recharge bundle');
    return data;
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localSubmitRecharge(getStoredToken(), payload);
    }
    throw err;
  }
}

export async function submitWithdraw(payload: {
  amount: number;
  password: string;
}): Promise<UserAccountBundle> {
  try {
    const data = await apiRequest<UserAccountBundle>('/api/withdraw', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!isValidBundle(data)) throw new BackendUnavailableError('Malformed withdraw bundle');
    return data;
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localSubmitWithdraw(getStoredToken(), payload);
    }
    throw err;
  }
}

export async function saveBankCard(payload: {
  bankHolderName: string;
  bankName: PayoutMethod;
  bankAccountNumber: string;
}): Promise<UserAccountBundle> {
  try {
    const data = await apiRequest<UserAccountBundle>('/api/account/bank-card', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!isValidBundle(data)) throw new BackendUnavailableError('Malformed bank bundle');
    return data;
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localSaveBankCard(getStoredToken(), payload);
    }
    throw err;
  }
}

export async function buyVipPlan(planId: string): Promise<UserAccountBundle> {
  try {
    const data = await apiRequest<UserAccountBundle>('/api/products/buy', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
    if (!isValidBundle(data)) throw new BackendUnavailableError('Malformed buy bundle');
    return data;
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localBuyVipPlan(getStoredToken(), planId);
    }
    throw err;
  }
}

export async function claimDailyProductIncome(productId: string): Promise<UserAccountBundle> {
  try {
    const data = await apiRequest<UserAccountBundle>('/api/products/claim', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
    if (!isValidBundle(data)) throw new BackendUnavailableError('Malformed claim bundle');
    return data;
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localClaimProductIncome(getStoredToken(), productId);
    }
    throw err;
  }
}

export async function claimDailySalary(): Promise<UserAccountBundle> {
  try {
    const data = await apiRequest<UserAccountBundle>('/api/salary/claim', {
      method: 'POST',
    });
    if (!isValidBundle(data)) throw new BackendUnavailableError('Malformed salary bundle');
    return data;
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localClaimDailySalary(getStoredToken());
    }
    throw err;
  }
}

export async function redeemGiftCode(code: string): Promise<UserAccountBundle> {
  try {
    const data = await apiRequest<UserAccountBundle>('/api/gift/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    if (!isValidBundle(data)) throw new BackendUnavailableError('Malformed gift bundle');
    return data;
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localRedeemGiftCode(getStoredToken(), code);
    }
    throw err;
  }
}

export async function updateAccountDetails(payload: {
  fullName?: string;
  payoutMethod?: PayoutMethod;
  payoutAccount?: string;
  newPassword?: string;
}): Promise<UserAccountBundle> {
  try {
    const data = await apiRequest<UserAccountBundle>('/api/account/details', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!isValidBundle(data)) throw new BackendUnavailableError('Malformed details bundle');
    return data;
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localUpdateAccountDetails(getStoredToken(), payload);
    }
    throw err;
  }
}

// Admin API helpers
export async function adminLogin(passcode: string): Promise<void> {
  try {
    await apiRequest<{ ok: boolean }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    });
    setStoredAdminKey(passcode);
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      localAdminLogin(passcode);
      setStoredAdminKey(passcode);
      return;
    }
    throw err;
  }
}

export async function fetchAdminOverview(): Promise<AdminOverviewData> {
  try {
    const data = await adminRequest<AdminOverviewData>('/api/admin/overview');
    if (data && Array.isArray(data.users) && data.config) {
      return {
        ...data,
        config: {
          ...data.config,
          vipPlans:
            Array.isArray(data.config.vipPlans) && data.config.vipPlans.length > 0
              ? data.config.vipPlans
              : VIP_PLANS,
        },
      };
    }
    throw new BackendUnavailableError('Malformed admin overview');
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localAdminOverview(getStoredAdminKey());
    }
    throw err;
  }
}

export async function adminAdjustBalance(payload: {
  userId: string;
  walletType: 'recharge' | 'withdrawal';
  action: 'add' | 'deduct';
  amount: number;
  reason?: string;
}): Promise<void> {
  try {
    await adminRequest('/api/admin/users/balance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      localAdminAdjustBalance(getStoredAdminKey(), payload);
      return;
    }
    throw err;
  }
}

export async function adminConfirmDeposit(id: string): Promise<void> {
  try {
    await adminRequest(`/api/admin/deposits/${id}/confirm`, { method: 'POST' });
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      localAdminConfirmDeposit(getStoredAdminKey(), id);
      return;
    }
    throw err;
  }
}

export async function adminRejectDeposit(id: string): Promise<void> {
  try {
    await adminRequest(`/api/admin/deposits/${id}/reject`, { method: 'POST' });
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      localAdminRejectDeposit(getStoredAdminKey(), id);
      return;
    }
    throw err;
  }
}

export async function adminApproveWithdraw(id: string): Promise<void> {
  try {
    await adminRequest(`/api/admin/withdrawals/${id}/approve`, { method: 'POST' });
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      localAdminApproveWithdraw(getStoredAdminKey(), id);
      return;
    }
    throw err;
  }
}

export async function adminRejectWithdraw(id: string): Promise<void> {
  try {
    await adminRequest(`/api/admin/withdrawals/${id}/reject`, { method: 'POST' });
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      localAdminRejectWithdraw(getStoredAdminKey(), id);
      return;
    }
    throw err;
  }
}

export async function adminAddPaymentNumber(
  payload: Omit<PaymentNumberEntry, 'id'>
): Promise<PublicAppConfig> {
  try {
    const data = await adminRequest<PublicAppConfig>('/api/admin/payment-numbers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data && Array.isArray(data.paymentNumbers)) return data;
    throw new BackendUnavailableError('Malformed payment config');
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localAdminAddPaymentNumber(getStoredAdminKey(), payload);
    }
    throw err;
  }
}

export async function adminDeletePaymentNumber(id: string): Promise<PublicAppConfig> {
  try {
    const data = await adminRequest<PublicAppConfig>(`/api/admin/payment-numbers/${id}`, {
      method: 'DELETE',
    });
    if (data && Array.isArray(data.paymentNumbers)) return data;
    throw new BackendUnavailableError('Malformed payment config');
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localAdminDeletePaymentNumber(getStoredAdminKey(), id);
    }
    throw err;
  }
}

export async function adminSaveSettings(
  payload: Partial<PublicAppConfig>
): Promise<PublicAppConfig> {
  try {
    const data = await adminRequest<PublicAppConfig>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (data && Array.isArray(data.paymentNumbers)) {
      return {
        ...data,
        vipPlans:
          Array.isArray(data.vipPlans) && data.vipPlans.length > 0 ? data.vipPlans : VIP_PLANS,
      };
    }
    throw new BackendUnavailableError('Malformed settings config');
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localAdminSaveSettings(getStoredAdminKey(), payload);
    }
    throw err;
  }
}

export async function adminSavePlans(vipPlans: VipPlan[]): Promise<PublicAppConfig> {
  try {
    const data = await adminRequest<PublicAppConfig>('/api/admin/plans', {
      method: 'PUT',
      body: JSON.stringify({ vipPlans }),
    });
    if (data && Array.isArray(data.paymentNumbers)) {
      return {
        ...data,
        vipPlans:
          Array.isArray(data.vipPlans) && data.vipPlans.length > 0 ? data.vipPlans : VIP_PLANS,
      };
    }
    throw new BackendUnavailableError('Malformed plans config');
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      return localAdminSavePlans(getStoredAdminKey(), vipPlans);
    }
    throw err;
  }
}
