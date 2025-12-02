import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected server error');

export async function GET() {
  const supabase = await createClient();

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

    // Fetch samples by region
    const { data: samplesByRegionData } = await supabase
      .from('plant_sample')
      .select('sampling_location(region)');

    const samplesByRegion = (samplesByRegionData as any[])?.reduce((acc: { [key: string]: number }, item: any) => {
      const region = item.sampling_location?.region || 'Unknown';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {}) || {};

    const samplesByRegionArray = Object.entries(samplesByRegion).map(([name, value]) => ({ name, value }));

    // Fetch environmental trends
    const { data: envData } = await supabase
      .from('environmental_condition')
      .select('temperature, humidity, soil_ph, recorded_at')
      .order('recorded_at', { ascending: true })
      .limit(100);

    const envGrouped = (envData as any[])?.reduce((acc: { [key: string]: { temperature: number, humidity: number, soilPh: number, count: number } }, item: any) => {
      const month = new Date(item.recorded_at).toLocaleString('default', { month: 'short' });
      if (!acc[month]) {
        acc[month] = { temperature: 0, humidity: 0, soilPh: 0, count: 0 };
      }
      acc[month].temperature += item.temperature || 0;
      acc[month].humidity += item.humidity || 0;
      acc[month].soilPh += item.soil_ph || 0;
      acc[month].count += 1;
      return acc;
    }, {});

    const environmentalTrends = Object.entries(envGrouped || {}).map(([date, values]) => ({
      date,
      temperature: values.temperature / values.count,
      humidity: values.humidity / values.count,
      soilPh: values.soilPh / values.count,
    })).slice(0, 5);

    return NextResponse.json(
      {
        totalSamples: totalSamples || 0,
        totalLocations: totalLocations || 0,
        totalResearchers: totalResearchers || 0,
        thisMonthSamples: thisMonthSamples || 0,
        recentSamples: recentSamples || [],
        samplesByRegion: samplesByRegionArray,
        environmentalTrends,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

