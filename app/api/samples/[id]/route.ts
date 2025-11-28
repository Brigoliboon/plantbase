import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { EnvironmentalCondition, PlantSample, Researcher, SamplingLocation } from '@/types';
import { createClient } from '@/lib/supabase/server';

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

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected server error');

const fetchSampleById = async (supabase: ReturnType<typeof createSupabaseServerClient>, id: string) => {
  const { data, error } = await supabase.from('plant_sample').select(SAMPLE_SELECT).eq('sample_id', id).single();

  if (error) throw error;

  return normalizeSample(data);
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  try {
    const sample = await fetchSampleById(supabase, params.id);
    return NextResponse.json(sample, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  try {
    const body = await request.json();

    const payload: Record<string, unknown> = {
      scientific_name: body.scientific_name,
      common_name: body.common_name ?? null,
      notes: body.notes ?? null,
      location_id: body.location_id ?? null,
      researcher_id: body.researcher_id ?? null,
      attributes: body.attributes ?? null,
      updated_at: new Date().toISOString(),
    };

    if (body.sample_date) {
      payload.sample_date = body.sample_date;
    }

    const { error: sampleError } = await supabase.from('plant_sample').update(payload).eq('sample_id', params.id);
    if (sampleError) throw sampleError;

    await supabase.from('environmental_condition').delete().eq('sample_id', params.id);

    const environmentalPayload = {
      temperature: body.environmental?.temperature ?? null,
      humidity: body.environmental?.humidity ?? null,
      soil_type: body.environmental?.soil_type ?? null,
      soil_ph: body.environmental?.soil_ph ?? null,
      altitude: body.environmental?.altitude ?? null,
      extra: body.environmental?.extra ?? null,
    };

    const hasEnv = Object.values(environmentalPayload).some(
      (value) => value !== null && value !== undefined && value !== ''
    );

    if (hasEnv) {
      const { error: envError } = await supabase.from('environmental_condition').insert([
        {
          ...environmentalPayload,
          sample_id: params.id,
        },
      ]);

      if (envError) throw envError;
    }

    const updatedSample = await fetchSampleById(supabase, params.id);
    return NextResponse.json(updatedSample, { status: 200 });
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
  const supabase = await createClient();

  try {
    const { error } = await supabase.from('plant_sample').delete().eq('sample_id', id);
    console.log(error)
    if (error) throw error;

    return NextResponse.json({ message: 'Sample deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

