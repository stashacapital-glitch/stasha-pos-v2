 import Link from 'next/link';
import { Users, DoorOpen, UserCircle2, Utensils, Settings } from 'lucide-react';

export default function SettingsHub() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-orange-400 mb-2">Settings</h1>
      <p className="text-gray-400 mb-8">Manage your organization, team, and business operations.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Menu Manager Card */}
        <Link href="/admin/menu">
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 hover:border-orange-500 transition cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-orange-900 rounded-lg">
                <Utensils className="text-orange-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Menu Manager</h2>
                <p className="text-gray-400 text-sm">Food & Drinks setup</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Add categories, set prices, manage stock availability.
            </p>
          </div>
        </Link>

        {/* Team Management Card */}
        <Link href="/admin/settings/team">
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 hover:border-orange-500 transition cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-900 rounded-lg">
                <Users className="text-blue-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Team Management</h2>
                <p className="text-gray-400 text-sm">Invite staff & assign roles</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Manage waiters, kitchen staff, and admins. Create accounts and share login details via WhatsApp.
            </p>
          </div>
        </Link>

        {/* Room Management Card */}
        <Link href="/admin/settings/rooms">
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 hover:border-orange-500 transition cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-900 rounded-lg">
                <DoorOpen className="text-purple-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Room Management</h2>
                <p className="text-gray-400 text-sm">Hotel rooms & pricing</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Add hotel rooms, set prices per night, and track availability status.
            </p>
          </div>
        </Link>

        {/* Guest Management Card */}
        <Link href="/admin/settings/guests">
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 hover:border-orange-500 transition cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-teal-900 rounded-lg">
                <UserCircle2 className="text-teal-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Guest Management</h2>
                <p className="text-gray-400 text-sm">Customers & visitors</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Store guest details, ID numbers, and contact info for quick check-ins.
            </p>
          </div>
        </Link>

      </div>
    </div>
  );
}