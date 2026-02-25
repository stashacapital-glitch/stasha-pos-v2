'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Users, Utensils, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ tables: 0, items: 0 });

  const supabase = createClient();

  useEffect(() => {
    if (profile?.org_id) {
      fetchData(profile.org_id);
    }
  }, [profile]);

  const fetchData = async (orgId: string) => {
    setLoading(true);

    const { count: tablesCount } = await supabase
      .from('tables')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    const { count: itemsCount } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    setStats({
      tables: tablesCount || 0,
      items: itemsCount || 0,
    });

    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-400 mb-8">Welcome back!</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Tables</p>
              <p className="text-3xl font-bold mt-1">{stats.tables}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Utensils className="text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Menu Items</p>
              <p className="text-3xl font-bold mt-1">{stats.items}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <TrendingUp className="text-green-400" size={24} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}