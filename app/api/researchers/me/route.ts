import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Get the current authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the researcher details for the current user
    const { data, error } = await supabase
      .from('researcher')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeResearcher(data), { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
