 'use client';

import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  Utensils, 
  ChefHat, 
  BedDouble, 
  Settings, 
  Users, 
  DollarSign, 
  X,
  Package,
  TrendingUp,
  LogOut,
  BookOpen,
  CreditCard,
  FileText,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { hasFeature } from '@/lib/plans';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: Props) {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  // Get current plan (fallback to basic if undefined)
  const currentPlan = (profile?.plan_type || 'basic') as 'basic' | 'standard' | 'regular' | 'pro';

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: Home, roles: null, feature: null },
    { name: 'POS', href: '/admin/pos', icon: Utensils, roles: ['admin', 'manager', 'room_manager', 'waiter', 'bartender'], feature: 'pos' },
    { name: 'Kitchen', href: '/admin/kds', icon: ChefHat, roles: null, feature: 'kds' },
    { name: 'Reports', href: '/admin/reports', icon: TrendingUp, roles: ['admin', 'manager'], feature: 'pos' },
    { name: 'Expenses', href: '/admin/expenses', icon: DollarSign, roles: ['admin', 'manager'], feature: 'pos' },
    { name: 'Payroll', href: '/admin/payroll', icon: CreditCard, roles: ['admin', 'manager'], feature: 'payroll' },
    { name: 'Tax Reports', href: '/admin/reports/tax', icon: FileText, roles: ['admin', 'manager'], feature: 'tax' },
    { name: 'Stock', href: '/admin/stock', icon: Package, roles: ['admin', 'manager', 'chef', 'bartender'], feature: 'stock' },
    { name: 'Recipes', href: '/admin/settings/recipes', icon: BookOpen, roles: ['admin', 'manager', 'chef'], feature: 'stock' },
    { name: 'Guests', href: '/admin/settings/guests', icon: Users, roles: ['admin', 'manager', 'room_manager'], feature: 'rooms' },
    { name: 'Billing', href: '/pricing', icon: Zap, roles: ['admin', 'manager'], feature: null },
    { name: 'Settings', href: '/admin/settings', icon: Settings, roles: ['admin', 'manager'], feature: null },
  ];

  const filteredItems = navItems.filter(item => {
    if (item.roles && !profile?.role) return false;
    if (item.roles && !item.roles.includes(profile?.role || '')) return false;
    if (item.feature && !hasFeature(currentPlan, item.feature as any)) return false;
    return true;
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col h-screen`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          <h1 className="text-lg font-bold text-orange-400">{profile?.business_name || 'Dashboard'}</h1>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredItems.map((item) => (
            <Link key={item.name} href={item.href} onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition group">
              <item.icon size={18} className="text-gray-500 group-hover:text-orange-400" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
           <div className="flex items-center gap-2 mb-4">
             <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center"><Users size={14} className="text-gray-400"/></div>
             <div className="flex-1">
                <p className="text-xs text-white font-medium truncate">{profile?.full_name}</p>
                <p className="text-[10px] text-gray-500 uppercase">{profile?.role} • {currentPlan}</p>
             </div>
           </div>
           <button onClick={handleLogout} className="w-full py-2 bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-white rounded text-xs font-bold flex items-center justify-center gap-2 transition">
             <LogOut size={14} /> Log Out
           </button>
        </div>
      </aside>
    </>
  );
}