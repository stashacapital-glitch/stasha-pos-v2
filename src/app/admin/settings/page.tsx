 'use client';

import PermissionGate from '@/components/PermissionGate';
import Link from 'next/link';
import { Users, Utensils, BedDouble, Settings2, UserPlus, Table } from 'lucide-react';

export default function SettingsHubPage() {
  const settingsCards = [
    // Admin & Manager
    { name: 'Team Management', href: '/admin/settings/staff', icon: Users, desc: 'Manage staff & logins', color: 'text-blue-400', roles: ['admin', 'manager'] }, 
    { name: 'Business Profile', href: '/admin/settings/profile', icon: Settings2, desc: 'Name, Tax & Receipt', color: 'text-green-400', roles: ['admin', 'manager'] },
    { name: 'Menu Management', href: '/admin/settings/menu', icon: Utensils, desc: 'Edit items & prices', color: 'text-orange-400', roles: ['admin', 'manager'] },
    { name: 'Table Setup', href: '/admin/settings/tables', icon: Table, desc: 'Configure restaurant tables', color: 'text-purple-400', roles: ['admin', 'manager'] },
    { name: 'Room Setup', href: '/admin/settings/rooms', icon: BedDouble, desc: 'Add or edit rooms', color: 'text-purple-400', roles: ['admin', 'manager'] },
    
    // Admin, Manager & Room Manager
    { name: 'Guest Management', href: '/admin/settings/guests', icon: UserPlus, desc: 'Manage guests', color: 'text-green-400', roles: ['admin', 'manager', 'room_manager'] },
  ];

  return (
    <PermissionGate allowedRoles={['admin', 'manager', 'room_manager']} fallback={<div className="p-8 text-red-400 text-center">Access Denied.</div>}>
      <div className="h-full overflow-y-auto bg-gray-900">
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settingsCards.map((card) => (
              <Link 
                key={card.name} 
                href={card.href}
                className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-orange-500 transition group cursor-pointer block"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-gray-700 rounded-lg group-hover:bg-gray-600 transition">
                    <card.icon className={card.color} size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition">{card.name}</h3>
                </div>
                <p className="text-sm text-gray-400">{card.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}