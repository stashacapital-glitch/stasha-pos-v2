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
    // 1. Fetch basic profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role, business_name, email, full_name')
      .eq('id', userId)
      .maybeSingle();

    // Handle critical errors or missing profile
    if (profileError) {
      console.error("Profile fetch DB error:", JSON.stringify(profileError));
    }

    if (!profileData) {
      console.warn("No profile found. Attempting to create one...");
      
      // Auto-create profile if missing (Self-healing)
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email || 'user@example.com';
      const newOrgId = crypto.randomUUID();

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: email.split('@')[0],
          org_id: newOrgId,
          role: 'admin',
          business_name: 'My Business'
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to auto-create profile:", insertError);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      console.log("Profile auto-created successfully.");
      setProfile({ ...newProfile, is_on_shift: true } as Profile);
      setLoading(false);
      return;
    }

    // 2. Check Staff Status (Shift + Active Check)
    const { data: staffData } = await supabase
      .from('staff')
      .select('is_on_shift, role, is_active') // Fetch is_active
      .eq('auth_id', userId)
      .maybeSingle();

    let onShift = true; // Default for Admins
    let userRole = profileData.role;

    if (staffData) {
      // SECURITY CHECK: If staff is inactive, force logout
      if (staffData.is_active === false) {
        console.warn("Staff member is inactive. Blocking access.");
        await supabase.auth.signOut();
        toast.error("Your account has been deactivated.");
        setLoading(false);
        return;
      }

      onShift = staffData.is_on_shift ?? false;
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