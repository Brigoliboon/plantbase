import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type CoordinateValue = string | { coordinates?: [number, number] } | null;
type RawLocation = {
  coordinates?: CoordinateValue;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
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
  coordinates: parseCoordinates(record.coordinates),
  country: record.metadata?.country ?? null,
  metadata: record.metadata || null,
});

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected server error');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from('sampling_location')
      .select('*')
      .eq('location_id', params.id)
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeLocation(data), { status: 200 });
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

