import { NextRequest, NextResponse } from 'next/server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

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

const normalizeLocation = (record: RawLocation) => ({
  ...record,
  coordinates: parseCoordinates(record.coordinates),
  country: record.metadata?.country ?? null,
  metadata: record.metadata || null,
});

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected server error');

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

export async function GET(request: NextRequest) {
 const supabase = await createClient()
  // Check if user is authenticated
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');

    let query = supabase
      .from('sampling_location')
      .select('*')
      .order('created_at', { ascending: false });

    if (region) {
      query = query.ilike('region', `%${region}%`);
    }

    const { data, error} = await query;

    if (error) throw error;

    return NextResponse.json(data);
    // return NextResponse.json(data.map(normalizeLocation), { status: 200 });
    // return NextResponse.json((await supabase.auth.getSession()).data.session?.user)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: getErrorMessage(error), mess:error }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();

    const latitude = body.latitude ? parseFloat(body.latitude) : undefined;
    const longitude = body.longitude ? parseFloat(body.longitude) : undefined;
    const coordinates = buildPoint(latitude, longitude);

    // Construct metadata if needed
    const metadata = body.metadata || {};
    if (body.country) metadata.country = body.country;

    // Updated payload: include municipality instead of description
    const payload = {
      name: body.name || null,
      region: body.region || null,
      province: body.province || null,
      municipality: body.municipality || null,
      longitude: body.longitude || null,
      latitude: body.latitude || null,
      metadata: Object.keys(metadata).length ? metadata : null,
    };

    const { data, error } = await supabase
      .from('sampling_location')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(normalizeLocation(data), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}


