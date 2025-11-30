import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type CoordinateValue = string | { type?: string; coordinates?: [number, number] } | null;
type RawLocation = {
  coordinates?: CoordinateValue;
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

const normalizeLocation = (record: RawLocation) => ({
  ...record,
  coordinates: parseCoordinates(record.coordinates ?? null),
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

    // return NextResponse.json(data);
    return NextResponse.json(data.map(normalizeLocation), { status: 200 });
    // return NextResponse.json((await supabase.auth.getSession()).data.session?.user)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: getErrorMessage(error), mess:error }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Check if user is authenticated
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const lat = body.lat ? parseFloat(body.lat) : undefined;
    const lng = body.lng ? parseFloat(body.lng) : undefined;
    const desc = body.desc || null;

    // Validate latitude and longitude
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      return NextResponse.json({ error: "Invalid latitude. Must be a number between -90 and 90." }, { status: 400 });
    }
    if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Invalid longitude. Must be a number between -180 and 180." }, { status: 400 });
    }

    // Fetch location data from Mapbox
    const locationInfo = await fetchLocationDataFromMapbox(lat, lng);

    // Build the point for PostGIS
    const point = buildPoint(lat, lng);

    // Insert into sampling_location table
    const locationPayload = {
      name: desc,
      description: desc,
      coordinates: point,
      municipality: locationInfo.municipality,
      province: locationInfo.province,
      country: locationInfo.country,
      region: locationInfo.province, // Using province as region
      metadata: locationInfo.metadata,
    };

    const { data: location, error: insertError } = await supabase
      .from('sampling_location')
      .insert([locationPayload])
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ location_id: location.location_id }, { status: 201 });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}


