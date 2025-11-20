import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected server error');

export async function GET() {
  const supabase = createSupabaseServerClient();

  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [{ count: totalSamples }, { count: totalLocations }, { count: totalResearchers }, { count: thisMonthSamples }] =
      await Promise.all([
        supabase.from('plant_sample').select('*', { count: 'exact', head: true }),
        supabase.from('sampling_location').select('*', { count: 'exact', head: true }),
        supabase.from('researcher').select('*', { count: 'exact', head: true }),
        supabase
          .from('plant_sample')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString()),
      ]);

    const { data: recentSamples } = await supabase
      .from('plant_sample')
      .select(
        `
        sample_id,
        scientific_name,
        common_name,
        sample_date,
        sampling_location:sampling_location(name, region),
        researcher:researcher(full_name)
      `
      )
      .order('sample_date', { ascending: false })
      .limit(5);

    return NextResponse.json(
      {
        totalSamples: totalSamples || 0,
        totalLocations: totalLocations || 0,
        totalResearchers: totalResearchers || 0,
        thisMonthSamples: thisMonthSamples || 0,
        recentSamples: recentSamples || [],
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

