import type {
  AdminOverviewData,
  PaymentNumberEntry,
  PayoutMethod,
  PublicAppConfig,
  UserAccountBundle,
} from './types';

const TOKEN_KEY = 'nexas_auth_token';
const LOGOUT_FLAG = 'nexas_logged_out';
const ADMIN_KEY = 'nexas_admin_passcode';

export function getStoredToken(): string | null {
  if (localStorage.getItem(LOGOUT_FLAG) === 'true') {
    return null;
  }
  return localStorage.getItem(TOKEN_KEY) || 'demo_session_token';
}

export function setStoredToken(token: string): void {
  localStorage.removeItem(LOGOUT_FLAG);
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.setItem(LOGOUT_FLAG, 'true');
}

export function getStoredAdminKey(): string | null {
  return sessionStorage.getItem(ADMIN_KEY);
}

export function setStoredAdminKey(passcode: string): void {
  sessionStorage.setItem(ADMIN_KEY, passcode);
}

export function clearStoredAdminKey(): void {
  sessionStorage.removeItem(ADMIN_KEY);
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

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Request failed');
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
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Admin request failed');
  }
  return data as T;
}

export async function fetchSession(): Promise<UserAccountBundle> {
  return apiRequest<UserAccountBundle>('/api/me');
}

export async function fetchAppConfig(): Promise<PublicAppConfig> {
  return apiRequest<PublicAppConfig>('/api/config');
}

export async function loginAccount(phone: string, password: string): Promise<UserAccountBundle> {
  const bundle = await apiRequest<UserAccountBundle>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
  setStoredToken(bundle.token);
  return bundle;
}

export async function registerAccount(payload: {
  phone: string;
  password: string;
  fullName?: string;
  referralCode?: string;
}): Promise<UserAccountBundle> {
  const bundle = await apiRequest<UserAccountBundle>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredToken(bundle.token);
  return bundle;
}

export async function loginWithGoogleAccount(payload: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  referralCode?: string;
}): Promise<UserAccountBundle> {
  const bundle = await apiRequest<UserAccountBundle>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredToken(bundle.token);
  return bundle;
}

export async function submitRecharge(payload: {
  amount: number;
  method: string;
  channel?: string;
  txId?: string;
  bonusPct?: number;
}): Promise<UserAccountBundle> {
  return apiRequest<UserAccountBundle>('/api/recharge', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitWithdraw(payload: {
  amount: number;
  password: string;
}): Promise<UserAccountBundle> {
  return apiRequest<UserAccountBundle>('/api/withdraw', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveBankCard(payload: {
  bankHolderName: string;
  bankName: PayoutMethod;
  bankAccountNumber: string;
}): Promise<UserAccountBundle> {
  return apiRequest<UserAccountBundle>('/api/account/bank-card', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function buyVipPlan(planId: string): Promise<UserAccountBundle> {
  return apiRequest<UserAccountBundle>('/api/products/buy', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });
}

export async function claimDailyProductIncome(productId: string): Promise<UserAccountBundle> {
  return apiRequest<UserAccountBundle>('/api/products/claim', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
}

export async function claimDailySalary(): Promise<UserAccountBundle> {
  return apiRequest<UserAccountBundle>('/api/salary/claim', {
    method: 'POST',
  });
}

export async function redeemGiftCode(code: string): Promise<UserAccountBundle> {
  return apiRequest<UserAccountBundle>('/api/gift/redeem', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function updateAccountDetails(payload: {
  fullName?: string;
  payoutMethod?: PayoutMethod;
  payoutAccount?: string;
  newPassword?: string;
}): Promise<UserAccountBundle> {
  return apiRequest<UserAccountBundle>('/api/account/details', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// Admin API helpers
export async function adminLogin(passcode: string): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  });
  setStoredAdminKey(passcode);
}

export async function fetchAdminOverview(): Promise<AdminOverviewData> {
  return adminRequest<AdminOverviewData>('/api/admin/overview');
}

export async function adminAdjustBalance(payload: {
  userId: string;
  walletType: 'recharge' | 'withdrawal';
  action: 'add' | 'deduct';
  amount: number;
  reason?: string;
}): Promise<void> {
  await adminRequest('/api/admin/users/balance', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function adminConfirmDeposit(id: string): Promise<void> {
  await adminRequest(`/api/admin/deposits/${id}/confirm`, { method: 'POST' });
}

export async function adminRejectDeposit(id: string): Promise<void> {
  await adminRequest(`/api/admin/deposits/${id}/reject`, { method: 'POST' });
}

export async function adminApproveWithdraw(id: string): Promise<void> {
  await adminRequest(`/api/admin/withdrawals/${id}/approve`, { method: 'POST' });
}

export async function adminRejectWithdraw(id: string): Promise<void> {
  await adminRequest(`/api/admin/withdrawals/${id}/reject`, { method: 'POST' });
}

export async function adminAddPaymentNumber(
  payload: Omit<PaymentNumberEntry, 'id'>
): Promise<PublicAppConfig> {
  return adminRequest<PublicAppConfig>('/api/admin/payment-numbers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function adminDeletePaymentNumber(id: string): Promise<PublicAppConfig> {
  return adminRequest<PublicAppConfig>(`/api/admin/payment-numbers/${id}`, {
    method: 'DELETE',
  });
}

export async function adminSaveSettings(
  payload: Partial<PublicAppConfig>
): Promise<PublicAppConfig> {
  return adminRequest<PublicAppConfig>('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
