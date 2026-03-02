'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Plus, Trash2, Receipt, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExpensesPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('operational');

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
    else setExpenses(data || []);
    setLoading(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) { toast.error("Fill all fields"); return; }

    setSubmitting(true);
    const { error } = await supabase.from('expenses').insert({
      org_id: profile?.org_id,
      description,
      amount: parseFloat(amount),
      category,
      created_by: profile?.id
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Expense Added");
      setShowModal(false);
      setDescription('');
      setAmount('');
      fetchExpenses();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      fetchExpenses();
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-orange-400">Expense Management</h1>
          <p className="text-gray-400">Track business costs and expenditures.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-500"
        >
          <Plus size={18}/> Add Expense
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-900 rounded-lg">
            <TrendingDown className="text-red-400" size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total Expenses (This Period)</p>
            <p className="text-3xl font-bold text-white">KES {totalExpenses.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900 text-gray-400 border-b border-gray-700">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Description</th>
              <th className="p-4">Category</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {expenses.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No expenses recorded yet.</td></tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-700/50">
                  <td className="p-4 text-sm text-gray-400">
                    {new Date(exp.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 font-medium">{exp.description}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded text-xs bg-gray-600 text-gray-300 uppercase">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-red-400 font-bold">
                    - KES {exp.amount?.toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(exp.id)} className="text-red-500 hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADD EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Receipt size={20}/> Record Expense</h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input 
                  type="text" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600" 
                  placeholder="e.g. Paid electricity bill"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount (KES)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600" 
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  className="w-full p-3 bg-gray-700 rounded border border-gray-600"
                >
                  <option value="operational">Operational</option>
                  <option value="stock">Stock Purchase</option>
                  <option value="salary">Salary</option>
                  <option value="utility">Utility (Water/Elec)</option>
                  <option value="rent">Rent</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button type="submit" disabled={submitting} className="w-full py-3 bg-red-600 text-white rounded font-bold hover:bg-red-500 disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}