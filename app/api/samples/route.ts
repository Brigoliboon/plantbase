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
  sampling_location!location_id(*),
  researcher!researcher_id(*),
  environmental_condition!sample_id(*)
`;

type CoordinateValue = string | { coordinates?: [number, number] } | null;
type RawSamplingLocation = Omit<SamplingLocation, 'coordinates'> & { coordinates?: CoordinateValue };
type RawResearcher = Omit<Researcher, 'contact'> & { contact?: Record<string, unknown> | null };
type RawEnvironmentalCondition = EnvironmentalCondition;
type RawSample = Omit<PlantSample, 'sampling_location' | 'researcher' | 'environmental_condition'> & {
  sampling_location?: SamplingLocation[] | null;
  researcher?: RawResearcher[] | null;
  environmental_condition?: RawEnvironmentalCondition[] | null;
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

const normalizeSample = (record: RawSample): PlantSample => {
  const researcherData = Array.isArray(record.researcher) ? record.researcher[0] : record.researcher;
  const samplingLocationData = Array.isArray(record.sampling_location) ? record.sampling_location[0] : record.sampling_location;
  const environmentalConditionData = Array.isArray(record.environmental_condition) ? record.environmental_condition[0] : record.environmental_condition;

  return {
    ...record,
    sampling_location: samplingLocationData || null,
    researcher: researcherData ? { ...researcherData, contact: researcherData.contact || {} } : null,
    environmental_condition: environmentalConditionData || null,
  };
};

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
  const supabase = await createClient();

  try {
    const samples = await fetchSamples(supabase, request);
    return NextResponse.json(samples, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  try {
    const body = await request.json();

    const samplesToCreate = body.samples;
    const { location_id, coordinates, researcher_id, sample_date, temperature, humidity, soil_ph, altitude, soil_type } = body;

    const createdSamples = [];

    for (const sampleData of samplesToCreate) {
      if (!sampleData.scientific_name) {
        return NextResponse.json({ error: 'scientific_name is required for each sample' }, { status: 400 });
      }

      const samplePayload = {
        scientific_name: sampleData.scientific_name,
        common_name: sampleData.common_name || null,
        notes: sampleData.notes || null,
        sample_date: sample_date || new Date().toISOString(),
        location_id: location_id || null,
        researcher_id: researcher_id || null,
        attributes: sampleData.attributes || null,
      };
      console.log(samplePayload)
      // Performs an INSERT operation to plant_sample table
      const { data: sample, error: sampleError } = await supabase.from('plant_sample').insert([samplePayload]).select().single();

      if (sampleError) throw sampleError;

      const environmentalPayload = {
        temperature: temperature ? parseFloat(temperature) : null,
        humidity: humidity ? parseFloat(humidity) : null,
        soil_type: soil_type || null,
        soil_ph: soil_ph ? parseFloat(soil_ph) : null,
        altitude: altitude ? parseFloat(altitude) : null,
        extra: null,
      };

      // Performs an INSERT operation to environmental_conditions table
      if (hasEnvironmentalPayload(environmentalPayload)) {
        const { error: envError } = await supabase.from('environmental_condition').insert([
          {
            ...environmentalPayload,
            sample_id: sample.sample_id,
          },
        ]);
 
        if (envError) throw envError;
      }

      // Updates the frontend table display
      const createdSample = await fetchSampleById(supabase, sample.sample_id);
      createdSamples.push(createdSample);
    }
    return NextResponse.json(createdSamples, { status: 201 });
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

