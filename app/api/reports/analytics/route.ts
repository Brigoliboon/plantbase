import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected server error');

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // Extract filter parameters
  const timeRange = searchParams.get('timeRange') || 'all';
  const locationId = searchParams.get('locationId');
  const species = searchParams.get('species');

  try {
    // Calculate date range based on filter
    let startDate: Date;
    const now = new Date();

    switch (timeRange) {
      case 'last-week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'last-year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default: // 'all'
        startDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()); // Last 2 years for 'all'
    }

    // Build query for samples with filters
    let samplesQuery = supabase
      .from('plant_sample')
      .select(`
        sample_id,
        sample_date,
        scientific_name,
        common_name,
        location_id,
        sampling_location:sampling_location(name, region)
      `)
      .gte('sample_date', startDate.toISOString())
      .order('sample_date', { ascending: true });

    // Apply location filter
    if (locationId && locationId !== 'all') {
      samplesQuery = samplesQuery.eq('location_id', locationId);
    }

    // Apply species filter
    if (species && species !== 'all') {
      samplesQuery = samplesQuery.ilike('scientific_name', `%${species}%`);
    }

    const { data: samplesData, error: samplesError } = await samplesQuery;

    if (samplesError) throw samplesError;

    const samplesOverTime = samplesData.reduce((acc: any[], sample: any) => {
      const month = new Date(sample.sample_date).toLocaleString('default', { month: 'short' });
      const existing = acc.find(item => item.month === month);
      if (existing) {
        existing.samples += 1;
      } else {
        acc.push({ month, samples: 1 });
      }
      return acc;
    }, []);

    // Fetch environmental conditions for trends with filters
    let envQuery = supabase
      .from('environmental_condition')
      .select(`
        temperature,
        humidity,
        soil_ph,
        recorded_at,
        sample_id,
        plant_sample:sample_id(location_id)
      `)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    // Apply location filter to environmental data
    if (locationId && locationId !== 'all') {
      envQuery = envQuery.eq('plant_sample.location_id', locationId);
    }

    const { data: envData, error: envError } = await envQuery.limit(500); // Increased limit for filtered data

    if (envError) throw envError;

    // Group by week for soil pH trends
    const soilPhTrends = envData
      .filter((item: any) => item.soil_ph !== null)
      .reduce((acc: any[], item: any) => {
        const week = `Week ${Math.ceil((new Date(item.recorded_at).getTime() - new Date(envData[0].recorded_at).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1}`;
        const existing = acc.find((item: any) => item.date === week);
        if (existing) {
          existing.ph = (existing.ph + item.soil_ph) / 2; // Simple average
        } else {
          acc.push({ date: week, ph: item.soil_ph });
        }
        return acc;
      }, [])
      .slice(0, 5); // Last 5 weeks

    // Temperature & Humidity trends (by month)
    const tempHumidityTrends = envData
      .filter((item: any) => item.temperature !== null && item.humidity !== null)
      .reduce((acc: any[], item: any) => {
        const month = new Date(item.recorded_at).toLocaleString('default', { month: 'short' });
        const existing = acc.find((item: any) => item.date === month);
        if (existing) {
          existing.temperature = (existing.temperature + item.temperature) / 2;
          existing.humidity = (existing.humidity + item.humidity) / 2;
        } else {
          acc.push({ date: month, temperature: item.temperature, humidity: item.humidity });
        }
        return acc;
      }, [])
      .slice(0, 5); // Last 5 months

    // Summary statistics
    const validEnvData = envData.filter((item: any) => item.temperature !== null && item.humidity !== null && item.soil_ph !== null);
    const totalSamples = samplesData.length;
    const avgTemperature = validEnvData.length > 0 ? validEnvData.reduce((sum: number, item: any) => sum + item.temperature!, 0) / validEnvData.length : 0;
    const avgHumidity = validEnvData.length > 0 ? validEnvData.reduce((sum: number, item: any) => sum + item.humidity!, 0) / validEnvData.length : 0;
    const avgSoilPh = validEnvData.length > 0 ? validEnvData.reduce((sum: number, item: any) => sum + item.soil_ph!, 0) / validEnvData.length : 0;

    return NextResponse.json({
      samplesOverTime,
      soilPhTrends,
      temperatureHumidityTrends: tempHumidityTrends,
      summaryStats: {
        totalSamples,
        avgTemperature: Math.round(avgTemperature * 10) / 10,
        avgHumidity: Math.round(avgHumidity * 10) / 10,
        avgSoilPh: Math.round(avgSoilPh * 10) / 10,
      },
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
