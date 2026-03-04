'use client';

import { Menu, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function TopNav({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out');
    router.push('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-30 lg:hidden">
      <button onClick={onMenuClick} className="text-white p-2 hover:bg-gray-800 rounded">
        <Menu size={24} />
      </button>
      
      <h1 className="font-bold text-orange-400">STASHA POS</h1>

      <div className="flex items-center gap-2">
        {profile && (
          <span className="text-xs text-gray-400 hidden sm:block">{profile.full_name}</span>
        )}
        <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 p-2">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}