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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from('researcher')
      .select('*')
      .eq('researcher_id', params.id)
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeResearcher(data), { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();

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
      .eq('researcher_id', params.id)
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
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();

  try {
    const { error } = await supabase
      .from('researcher')
      .delete()
      .eq('researcher_id', params.id);

    if (error) throw error;

    return NextResponse.json({ message: 'Researcher deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

