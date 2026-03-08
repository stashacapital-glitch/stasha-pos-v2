 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, DollarSign, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';
import { calculatePayslip } from '@/lib/payrollCalculator';

export default function PayrollPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (profile?.org_id) fetchStaff();
  }, [profile]);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('org_id', profile?.org_id)
      .eq('is_active', true);
    
    if (data) setStaff(data);
    setLoading(false);
  };

  const updateSalary = async (id: string, salary: number) => {
    await supabase.from('staff').update({ base_salary: salary }).eq('id', id);
    setStaff(prev => prev.map(s => s.id === id ? { ...s, base_salary: salary } : s));
    toast.success('Salary updated');
  };

  const handleRunPayroll = async () => {
    if (!confirm(`Run payroll for ${payrollMonth}? This will save records.`)) return;
    
    setRunning(true);

    try {
      // 1. Check if payroll exists
      const { data: existing } = await supabase
        .from('payroll_runs')
        .select('id')
        .eq('org_id', profile?.org_id)
        .eq('period', payrollMonth)
        .maybeSingle();

      if (existing) throw new Error("Payroll for this month already exists.");

      let totals = { gross: 0, paye: 0, nssf: 0, shif: 0, levy: 0, net: 0 };
      const payslipsPayload = [];

      // 2. Calculate for each staff
      for (const s of staff) {
        const salary = s.base_salary || 0;
        if (salary === 0) continue;

        const calc = calculatePayslip(salary, 0);

        totals.gross += calc.grossPay;
        totals.paye += calc.paye;
        totals.nssf += calc.nssf;
        totals.shif += calc.shif;
        totals.levy += calc.housingLevy;
        totals.net += calc.netPay;

        payslipsPayload.push({
          org_id: profile?.org_id,
          staff_id: s.id,
          period: payrollMonth,
          ...calc
        });
      }

      // 3. Insert Payroll Run
      const { data: run, error: runError } = await supabase
        .from('payroll_runs')
        .insert({
          org_id: profile?.org_id,
          period: payrollMonth,
          total_gross: totals.gross,
          total_paye: totals.paye,
          total_nssf: totals.nssf,
          total_shif: totals.shif,
          total_housing_levy: totals.levy,
          total_net: totals.net,
          status: 'paid'
        })
        .select('id')
        .single();

      if (runError) throw runError;

      // 4. Insert Payslips
      const { error: slipError } = await supabase.from('payslips').insert(payslipsPayload.map(p => ({ ...p, payroll_run_id: run.id })));
      if (slipError) throw slipError;

      toast.success("Payroll Processed Successfully!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-orange-400">Payroll Management</h1>
          
          <div className="flex items-center gap-4">
            <input 
              type="month" 
              value={payrollMonth} 
              onChange={(e) => setPayrollMonth(e.target.value)} 
              className="p-2 bg-gray-700 rounded border border-gray-600 text-white"
            />
            <button 
              onClick={handleRunPayroll}
              disabled={running}
              className="bg-green-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-green-500 disabled:opacity-50"
            >
              {running ? <Loader2 className="animate-spin"/> : <Calculator size={18} />}
              Run Payroll
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr className="text-left text-gray-400 border-b border-gray-700 text-xs uppercase">
                <th className="p-4">Employee</th>
                <th className="p-4">Role</th>
                <th className="p-4">Basic Salary</th>
                <th className="p-4">PAYE</th>
                <th className="p-4">NSSF</th>
                <th className="p-4">SHIF</th>
                <th className="p-4">Housing</th>
                <th className="p-4 font-bold text-green-400">Net Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {staff.map((s) => {
                const calc = calculatePayslip(s.base_salary || 0, 0);
                return (
                  <tr key={s.id} className="hover:bg-gray-700/50">
                    <td className="p-4 text-white font-medium">{s.full_name}</td>
                    <td className="p-4 text-gray-300 text-sm">{s.role}</td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        value={s.base_salary || 0}
                        onChange={(e) => updateSalary(s.id, parseFloat(e.target.value))}
                        className="w-24 bg-gray-700 p-1 rounded border border-gray-600 text-white text-sm"
                      />
                    </td>
                    <td className="p-4 text-red-400 text-sm font-mono">KES {calc.paye.toLocaleString()}</td>
                    <td className="p-4 text-blue-400 text-sm font-mono">KES {calc.nssf.toLocaleString()}</td>
                    <td className="p-4 text-purple-400 text-sm font-mono">KES {calc.shif.toLocaleString()}</td>
                    <td className="p-4 text-yellow-400 text-sm font-mono">KES {calc.housingLevy.toLocaleString()}</td>
                    <td className="p-4 text-green-400 font-bold font-mono">KES {calc.netPay.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGate>
  );
}