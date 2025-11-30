import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';

type CoordinateValue = string | { type?: string; coordinates?: [number, number] } | null;
type RawLocation = {
  coordinates: CoordinateValue | undefined | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
};

// Changed parseCoordinates to return GeoJSON Point format instead of latitude/longitude object
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

const buildPoint = (latitude?: number, longitude?: number) => {
  if (
    typeof latitude !== 'number' ||
    Number.isNaN(latitude) ||
    typeof longitude !== 'number' ||
    Number.isNaN(longitude)
  ) {
    return null;
  }
  return `SRID=4326;POINT(${longitude} ${latitude})`;
};

const normalizeLocation = (record: RawLocation) => ({
  ...record,
  coordinates: parseCoordinates(record.coordinates ?? null),
  country: record.metadata?.country ?? null,
  metadata: record.metadata || null,
});

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected server error');

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> } // notice Promise
) {
  const params = await context.params; // unwrap the Promise
  const { id } = params;

  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('sampling_location')
      .select('*')
      .eq('location_id', id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(normalizeLocation(data), { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error), message: error, id: Number(id) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();

  try {
    const body = await request.json();

    const latitude = body.latitude ? parseFloat(body.latitude) : undefined;
    const longitude = body.longitude ? parseFloat(body.longitude) : undefined;

    const metadata = body.metadata || {};
    if (body.country) {
      metadata.country = body.country;
    }

    const payload = {
      name: body.name ?? null,
      region: body.region ?? null,
      description: body.description ?? null,
      metadata: Object.keys(metadata).length ? metadata : null,
      coordinates: buildPoint(latitude, longitude),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('sampling_location')
      .update(payload)
      .eq('location_id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeLocation(data), { status: 200 });
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
      .from('sampling_location')
      .delete()
      .eq('location_id', params.id);

    if (error) throw error;

    return NextResponse.json({ message: 'Location deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
