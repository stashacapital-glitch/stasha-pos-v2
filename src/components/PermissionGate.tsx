 'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// UPDATED: Added kitchen_master and room_keeper
type Role = 'owner' | 'admin' | 'barman' | 'waiter' | 'kitchen_master' | 'room_keeper';

export default function PermissionGate({
  children,
  allowedRoles
}: {
  children: React.ReactNode;
  allowedRoles: Role[]
}) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and no profile, redirect to login
    if (!loading && !profile) {
      router.push('/login');
    }
  }, [profile, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading...
      </div>
    );
  }

  if (!profile) return null;

  const hasPermission = allowedRoles.includes(profile.role);

  if (!hasPermission) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
        <p className="text-gray-400">You do not have permission to view this page.</p>
        <button
          onClick={() => router.push('/admin')}
          className="mt-4 px-4 py-2 bg-orange-500 text-black rounded font-bold"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}