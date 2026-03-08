// src/lib/plans.ts

export type PlanType = 'basic' | 'standard' | 'regular' | 'pro';

export interface PlanFeatures {
  name: string;
  price: string;
  userLimit: number;
  tableLimit: number | null; // null = unlimited
  features: {
    pos: boolean;
    stock: boolean;
    offline: boolean;
    tables: boolean;
    kds: boolean;
    rooms: boolean;
    payroll: boolean;
    tax: boolean;
    multiBranch: boolean;
  };
}

export const PLANS: Record<PlanType, PlanFeatures> = {
  basic: {
    name: 'Basic',
    price: '2,500',
    userLimit: 3,
    tableLimit: 0, // 0 means disabled
    features: {
      pos: true,
      stock: true,
      offline: true,
      tables: false,
      kds: false,
      rooms: false,
      payroll: false,
      tax: false,
      multiBranch: false,
    },
  },
  standard: {
    name: 'Standard',
    price: '5,500',
    userLimit: 5,
    tableLimit: 5, // Max 5 tables
    features: {
      pos: true,
      stock: true,
      offline: true,
      tables: true,
      kds: false,
      rooms: false,
      payroll: false,
      tax: false,
      multiBranch: false,
    },
  },
  regular: {
    name: 'Regular',
    price: '9,500',
    userLimit: 10,
    tableLimit: null, // Unlimited
    features: {
      pos: true,
      stock: true,
      offline: true,
      tables: true,
      kds: true,
      rooms: false,
      payroll: false,
      tax: false,
      multiBranch: false,
    },
  },
  pro: {
    name: 'Pro',
    price: 'Custom',
    userLimit: Infinity,
    tableLimit: null,
    features: {
      pos: true,
      stock: true,
      offline: true,
      tables: true,
      kds: true,
      rooms: true,
      payroll: true,
      tax: true,
      multiBranch: true,
    },
  },
};

// Helper to check if a feature is allowed
export function hasFeature(plan: PlanType | undefined, feature: keyof PlanFeatures['features']): boolean {
  if (!plan) return false;
  return PLANS[plan]?.features[feature] ?? false;
}

// Helper to check user limit
export function canAddUser(plan: PlanType | undefined, currentCount: number): boolean {
  if (!plan) return false;
  const limit = PLANS[plan].userLimit;
  return currentCount < limit;
}

// Helper to check table limit
export function canAddTable(plan: PlanType | undefined, currentCount: number): boolean {
  if (!plan) return false;
  const limit = PLANS[plan].tableLimit;
  if (limit === null) return true; // Unlimited
  return currentCount < limit;
}