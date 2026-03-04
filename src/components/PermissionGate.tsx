 'use client';

import { useAuth } from '@/contexts/AuthContext';

// Updated to include all roles found in the project
type Role = 'admin' | 'manager' | 'waiter' | 'chef' | 'bartender' | 'room_manager' | 'owner' | 'kitchen_master' | 'barman';

type Props = {
  allowedRoles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function PermissionGate({ allowedRoles, children, fallback = null }: Props) {
  const { profile } = useAuth();

  if (!profile) return null;

  // Cast profile.role to Role type to satisfy TypeScript
  const hasPermission = allowedRoles.includes(profile.role as Role);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}