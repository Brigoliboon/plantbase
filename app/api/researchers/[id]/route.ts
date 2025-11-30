import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';

type RawResearcher = {
  contact?: Record<string, unknown> | null;
  [key: string]: unknown;
};

const normalizeResearcher = (record: RawResearcher) => ({
  ...record,
  contact: (record.contact as Record<string, unknown>) || {},
});

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected server error');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const param = await params;
  const id = param.id;
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('researcher')
      .select('*')
      .eq('auth_id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeResearcher(data), { status: 200 });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const param = await params;
  const id = param.id;
  const supabase = await createClient();

  try {
    const body = await request.json();

    const payload = {
      full_name: body.full_name,
      affiliation: body.affiliation ?? null,
      contact: body.contact ?? {},
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('researcher')
      .update(payload)
      .eq('researcher_id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeResearcher(data), { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const param = await params;
  const id = param.id;
  const supabase = createSupabaseServerClient();

  try {
    // Check if user is authenticated
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Security check: user can only delete their own account
    if (user.id !== id) {
      return NextResponse.json({ error: "You can only delete your own account" }, { status: 403 });
    }

    // First delete the user from auth.users (this will cascade to researcher table)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Researcher and user account deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
