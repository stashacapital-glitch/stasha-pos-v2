 import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // Initialize Supabase with Service Role Key for admin privileges
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { email, role, org_id } = await request.json();

    if (!email || !role || !org_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check if user already exists in Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) throw listError;

    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      // 2A. User exists: Update their profile to join the org
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ org_id, role })
        .eq('id', existingUser.id);

      if (updateError) throw updateError;
      
      return NextResponse.json({ message: 'User added to organization successfully!' });

    } else {
      // 2B. User does not exist: Send an invitation
      // We pass org_id and role in user_metadata
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          org_id,
          role
        }
      });

      if (inviteError) throw inviteError;

      return NextResponse.json({ message: 'Invitation sent successfully!' });
    }

  } catch (error: any) {
    console.error('Team Invite Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}