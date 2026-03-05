 'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

type Profile = {
  id: string;
  org_id: string;
  role: string;
  business_name: string;
  email?: string;
  full_name?: string;
  is_on_shift: boolean;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    // 1. Fetch Basic Profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role, business_name, email, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profileData) {
      console.error("Profile fetch error", profileError);
      setLoading(false);
      return;
    }

    // 2. Check if user is a Staff Member (to check shift status)
    // We use maybeSingle() so it doesn't crash if no staff record exists (e.g. for Admins)
    const { data: staffData } = await supabase
      .from('staff')
      .select('is_on_shift, role')
      .eq('auth_id', userId)
      .maybeSingle();

    // 3. Determine Shift Status
    // If user is in staff table, use that status. 
    // If NOT in staff table (e.g. Admin/Owner), default to TRUE (always on shift).
    let onShift = true;
    let userRole = profileData.role;

    if (staffData) {
      onShift = staffData.is_on_shift ?? false;
      // Use staff role if available
      if (staffData.role) userRole = staffData.role;
    }

    const finalProfile: Profile = {
      ...profileData,
      is_on_shift: onShift,
      role: userRole
    };

    setProfile(finalProfile);
    setLoading(false);
  };

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session }, error }: { data: { session: Session | null }, error: any }) => {
      
      // If refresh token is invalid, sign out
      if (error) {
        console.error("Session Error:", error.message);
        supabase.auth.signOut();
        setLoading(false);
        return;
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user.id);
        router.push('/admin');
      }
      
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);