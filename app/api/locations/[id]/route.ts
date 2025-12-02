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

// Helper function to fetch and parse reverse geocode data from Mapbox
const fetchLocationDataFromMapbox = async (latitude: number, longitude: number) => {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!accessToken) throw new Error("Mapbox access token is not set in environment variables.");

  const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&access_token=${accessToken}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.log(response)
    throw new Error(`Failed to fetch from Mapbox API: ${response.statusText}`);
  }

  const data = await response.json();
  // console.log(data)
  // Parse Mapbox response to extract relevant location info
  if (!data.features || !Array.isArray(data.features)) {
    throw new Error("Invalid response format from Mapbox API");
  }

  const locationInfo: { municipality?: string; province?: string; country?: string; postal_code?: string; metadata?: Record<string, any> } = {
    metadata: {},
  };

  // Mapping Mapbox feature types to sampling_location fields
  // municipality: locality or place or neighborhood
  // province: region
  // country: country
  // postal_code: postcode
  for (const feature of data.features) {
    if (!feature.properties || !feature.properties.context) continue;

    const ctx = feature.properties.context;
    if ('locality' in ctx && !locationInfo.municipality) {
      locationInfo.municipality = ctx.locality.name || ctx.locality;
    } else if ('place' in ctx && !locationInfo.municipality) {
      locationInfo.municipality = ctx.place.name || ctx.place;
    }

    if ('region' in ctx && !locationInfo.province) {
      locationInfo.province = ctx.region.name || ctx.region;
    }

    if ('country' in ctx && !locationInfo.country) {
      locationInfo.country = ctx.country.name || ctx.country;
    }

    if ('postcode' in ctx && !locationInfo.postal_code) {
      locationInfo.postal_code = ctx.postcode.name || ctx.postcode;
    }
  }

  // In case municipality not found in context, fallback to top feature name
  if (!locationInfo.municipality && data.features.length > 0) {
    const firstFeature = data.features[0];
    locationInfo.municipality = firstFeature.properties?.name || firstFeature.properties?.place_formatted || null;
  }

  // Populate remaining metadata with all features (stringifying to keep simple)
  locationInfo.metadata = {
    rawMapboxResponse: JSON.stringify(data),
  };

  console.log(locationInfo)
  return locationInfo;
};

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
  { params }: { params: Promise<{ id: string }> }
) {
  const param = await params;
  const id = param.id;
  const supabase = await createClient();

  try {
    const body = await request.json();

    const lng = body.lng ? parseFloat(body.lng) : undefined;
    const lat = body.lat ? parseFloat(body.lat) : undefined;

    // Validate latitude and longitude
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      return NextResponse.json({ error: "Invalid latitude. Must be a number between -90 and 90." }, { status: 400 });
    }
    if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Invalid longitude. Must be a number between -180 and 180." }, { status: 400 });
    }

    // Fetch location data from Mapbox
    const locationInfo = await fetchLocationDataFromMapbox(lat, lng);

    const payload = {
      name: body.name ?? null,
      description: body.description ?? null,
      coordinates: buildPoint(lat, lng),
      municipality: locationInfo.municipality,
      province: locationInfo.province,
      country: locationInfo.country,
      region: locationInfo.province, // Using province as region
      metadata: locationInfo.metadata,
      updated_at: new Date().toISOString(),
    };

    console.log(payload)
    const { data, error } = await supabase
      .from('sampling_location')
      .update(payload)
      .eq('location_id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(normalizeLocation(data), { status: 200 });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const param = await params;
  const supabase = createSupabaseServerClient();

  try {
    const { error } = await supabase
      .from('sampling_location')
      .delete()
      .eq('location_id', param.id);

    if (error) throw error;

    return NextResponse.json({ message: 'Location deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
