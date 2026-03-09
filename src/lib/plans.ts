 // src/lib/plans.ts

export type PlanType = 'basic' | 'standard' | 'regular' | 'pro';

export interface PlanFeatures {
  name: string;
  price: string;
  userLimit: number;
  tableLimit: number | null;
  features: {
    pos: boolean;
    quickSale: boolean; // NEW: Basic uses this
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
    tableLimit: 0,
    features: {
      pos: true,      // Has POS access
      quickSale: true, // Uses Quick Sale (No Menu/Tables)
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
    tableLimit: 5,
    features: {
      pos: true,
      quickSale: false, // Uses Full POS
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
    tableLimit: null,
    features: {
      pos: true,
      quickSale: false,
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
      quickSale: false,
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

export function hasFeature(plan: PlanType | undefined, feature: keyof PlanFeatures['features']): boolean {
  if (!plan) return false;
  return PLANS[plan]?.features[feature] ?? false;
}