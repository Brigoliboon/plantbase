import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { EnvironmentalCondition, PlantSample, Researcher, SamplingLocation } from '@/types';

const SAMPLE_SELECT = `
  sample_id,
  scientific_name,
  common_name,
  notes,
  sample_date,
  location_id,
  researcher_id,
  attributes,
  created_at,
  updated_at,
  sampling_location:sampling_location(*),
  researcher:researcher(*),
  environmental_condition:environmental_condition(*)
`;

type CoordinateValue = string | { coordinates?: [number, number] } | null;
type RawSamplingLocation = Omit<SamplingLocation, 'coordinates'> & { coordinates?: CoordinateValue };
type RawResearcher = Omit<Researcher, 'contact'> & { contact?: Record<string, unknown> | null };
type RawEnvironmentalCondition = EnvironmentalCondition;
type RawSample = Omit<PlantSample, 'sampling_location' | 'researcher' | 'environmental_condition'> & {
  sampling_location?: RawSamplingLocation | null;
  researcher?: RawResearcher | null;
  environmental_condition?: RawEnvironmentalCondition[] | RawEnvironmentalCondition | null;
};

const parseCoordinates = (coordinates: CoordinateValue) => {
  if (!coordinates) return null;

  if (typeof coordinates === 'string') {
    const match = coordinates.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match) {
      const [, lng, lat] = match;
      return {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      };
    }
  }

  if (typeof coordinates === 'object' && Array.isArray(coordinates.coordinates)) {
    const [lng, lat] = coordinates.coordinates;
    return {
      latitude: lat,
      longitude: lng,
    };
  }

  return null;
};

const normalizeSample = (record: RawSample): PlantSample => ({
  ...record,
  sampling_location: record.sampling_location
    ? {
        ...record.sampling_location,
        coordinates: parseCoordinates(record.sampling_location.coordinates),
      }
    : null,
  researcher: record.researcher ? { ...record.researcher, contact: record.researcher.contact || {} } : null,
  environmental_condition: Array.isArray(record.environmental_condition)
    ? record.environmental_condition[0]
    : record.environmental_condition,
});

const hasEnvironmentalPayload = (payload: Record<string, unknown>) =>
  Object.values(payload).some((value) => value !== undefined && value !== null && value !== '');

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected server error');

const fetchSamples = async (supabase: ReturnType<typeof createSupabaseServerClient>, request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  const researcherId = searchParams.get('researcher_id');
  const locationId = searchParams.get('location_id');

  let query = supabase.from('plant_sample').select(SAMPLE_SELECT).order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(Number(limit));
  }

  if (researcherId) {
    query = query.eq('researcher_id', researcherId);
  }

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data.map(normalizeSample);
};

const fetchSampleById = async (supabase: ReturnType<typeof createSupabaseServerClient>, id: string) => {
  const { data, error } = await supabase.from('plant_sample').select(SAMPLE_SELECT).eq('sample_id', id).single();

  if (error) throw error;

  return normalizeSample(data);
};

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();

  try {
    const samples = await fetchSamples(supabase, request);
    return NextResponse.json(samples, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();

  try {
    const body = await request.json();

    if (!body.scientific_name) {
      return NextResponse.json({ error: 'scientific_name is required' }, { status: 400 });
    }

    const samplePayload = {
      scientific_name: body.scientific_name,
      common_name: body.common_name || null,
      notes: body.notes || null,
      sample_date: body.sample_date || new Date().toISOString(),
      location_id: body.location_id || null,
      researcher_id: body.researcher_id || null,
      attributes: body.attributes || null,
    };

    const { data: sample, error: sampleError } = await supabase.from('plant_sample').insert([samplePayload]).select().single();

    if (sampleError) throw sampleError;

    const environmentalPayload = {
      temperature: body.environmental?.temperature ?? null,
      humidity: body.environmental?.humidity ?? null,
      soil_type: body.environmental?.soil_type ?? null,
      soil_ph: body.environmental?.soil_ph ?? null,
      altitude: body.environmental?.altitude ?? null,
      extra: body.environmental?.extra ?? null,
    };

    if (hasEnvironmentalPayload(environmentalPayload)) {
      const { error: envError } = await supabase.from('environmental_condition').insert([
        {
          ...environmentalPayload,
          sample_id: sample.sample_id,
        },
      ]);

      if (envError) throw envError;
    }

    const createdSample = await fetchSampleById(supabase, sample.sample_id);

    return NextResponse.json(createdSample, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

