 "use client";

import { useAuth } from '@/contexts/AuthContext';

type Role = 'owner' | 'admin' | 'barman' | 'waiter';

type Props = {
  allowedRoles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function PermissionGate({ allowedRoles, children, fallback = null }: Props) {
  const { role, loading } = useAuth();

  if (loading) return null;

  if (role && allowedRoles.includes(role as Role)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}