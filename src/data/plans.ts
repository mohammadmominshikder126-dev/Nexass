import type { VipPlan } from '../types';

export const HERO_BANNER_IMAGE = '/src/assets/images/hero_f1_monochrome_1794938614516.jpg';
export const AUTH_GRILLE_IMAGE = '/src/assets/images/auth_grille_emblem_1794938616589.jpg';

export const VIP_PLANS: VipPlan[] = [
  {
    id: 'vip-1',
    tier: 'VIP 1',
    modelName: 'Obsidian Coupe GT',
    price: 300,
    dailyIncome: 80,
    totalIncome: 2400,
    validityDays: 30,
    image: '/src/assets/images/vip_coupe_gt_1794938615406.jpg',
    category: 'Starter',
  },
  {
    id: 'vip-2',
    tier: 'VIP 2',
    modelName: 'Track GT-R Spec',
    price: 1500,
    dailyIncome: 600,
    totalIncome: 18000,
    validityDays: 30,
    image: '/src/assets/images/vip_gtr_track_1794938615162.jpg',
    category: 'Starter',
  },
  {
    id: 'vip-3',
    tier: 'VIP 3',
    modelName: 'Apex Formula Pro',
    price: 3500,
    dailyIncome: 900,
    totalIncome: 27000,
    validityDays: 30,
    image: '/src/assets/images/vip_formula_pro_1794938615229.jpg',
    category: 'Performance',
  },
  {
    id: 'vip-4',
    tier: 'VIP 4',
    modelName: 'Le Mans Carbon LMP1',
    price: 5500,
    dailyIncome: 1200,
    totalIncome: 36000,
    validityDays: 30,
    image: '/src/assets/images/vip_hypercar_elite_1794938615919.jpg',
    category: 'Performance',
  },
  {
    id: 'vip-5',
    tier: 'VIP 5',
    modelName: 'Monolith V12 GT',
    price: 11000,
    dailyIncome: 2400,
    totalIncome: 72000,
    validityDays: 30,
    image: '/src/assets/images/vip_coupe_gt_1794938615406.jpg',
    category: 'Prototype',
  },
  {
    id: 'vip-6',
    tier: 'VIP 6',
    modelName: 'Formula Flagship One',
    price: 25000,
    dailyIncome: 5500,
    totalIncome: 165000,
    validityDays: 30,
    image: '/src/assets/images/vip_formula_pro_1794938615229.jpg',
    category: 'Prototype',
  },
];

export const RECHARGE_PRESETS = [300, 500, 1500, 3500, 5500, 11000, 25000, 50000];

export const GIFT_CODE_CATALOG: Record<string, { amount: number; label: string }> = {
  NEXAS100: { amount: 100, label: 'Starter Bonus' },
  WELCOME500: { amount: 500, label: 'VIP Launch Credit' },
  MONOCHROME250: { amount: 250, label: 'Member Reward' },
};
