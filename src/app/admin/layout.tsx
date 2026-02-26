 'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, UtensilsCrossed, Users, Settings, LogOut, Utensils, ChefHat, FileText, TrendingUp, Menu, X
} from 'lucide-react';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import OfflineSync from '@/components/OfflineSync';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { organization } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile toggle

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const allNavItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, plans: ['basic', 'standard', 'regular', 'pro'] },
    { name: 'Live POS', href: '/admin/pos', icon: Utensils, plans: ['basic', 'standard', 'regular', 'pro'] },
    { name: 'Kitchen', href: '/admin/kitchen', icon: ChefHat, plans: ['regular', 'pro'] },
    { name: 'Menu Manager', href: '/admin/menu', icon: UtensilsCrossed, plans: ['basic', 'standard', 'regular', 'pro'] },
    { name: 'Reports', href: '/admin/reports', icon: TrendingUp, plans: ['basic', 'standard', 'regular', 'pro'] },
    { name: 'Stock Returns', href: '/admin/reports/returns', icon: FileText, plans: ['standard', 'regular', 'pro'] },
    { name: 'Staff', href: '/admin/staff', icon: Users, plans: ['basic', 'standard', 'regular', 'pro'] },
    { name: 'Settings', href: '/admin/settings', icon: Settings, plans: ['basic', 'standard', 'regular', 'pro'] },
  ];

  const currentTier = organization?.subscription_tier || 'basic';
  const navItems = allNavItems.filter(item => item.plans.includes(currentTier));

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden" 
            onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 border-r border-gray-700 flex flex-col transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:transform-none`}>
        <div className="h-16 flex items-center justify-between border-b border-gray-700 px-4">
          <h1 className="text-xl font-bold text-orange-400">StashaPOS</h1>
          <span className="text-[10px] bg-orange-500 text-black px-1 rounded ml-2">{currentTier.toUpperCase()}</span>
          {/* Close button for mobile */}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)} // Close on click mobile
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-orange-500 text-black font-bold' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <OfflineSync />
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-gray-300 hover:bg-red-600 hover:text-white rounded-lg transition mt-2"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-10 bg-gray-800 p-4 border-b border-gray-700 flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
                <Menu size={24} />
            </button>
            <span className="font-bold text-lg">StashaPOS</span>
        </div>
        
        {children}
      </main>
    </div>
  );
}