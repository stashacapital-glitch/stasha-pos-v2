 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Printer } from 'lucide-react';
import PermissionGate from '@/components/PermissionGate';

export default function TaxReportsPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [sales, setSales] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [vatOutput, setVatOutput] = useState(0);
  const [vatInput, setVatInput] = useState(0);
  const [profit, setProfit] = useState(0);
  const [estimatedCorpTax, setEstimatedCorpTax] = useState(0);

  useEffect(() => {
    if (profile?.org_id) fetchTaxData();
  }, [profile, startDate, endDate]);

  const fetchTaxData = async () => {
    setLoading(true);

    // 1. Total Sales
    const { data: orders } = await supabase
      .from('orders')
      .select('total_price')
      .eq('org_id', profile?.org_id)
      .eq('status', 'paid')
      .gte('paid_at', `${startDate}T00:00:00`)
      .lte('paid_at', `${endDate}T23:59:59`);

    const totalSales = orders?.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0) || 0;
    setSales(totalSales);

    // 2. Expenses
    const { data: exp } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('org_id', profile?.org_id)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    const totalExp = exp?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
    setExpenses(totalExp);

    // 3. VAT Computation (16%)
    const vatOut = totalSales * 0.16;
    setVatOutput(vatOut);

    // VAT Input (16% of allowable expenses)
    const allowableExp = exp?.filter((e: any) => e.category !== 'salary').reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
    const vatIn = allowableExp * 0.16;
    setVatInput(vatIn);

    // 4. Profit & Corp Tax (15% SME Rate)
    const netProfit = totalSales - totalExp;
    setProfit(netProfit);
    const corpTax = netProfit > 0 ? netProfit * 0.15 : 0;
    setEstimatedCorpTax(corpTax);

    setLoading(false);
  };

  const formatMoney = (val: number) => val.toLocaleString('en-KE', { minimumFractionDigits: 2 });

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-orange-400">KRA Tax Reports</h1>
             <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
                <Printer size={16} /> Print / PDF
            </button>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6 print:bg-white print:text-black">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">VAT Return Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                    <p className="flex justify-between"><span>Total Sales (Turnover):</span> <b>KES {formatMoney(sales)}</b></p>
                    <p className="flex justify-between text-gray-400"><span>VAT on Sales (16%):</span> <b>KES {formatMoney(vatOutput)}</b></p>
                </div>
                <div className="space-y-2">
                    <p className="flex justify-between"><span>Allowable Expenses:</span> <b>KES {formatMoney(expenses)}</b></p>
                    <p className="flex justify-between text-gray-400"><span>VAT on Purchases (Est.):</span> <b>KES {formatMoney(vatInput)}</b></p>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-600 flex justify-between text-lg font-bold">
                <span>VAT Payable (Output - Input):</span>
                <span className="text-red-400">KES {formatMoney(Math.max(0, vatOutput - vatInput))}</span>
            </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 print:bg-white print:text-black">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">Income Tax Computation</h2>
            
            <div className="space-y-2 text-sm">
                <p className="flex justify-between"><span>Gross Profit:</span> <b>KES {formatMoney(profit)}</b></p>
                <p className="text-xs text-gray-400">(Sales - All Expenses)</p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-600">
                <p className="text-gray-400 text-xs mb-2">Corporate Tax Estimation (SME Rate 15%)</p>
                <div className="flex justify-between text-xl font-bold">
                    <span>Estimated Tax Liability:</span>
                    <span className="text-red-400">KES {formatMoney(estimatedCorpTax)}</span>
                </div>
            </div>
        </div>
      </div>
    </PermissionGate>
  );
}