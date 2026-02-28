 import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { email, password, role, org_id, full_name } = await request.json();

    if (!email || !password || !role || !org_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check if user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: existingUser.id, org_id, role, full_name, email });

      if (profileError) throw profileError;
      
      // Return data for the modal
      return NextResponse.json({ 
        message: 'User updated!', 
        user: { email, password, full_name, role, isNew: false } 
      });
    } else {
      // Create new user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { org_id, role, full_name }
      });

      if (authError) throw authError;

      if (authData.user) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          org_id,
          role,
          full_name,
          email
        });
      }

      // Return data for the modal
      return NextResponse.json({ 
        message: 'User created!', 
        user: { email, password, full_name, role, isNew: true } 
      });
    }

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}