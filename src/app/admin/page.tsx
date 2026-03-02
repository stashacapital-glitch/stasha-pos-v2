 // This is now a real Dashboard page, not a redirect.
import Link from 'next/link';
import { BarChart3, Utensils, TrendingUp, Users } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-orange-400 mb-2">Dashboard</h1>
      <p className="text-gray-400 mb-8">Welcome back! Here is your overview.</p>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-400 text-sm">Sales Today</h3>
            <BarChart3 size={20} className="text-green-400"/>
          </div>
          <p className="text-3xl font-bold text-white mt-2">KES 0</p>
          <p className="text-xs text-gray-500 mt-1">View Reports for details</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-400 text-sm">Active Orders</h3>
            <Utensils size={20} className="text-orange-400"/>
          </div>
          <p className="text-3xl font-bold text-white mt-2">0</p>
          <p className="text-xs text-gray-500 mt-1">Open Live POS to manage</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-400 text-sm">Expenses</h3>
            <TrendingUp size={20} className="text-red-400"/>
          </div>
          <p className="text-3xl font-bold text-white mt-2">KES 0</p>
          <p className="text-xs text-gray-500 mt-1">Track your spending</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-400 text-sm">Team Members</h3>
            <Users size={20} className="text-blue-400"/>
          </div>
          <p className="text-3xl font-bold text-white mt-2">0</p>
          <p className="text-xs text-gray-500 mt-1">Manage staff roles</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="flex gap-4">
          <Link href="/admin/pos" className="px-4 py-2 bg-orange-500 text-black rounded font-bold hover:bg-orange-400">
            Open POS
          </Link>
          <Link href="/admin/reports" className="px-4 py-2 bg-gray-600 text-white rounded font-bold hover:bg-gray-500">
            View Reports
          </Link>
        </div>
      </div>
    </div>
  );
}