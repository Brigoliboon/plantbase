import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

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
  const supabase = createSupabaseServerClient();

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q');

    let query = supabase
      .from('researcher')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,affiliation.ilike.%${search}%,contact->>email.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data.map(normalizeResearcher), { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();

  try {
    const body = await request.json();

    if (!body.full_name) {
      return NextResponse.json({ error: 'full_name is required' }, { status: 400 });
    }

    const payload = {
      full_name: body.full_name,
      affiliation: body.affiliation || null,
      contact: body.contact || {},
      auth_id: body.auth_id || null,
    };

    const { data, error } = await supabase
      .from('researcher')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeResearcher(data), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

