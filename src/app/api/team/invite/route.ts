 import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // ADDED: full_name to the request body
    const { email, role, org_id, full_name } = await request.json();

    if (!email || !role || !org_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check if user already exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      // 2A. User exists: Update their profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ org_id, role, full_name: full_name || null }) // Update name too
        .eq('id', existingUser.id);

      if (updateError) throw updateError;
      return NextResponse.json({ message: 'User added to organization successfully!' });

    } else {
      // 2B. New user: Send invite with name in metadata
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          org_id,
          role,
          full_name // Passed to metadata so the trigger can use it
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