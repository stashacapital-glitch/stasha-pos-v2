 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Trash2, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';

export default function ExpensesPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('operations');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) fetchExpenses();
  }, [profile]);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('org_id', profile?.org_id)
      .order('created_at', { ascending: false });

    if (error) toast.error('Failed to load expenses');
    
    if (data) {
      setExpenses(data);
      // FIX: Explicitly type 'sum' as number
      const total = data.reduce((sum: number, e) => sum + (e.amount || 0), 0);
      setTotalExpenses(total);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      toast.error("Fill all fields");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('expenses').insert({
      org_id: profile?.org_id,
      description,
      amount: parseFloat(amount),
      category
    });

    if (error) {
      toast.error("Error saving expense");
    } else {
      toast.success("Expense added");
      setShowModal(false);
      fetchExpenses();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchExpenses();
    toast.success("Deleted");
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-orange-400">Expenses</h1>
          <button onClick={() => setShowModal(true)} className="bg-orange-500 text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-orange-400">
            <Plus size={18} /> Add Expense
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6 flex items-center gap-4">
          <DollarSign className="text-red-400" size={32} />
          <div>
            <p className="text-gray-400 text-sm">Total Expenses This Period</p>
            <p className="text-3xl font-bold text-white">KES {totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="p-4 text-gray-400">Date</th>
                <th className="p-4 text-gray-400">Category</th>
                <th className="p-4 text-gray-400">Description</th>
                <th className="p-4 text-gray-400 text-right">Amount</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td className="p-4 text-gray-300">{new Date(exp.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-gray-300 capitalize">{exp.category}</td>
                  <td className="p-4 text-white">{exp.description}</td>
                  <td className="p-4 text-right font-mono text-white">KES {exp.amount?.toLocaleString()}</td>
                  <td className="p-4 text-right">
                     <button onClick={() => handleDelete(exp.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Add Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white">
                  <option value="operations">Operations</option>
                  <option value="stock">Stock Purchase</option>
                  <option value="salary">Salary</option>
                  <option value="utilities">Utilities</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="rent">Rent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount (KES)</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500 text-white">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-orange-500 text-black font-bold rounded disabled:opacity-50">{submitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PermissionGate>
  );
}