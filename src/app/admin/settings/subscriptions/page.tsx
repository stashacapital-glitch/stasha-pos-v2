 'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, Crown, User, Check, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';
import { PLANS } from '@/lib/plans';
import Link from 'next/link';

export default function SubscriptionsPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.org_id) fetchUsers();
  }, [profile]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, plan_type, created_at')
      .eq('org_id', profile?.org_id)
      .order('created_at', { ascending: false });
    
    if (data) setUsers(data);
    setLoading(false);
  };

  const handlePlanChange = async (userId: string, newPlan: string) => {
    setSavingId(userId);
    
    const { error } = await supabase
      .from('profiles')
      .update({ plan_type: newPlan })
      .eq('id', userId);

    if (error) {
      toast.error("Failed to update plan");
    } else {
      toast.success(`Plan updated to ${newPlan}!`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan_type: newPlan } : u));
    }
    setSavingId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/settings" className="p-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition">
               <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
               <h1 className="text-3xl font-bold text-orange-400">Subscription Manager</h1>
               <p className="text-sm text-gray-500">Manage user access levels</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="p-4">User</th>
                <th className="p-4">Email</th>
                <th className="p-4">Current Plan</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700/50">
                  <td className="p-4 text-white font-medium flex items-center gap-2">
                    <User size={16} className="text-gray-500" />
                    {user.full_name || 'Unknown'}
                  </td>
                  <td className="p-4 text-gray-300 text-sm">{user.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      user.plan_type === 'pro' ? 'bg-yellow-900 text-yellow-300' :
                      user.plan_type === 'regular' ? 'bg-blue-900 text-blue-300' :
                      user.plan_type === 'standard' ? 'bg-purple-900 text-purple-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {user.plan_type || 'basic'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <select
                      value={user.plan_type || 'basic'}
                      onChange={(e) => handlePlanChange(user.id, e.target.value)}
                      disabled={savingId === user.id}
                      className="bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm disabled:opacity-50"
                    >
                      {Object.keys(PLANS).map((planKey) => (
                        <option key={planKey} value={planKey}>
                          {PLANS[planKey as keyof typeof PLANS].name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PermissionGate>
  );
}