 'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export async function createStaffUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const role = formData.get('role') as string;

  // 1. Get current user's org_id
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return { error: 'No organization found' };

  // 2. Create user with Admin API
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: { 
      full_name: fullName,
      org_id: profile.org_id 
    }
  });

  if (error) {
    return { error: error.message };
  }

  // 3. Update the profile with role and org_id explicitly
  if (data.user) {
    await supabaseAdmin.from('profiles').update({
      role: role,
      org_id: profile.org_id,
      full_name: fullName
    }).eq('id', data.user.id);
  }

  return { success: true };
}