 // src/lib/payrollCalculator.ts

// Kenya Tax Rates 2024

// 1. NSSF (6% of Basic)
const NSSF_RATE = 0.06;

// 2. SHIF (2.75% of Gross)
const SHIF_RATE = 0.0275;

// 3. Housing Levy (1.5% of Gross)
const HOUSING_LEVY_RATE = 0.015;

// 4. PAYE Parameters
const PERSONAL_RELIEF = 2400;
const TAX_BANDS = [
  { limit: 24000, rate: 0.10 },
  { limit: 32333, rate: 0.25 },
  { limit: 500000, rate: 0.30 },
  { limit: 800000, rate: 0.325 },
  { limit: Infinity, rate: 0.35 }
];

export function calculatePaye(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let totalTax = 0;
  let remainingIncome = taxableIncome;
  let previousLimit = 0;

  for (const band of TAX_BANDS) {
    const taxableInBand = Math.min(remainingIncome, band.limit - previousLimit);
    if (taxableInBand > 0) {
      totalTax += taxableInBand * band.rate;
      remainingIncome -= taxableInBand;
    }
    previousLimit = band.limit;
    if (remainingIncome <= 0) break;
  }
  const paye = Math.max(0, totalTax - PERSONAL_RELIEF);
  return Math.round(paye * 100) / 100;
}

export interface PayslipCalculation {
  basicSalary: number;
  allowances: number;
  grossPay: number;
  nssf: number;
  shif: number;
  housingLevy: number;
  taxableIncome: number;
  paye: number;
  netPay: number;
  totalDeductions: number;
}

export function calculatePayslip(basic: number, allowances: number = 0): PayslipCalculation {
  const basicSalary = Number(basic) || 0;
  const allowancesVal = Number(allowances) || 0;

  const grossPay = basicSalary + allowancesVal;
  const nssf = Math.round(basicSalary * NSSF_RATE * 100) / 100;
  const taxableIncome = grossPay - nssf;
  const paye = calculatePaye(taxableIncome);
  const shif = Math.round(grossPay * SHIF_RATE * 100) / 100;
  const housingLevy = Math.round(grossPay * HOUSING_LEVY_RATE * 100) / 100;
  const totalDeductions = paye + nssf + shif + housingLevy;
  const netPay = grossPay - totalDeductions;

  return {
    basicSalary,
    allowances: allowancesVal,
    grossPay,
    nssf,
    shif,
    housingLevy,
    taxableIncome,
    paye,
    netPay,
    totalDeductions
  };
}