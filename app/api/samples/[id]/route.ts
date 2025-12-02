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

type CoordinateValue = string | { type?: string; coordinates?: [number, number] } | null;
type RawSamplingLocation = Omit<SamplingLocation, 'coordinates'> & { coordinates?: CoordinateValue };
type RawResearcher = Omit<Researcher, 'contact'> & { contact?: Record<string, unknown> | null };
type RawEnvironmentalCondition = EnvironmentalCondition;
type RawSample = Omit<PlantSample, 'sampling_location' | 'researcher' | 'environmental_condition'> & {
  sampling_location?: SamplingLocation[] | SamplingLocation | null;
  researcher?: RawResearcher[] | RawResearcher | null;
  environmental_condition?: RawEnvironmentalCondition[] | RawEnvironmentalCondition | null;
};

const parseCoordinates = (coordinates: CoordinateValue) => {
  if (!coordinates) return null;

  if (typeof coordinates === 'string') {
    const match = coordinates.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match) {
      const [, lng, lat] = match;
      return {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      };
    }
  }

  if (
    typeof coordinates === 'object' &&
    coordinates.type === 'Point' &&
    Array.isArray(coordinates.coordinates) &&
    coordinates.coordinates.length === 2
  ) {
    const [lng, lat] = coordinates.coordinates;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return {
        type: "Point",
        coordinates: [lng, lat],
      };
    }
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

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected server error');

const fetchSampleById = async (supabase: ReturnType<typeof createSupabaseServerClient>, id: string) => {
  const { data, error } = await supabase.from('plant_sample').select(SAMPLE_SELECT).eq('sample_id', id).single();

  if (error) throw error;

  return normalizeSample(data);
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const param = await params;
  const id = param.id;
  const supabase = await createClient();

  try {
    const sample = await fetchSampleById(supabase, id);
    return NextResponse.json(sample, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const body = await request.json();

    // Build main sample payload
    const payload = {
      scientific_name: body.scientific_name,
      common_name: body.common_name ?? null,
      notes: body.notes ?? null,
      location_id: body.location_id ?? null,
      researcher_id: body.researcher_id ?? null,
      attributes: body.attributes ?? null,
      updated_at: new Date().toISOString(),
      ...(body.sample_date && { sample_date: body.sample_date }),
    };

    // Update main sample
    const { error: sampleError } = await supabase
      .from("plant_sample")
      .update(payload)
      .eq("sample_id", id);

    if (sampleError) throw sampleError;

    // Delete environmental conditions (clean slate)
    await supabase
      .from("environmental_condition")
      .delete()
      .eq("sample_id", id);

    // Build environmental payload
    const environmentalPayload = {
      temperature: body.environmental?.temperature ?? null,
      humidity: body.environmental?.humidity ?? null,
      soil_type: body.environmental?.soil_type ?? null,
      soil_ph: body.environmental?.soil_ph ?? null,
      altitude: body.environmental?.altitude ?? null,
      extra: body.environmental?.extra ?? null,
    };

    const hasEnv = Object.values(environmentalPayload).some(
      (v) => v !== null && v !== undefined && v !== ""
    );

    // Insert new environmental row (only if needed)
    if (hasEnv) {
      const { error: envError } = await supabase
        .from("environmental_condition")
        .insert([{ ...environmentalPayload, sample_id: id }]);

      if (envError) throw envError;
    }

    // Return updated record
    const updatedSample = await fetchSampleById(supabase, id);

    return NextResponse.json(updatedSample, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
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

