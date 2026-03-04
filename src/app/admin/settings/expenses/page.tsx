'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Trash2, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExpensesPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  
  // Form State
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('stock');
  const [description, setDescription] = useState('');
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
    setExpenses(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    setSubmitting(true);
    const { error } = await supabase.from('expenses').insert({
      org_id: profile?.org_id,
      amount: Number(amount),
      category,
      description
    });

    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('Expense recorded');
      setShowModal(false);
      fetchExpenses();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchExpenses();
  };

  // Calculate Total
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Expenses</h1>
          <p className="text-gray-400">Track spending and costs</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-red-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-red-500">
          <Plus size={18} /> Add Expense
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-6 flex justify-between items-center">
        <div>
          <p className="text-gray-400 text-sm">Total Expenses This Period</p>
          <p className="text-3xl font-bold text-red-400">KES {totalExpenses.toLocaleString()}</p>
        </div>
        <TrendingDown size={32} className="text-red-400 opacity-20" />
      </div>

      {/* List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900 text-gray-400 text-xs border-b border-gray-700">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Category</th>
              <th className="p-4">Description</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {expenses.map(exp => (
              <tr key={exp.id} className="hover:bg-gray-700/50">
                <td className="p-4 text-xs text-gray-300">{new Date(exp.created_at).toLocaleDateString()}</td>
                <td className="p-4 text-sm text-white capitalize">{exp.category}</td>
                <td className="p-4 text-sm text-gray-400">{exp.description || '-'}</td>
                <td className="p-4 text-right text-red-400 font-mono">KES {Number(exp.amount).toLocaleString()}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(exp.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Record Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600">
                  <option value="stock">Stock Purchase</option>
                  <option value="utilities">Utilities (Water/Elec)</option>
                  <option value="rent">Rent</option>
                  <option value="salary">Salary</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount (KES)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 bg-gray-700 rounded border border-gray-600" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (Optional)</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 2 Crates of Soda" className="w-full p-2 bg-gray-700 rounded border border-gray-600" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}