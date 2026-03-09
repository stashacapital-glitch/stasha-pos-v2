 'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  full_name: string;
  business_name?: string;
  role: string;
  org_id: string;
  is_on_shift?: boolean;
  address?: string;
  phone?: string;
  email?: string;
  tax_rate?: number;
  service_charge_rate?: number;
  tax_enabled?: boolean;
  plan_type?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  switchPlan: (plan: string) => void; // NEW FUNCTION
  activePlan: string; // NEW STATE
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  switchPlan: () => {},
  activePlan: 'basic',
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<string>('basic'); // Local state for testing
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error: any) {
        console.error("Session fetch error:", error.message);
        if (error.message.includes('Refresh Token') || error.message.includes('Not Found')) {
           await supabase.auth.signOut();
           router.push('/login');
        }
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setActivePlan('basic');
        setLoading(false);
      } else if (session) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data as Profile);
      setActivePlan(data.plan_type || 'basic'); // Set active plan from DB on load
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Function to switch plan view locally (for testing)
  const switchPlan = (plan: string) => {
    setActivePlan(plan);
    // Optionally update DB to make it permanent
    if (profile?.id) {
       supabase.from('profiles').update({ plan_type: plan }).eq('id', profile.id);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, switchPlan, activePlan }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};