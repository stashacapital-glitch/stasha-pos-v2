 'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { 
  Home, Utensils, ChefHat, Package, BarChart3, 
  Receipt, Users, Settings, LogOut, Menu, X 
} from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navigation = [
    // Dashboard is ONLY active on exactly /admin
    { name: 'Dashboard', href: '/admin', icon: Home, matches: ['/admin'] },
    
    // Live POS is ONLY active on exactly /admin/pos
    { name: 'Live POS', href: '/admin/pos', icon: Utensils, matches: ['/admin/pos'] },
    
    { name: 'Kitchen', href: '/admin/kitchen', icon: ChefHat, matches: ['/admin/kitchen'] },
    { name: 'Menu Manager', href: '/admin/menu', icon: Package, matches: ['/admin/menu'] },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3, matches: ['/admin/reports'] },
    { name: 'Expenses', href: '/admin/expenses', icon: Receipt, matches: ['/admin/expenses'] },
    { name: 'Team', href: '/admin/settings/team', icon: Users, matches: ['/admin/settings/team'] },
    { name: 'Settings', href: '/admin/settings', icon: Settings, matches: ['/admin/settings'] },
  ];

  const isActive = (matches: string[]) => matches.includes(pathname);

  return (
    <>
      {/* Mobile Hamburger Button */}
      <div className="lg:hidden fixed top-0 left-0 w-full bg-gray-900 z-50 flex items-center justify-between p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-orange-400">StashaPOS</h1>
        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-400">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen pt-4 lg:pt-0 transition-transform bg-gray-900 border-r border-gray-800 w-64
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0
      `}>
        <div className="h-full flex flex-col px-3 py-4 overflow-y-auto">
          
          {/* Logo */}
          <Link href="/admin" className="flex items-center mb-5 ps-2.5 mt-4 lg:mt-0">
            <span className="self-center text-xl font-bold whitespace-nowrap text-orange-400">StashaPOS</span>
            <span className="ml-2 text-xs bg-orange-600 text-black px-1.5 py-0.5 rounded font-bold">PRO</span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 p-3 rounded-lg font-medium transition
                  ${isActive(item.matches) 
                    ? 'bg-orange-500 text-black' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User Profile & logout */}
          <div className="border-t border-gray-800 pt-4 mt-4 space-y-2">
             <div className="flex items-center gap-3 px-3 py-2 rounded bg-gray-800">
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white">
                   {profile?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'User'}</p>
                   <p className="text-xs text-gray-400 truncate">{profile?.role?.toUpperCase()}</p>
                </div>
             </div>

             <button
               onClick={handleLogout}
               className="w-full flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition"
             >
               <LogOut size={20} />
               <span>Logout</span>
             </button>
          </div>
        </div>
      </aside>
    </>
  );
}