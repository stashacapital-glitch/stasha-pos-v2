 // src/lib/plans.ts

export type PlanType = 'basic' | 'standard' | 'regular' | 'pro';

export interface PlanFeatures {
  name: string;
  price: string;
  userLimit: number;
  tableLimit: number | null;
  features: {
    pos: boolean;
    quickSale: boolean;
    stock: boolean;
    offline: boolean;
    tables: boolean;
    kds: boolean;
    rooms: boolean;
    guests: boolean;
    payroll: boolean;
    tax: boolean;
    multiBranch: boolean;
  };
}

export const PLANS: Record<PlanType, PlanFeatures> = {
  // 1. BASIC PLAN
  basic: {
    name: 'Basic',
    price: '2,200',
    userLimit: 3,
    tableLimit: 0,
    features: {
      pos: true,
      quickSale: true, 
      stock: true,
      offline: true,
      tables: false,   
      kds: false,
      rooms: false,
      guests: false,
      payroll: false,
      tax: false,
      multiBranch: false,
    },
  },

  // 2. STANDARD PLAN
  standard: {
    name: 'Standard',
    price: '4,500',
    userLimit: 5,
    tableLimit: 5,       
    features: {
      pos: true,
      quickSale: false, 
      stock: true,
      offline: true,
      tables: true,     // Table Management Included
      kds: false,       // Add-on
      rooms: false,     // Add-on
      guests: false,
      payroll: false,
      tax: false,
      multiBranch: false,
    },
  },

  // 3. REGULAR PLAN (Includes KDS now)
  regular: {
    name: 'Regular',
    price: '8,000',
    userLimit: 10,
    tableLimit: null, // Unlimited
    features: {
      pos: true,
      quickSale: false,
      stock: true,
      offline: true,
      tables: true,
      kds: true,       // Included per strategy
      rooms: true,
      guests: true,
      payroll: true,
      tax: true,
      multiBranch: false,
    },
  },

  // 4. PRO PLAN (Anchor Price)
  pro: {
    name: 'Pro',
    price: '15,000+', // Anchor Price
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
      guests: true,
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