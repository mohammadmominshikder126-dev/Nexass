export type TabKey = 'home' | 'products' | 'team' | 'profile';

export type SubPage =
  | 'recharge'
  | 'withdraw'
  | 'account'
  | 'bank-card'
  | 'records'
  | 'salary'
  | 'gift'
  | 'support'
  | 'auth'
  | null;

export interface VipPlan {
  id: string;
  tier: string;
  modelName: string;
  price: number;
  dailyIncome: number;
  totalIncome: number;
  validityDays: number;
  image: string;
  category: 'Starter' | 'Performance' | 'Prototype';
}

export interface UserProduct {
  id: string;
  planId: string;
  tier: string;
  modelName: string;
  price: number;
  dailyIncome: number;
  totalIncome: number;
  validityDays: number;
  daysClaimed: number;
  lastClaimedAt: string | null; // ISO timestamp for 24h reminder
  purchasedAt: string;
  image: string;
  status: 'Active' | 'Completed';
}

export type TransactionType =
  | 'Recharge'
  | 'Withdraw'
  | 'Investment'
  | 'Daily Income'
  | 'Referral Bonus'
  | 'Registration Bonus'
  | 'Gift Code'
  | 'Daily Salary';

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  amount: number;
  method?: string;
  channel?: string;
  accountRef?: string;
  txId?: string;
  status: 'Completed' | 'Processing' | 'Rejected';
  note: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  phone: string;
  level: 1 | 2 | 3;
  joinedAt: string;
  validVip: boolean;
  totalInvested: number;
  commissionEarned: number;
}

export type PayoutMethod = 'bKash' | 'Nagad' | 'Bank' | 'USDT-TRC20' | 'USDT-BEP20';

export interface UserProfile {
  id: string;
  phone: string;
  fullName: string;
  referralCode: string;
  referredBy?: string;
  rechargeBalance: number;
  withdrawalBalance: number;
  invitedEarnings: number;
  payoutMethod: PayoutMethod;
  payoutAccount: string;
  bankHolderName: string;
  bankName: string;
  bankAccountNumber: string;
  bankCardVerified: boolean;
  lastSalaryClaimDate: string | null;
  redeemedCodes: string[];
  createdAt: string;
}

export interface UserAccountBundle {
  token: string;
  user: UserProfile;
  products: UserProduct[];
  transactions: TransactionRecord[];
  team: TeamMember[];
}

export interface PaymentNumberEntry {
  id: string;
  method: 'bKash' | 'Nagad' | 'USDT';
  channelLabel: string;
  number: string;
  typeLabel: string;
}

export interface PublicAppConfig {
  telegramGroupUrl: string;
  supportUrl: string;
  welcomeNotice: string;
  registrationBonus: number;
  paymentNumbers: PaymentNumberEntry[];
}

export interface AdminDepositRequest {
  id: string;
  userId: string;
  userPhone: string;
  userName: string;
  amount: number;
  bonusAmount: number;
  method: string;
  channel: string;
  txId: string;
  status: 'Pending' | 'Confirmed' | 'Rejected';
  createdAt: string;
}

export interface AdminWithdrawRequest {
  id: string;
  userId: string;
  userPhone: string;
  userName: string;
  amount: number;
  method: PayoutMethod;
  accountNumber: string;
  bankHolderName: string;
  bankName: string;
  status: 'Processing' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface AdminOverviewData {
  totalUsers: number;
  totalActiveInvestors: number;
  totalConfirmedDeposits: number;
  pendingDepositCount: number;
  pendingWithdrawCount: number;
  users: (UserProfile & { productCount: number })[];
  deposits: AdminDepositRequest[];
  withdrawals: AdminWithdrawRequest[];
  config: PublicAppConfig;
}
