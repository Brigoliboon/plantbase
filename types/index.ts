// Database types matching Supabase schema

export interface Researcher {
  researcher_id: string;
  auth_id?: string | null;
  full_name: string;
  affiliation?: string | null;
  contact: {
    email?: string;
    phone?: string;
    affiliation?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SamplingLocation {
  location_id: string;
  name?: string | null;
  description?: string | null;
  region?: string | null;
  metadata?: Record<string, unknown> | null;
  country?: string | null;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentalCondition {
  environment_id: string;
  sample_id: string;
  temperature?: number | null;
  humidity?: number | null;
  soil_type?: string | null;
  soil_ph?: number | null;
  altitude?: number | null;
  extra?: Record<string, unknown> | null;
  recorded_at: string;
}

export interface PlantSample {
  sample_id: string;
  scientific_name: string;
  common_name?: string | null;
  notes?: string | null;
  sample_date: string;
  location_id?: string | null;
  researcher_id?: string | null;
  attributes?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  sampling_location?: SamplingLocation | null;
  researcher?: Researcher | null;
  environmental_condition?: EnvironmentalCondition | null;
}

// UI Types
export interface FilterOptions {
  species?: string;
  location?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  region?: string;
  researcher?: string;
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
}

