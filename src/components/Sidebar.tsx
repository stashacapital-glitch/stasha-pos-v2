 'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase';
import { 
  Home, Monitor, BedDouble, CookingPot, Package, TrendingUp, 
  Settings, Users, Utensils, DollarSign, X, ChevronDown, Calculator, UserCheck, LogOut, Building 
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const linkClass = (isActive: boolean) => 
  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left ${
    isActive ? 'bg-orange-500 text-black font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
  }`;

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auto-open settings if we are on a settings page
  const isSettingsActive = pathname.includes('/settings') || pathname.includes('/stock/returns');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out');
    router.push('/login');
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center flex-shrink-0">
          <h1 className="text-xl font-bold text-orange-400">STASHA POS</h1>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white"><X size={24} /></button>
        </div>

        {/* Navigation (Scrollable) */}
        <nav className="p-4 space-y-1 overflow-y-auto flex-grow">
          <Link href="/admin" onClick={onClose} className={linkClass(pathname === '/admin')}><Home size={18} /> Dashboard</Link>
          <Link href="/admin/pos" onClick={onClose} className={linkClass(pathname.startsWith('/admin/pos'))}><Monitor size={18} /> POS Terminal</Link>
          <Link href="/admin/kds" onClick={onClose} className={linkClass(pathname === '/admin/kds')}><CookingPot size={18} /> Kitchen</Link>
          <Link href="/admin/rooms" onClick={onClose} className={linkClass(pathname === '/admin/rooms')}><BedDouble size={18} /> Rooms</Link>
          <Link href="/admin/stock" onClick={onClose} className={linkClass(pathname === '/admin/stock')}><Package size={18} /> Stock</Link>
          <Link href="/admin/reports" onClick={onClose} className={linkClass(pathname === '/admin/reports')}><TrendingUp size={18} /> Reports</Link>

          {/* Settings Dropdown */}
          <div className="pt-4 border-t border-gray-800 mt-4">
            <button 
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors ${isSettingsActive ? 'text-white bg-gray-800' : ''}`}
            >
              <div className="flex items-center gap-3"><Settings size={18} /> Settings</div>
              <ChevronDown size={16} className={`transition-transform ${settingsOpen || isSettingsActive ? 'rotate-180' : ''}`} />
            </button>

            {(settingsOpen || isSettingsActive) && (
              <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1">
                <Link href="/admin/settings/business" onClick={onClose} className={linkClass(pathname.includes('/business'))}><Building size={16} /> Business</Link>
                <Link href="/admin/settings/guests" onClick={onClose} className={linkClass(pathname.includes('/guests'))}><Users size={16} /> Guests</Link>
                <Link href="/admin/settings/menu" onClick={onClose} className={linkClass(pathname.includes('/menu'))}><Utensils size={16} /> Menu</Link>
                
                {/* TEAM MANAGEMENT / STAFF LINK */}
                <Link href="/admin/settings/staff" onClick={onClose} className={linkClass(pathname.includes('/staff'))}>
                  <UserCheck size={16} /> Staff / Team
                </Link>

                <Link href="/admin/settings/expenses" onClick={onClose} className={linkClass(pathname.includes('/expenses'))}><DollarSign size={16} /> Expenses</Link>
                <Link href="/admin/stock/returns" onClick={onClose} className={linkClass(pathname.includes('/stock/returns'))}><Calculator size={16} /> Stock Returns</Link>
              </div>
            )}
          </div>
        </nav>

        {/* Footer (Logout) - Fixed at bottom */}
        <div className="p-4 border-t border-gray-800 flex-shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/50 transition-colors">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}