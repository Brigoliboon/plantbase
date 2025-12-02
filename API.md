# PlantBase API Documentation

This document provides detailed information about the REST API endpoints for the PlantBase application, built with Next.js and Supabase.

## Base URL
All API endpoints are prefixed with `/api`.

## Authentication
Most endpoints require authentication via Supabase Auth. Include the appropriate authorization headers in your requests.

## Endpoints

### Plant Samples

#### GET /api/samples
Retrieve a list of plant samples with optional filtering.

**Query Parameters:**
- `limit` (optional): Number of samples to return (default: all)
- `researcher_id` (optional): Filter by researcher ID
- `location_id` (optional): Filter by location ID

**Response:**
```json
[
  {
    "sample_id": "uuid",
    "scientific_name": "string",
    "common_name": "string",
    "notes": "string",
    "sample_date": "ISO 8601 date",
    "location_id": "uuid",
    "researcher_id": "uuid",
    "attributes": "object",
    "created_at": "ISO 8601 date",
    "updated_at": "ISO 8601 date",
    "sampling_location": {
      "location_id": "uuid",
      "name": "string",
      "coordinates": {
        "type": "Point",
        "coordinates": [longitude, latitude]
      }
    },
    "researcher": {
      "researcher_id": "uuid",
      "full_name": "string",
      "contact": {}
    },
    "environmental_condition": {
      "temperature": "number",
      "humidity": "number",
      "soil_type": "string",
      "soil_ph": "number",
      "altitude": "number"
    }
  }
]
```

#### POST /api/samples
Create new plant samples with environmental data.

**Request Body:**
```json
{
  "samples": [
    {
      "scientific_name": "string (required)",
      "common_name": "string (optional)",
      "notes": "string (optional)",
      "attributes": "object (optional)"
    }
  ],
  "location_id": "uuid (optional)",
  "researcher_id": "uuid (optional)",
  "sample_date": "ISO 8601 date (optional, defaults to now)",
  "temperature": "number (optional)",
  "humidity": "number (optional)",
  "soil_ph": "number (optional)",
  "altitude": "number (optional)",
  "soil_type": "string (optional)"
}
```

**Response:** Array of created sample objects (same as GET response)

#### GET /api/samples/[id]
Retrieve a specific plant sample by ID.

**Response:** Single sample object (same as GET /api/samples)

#### PUT /api/samples/[id]
Update a specific plant sample.

**Request Body:**
```json
{
  "scientific_name": "string",
  "common_name": "string",
  "notes": "string",
  "location_id": "uuid",
  "researcher_id": "uuid",
  "attributes": "object",
  "sample_date": "ISO 8601 date",
  "environmental": {
    "temperature": "number",
    "humidity": "number",
    "soil_type": "string",
    "soil_ph": "number",
    "altitude": "number"
  }
}
```

**Response:** Updated sample object

#### DELETE /api/samples/[id]
Delete a specific plant sample.

**Response:**
```json
{
  "message": "Sample deleted successfully"
}
```

### Researchers

#### GET /api/researchers
Retrieve a list of researchers with optional search.

**Query Parameters:**
- `q` (optional): Search term for full_name, affiliation, or email

**Response:**
```json
[
  {
    "researcher_id": "uuid",
    "auth_id": "uuid",
    "full_name": "string",
    "affiliation": "string",
    "contact": {},
    "created_at": "ISO 8601 date",
    "updated_at": "ISO 8601 date"
  }
]
```

#### POST /api/researchers
Create a new researcher.

**Request Body:**
```json
{
  "full_name": "string (required)",
  "affiliation": "string (optional)",
  "contact": "object (optional)",
  "auth_id": "uuid (optional)"
}
```

**Response:** Created researcher object

#### GET /api/researchers/me
Retrieve the current authenticated researcher's profile.

**Response:** Single researcher object (same as GET /api/researchers)

#### GET /api/researchers/[id]
Retrieve a specific researcher by ID.

**Response:** Single researcher object

#### PUT /api/researchers/[id]
Update a specific researcher.

**Request Body:**
```json
{
  "full_name": "string",
  "affiliation": "string",
  "contact": "object"
}
```

**Response:** Updated researcher object

#### DELETE /api/researchers/[id]
Delete a specific researcher (only the researcher themselves can delete their account).

**Response:**
```json
{
  "message": "Researcher and user account deleted successfully"
}
```

### Sampling Locations

#### GET /api/locations
Retrieve a list of sampling locations with optional filtering.

**Query Parameters:**
- `region` (optional): Filter by region name

**Response:**
```json
[
  {
    "location_id": "uuid",
    "name": "string",
    "description": "string",
    "coordinates": {
      "type": "Point",
      "coordinates": [longitude, latitude]
    },
    "municipality": "string",
    "province": "string",
    "country": "string",
    "region": "string",
    "metadata": "object",
    "created_at": "ISO 8601 date",
    "updated_at": "ISO 8601 date"
  }
]
```

#### POST /api/locations
Create a new sampling location using coordinates (fetches location data from Mapbox).

**Request Body:**
```json
{
  "lat": "number (required, -90 to 90)",
  "lng": "number (required, -180 to 180)",
  "desc": "string (optional)"
}
```

**Response:**
```json
{
  "location_id": "uuid"
}
```

#### GET /api/locations/[id]
Retrieve a specific sampling location by ID.

**Response:** Single location object (same as GET /api/locations)

#### PUT /api/locations/[id]
Update a specific sampling location.

**Request Body:**
```json
{
  "lat": "number (required, -90 to 90)",
  "lng": "number (required, -180 to 180)",
  "name": "string (optional)",
  "description": "string (optional)"
}
```

**Response:** Updated location object

#### DELETE /api/locations/[id]
Delete a specific sampling location.

**Response:**
```json
{
  "message": "Location deleted successfully"
}
```

### Dashboard

#### GET /api/dashboard/stats
Retrieve dashboard statistics and recent data.

**Response:**
```json
{
  "totalSamples": "number",
  "totalLocations": "number",
  "totalResearchers": "number",
  "thisMonthSamples": "number",
  "recentSamples": [
    {
      "sample_id": "uuid",
      "scientific_name": "string",
      "common_name": "string",
      "sample_date": "ISO 8601 date",
      "sampling_location": {
        "name": "string",
        "region": "string"
      },
      "researcher": {
        "full_name": "string"
      }
    }
  ],
  "samplesByRegion": [
    {
      "name": "string",
      "value": "number"
    }
  ],
  "environmentalTrends": [
    {
      "date": "string",
      "temperature": "number",
      "humidity": "number",
      "soilPh": "number"
    }
  ]
}
```

### Reports

#### GET /api/reports/analytics
Retrieve analytics data for reports with optional filtering.

**Query Parameters:**
- `timeRange` (optional): 'last-week', 'last-month', 'last-year', or 'all' (default: 'all')
- `locationId` (optional): Filter by location ID
- `species` (optional): Filter by scientific name

**Response:**
```json
{
  "samplesOverTime": [
    {
      "month": "string",
      "samples": "number"
    }
  ],
  "soilPhTrends": [
    {
      "date": "string",
      "ph": "number"
    }
  ],
  "temperatureHumidityTrends": [
    {
      "date": "string",
      "temperature": "number",
      "humidity": "number"
    }
  ],
  "summaryStats": {
    "totalSamples": "number",
    "avgTemperature": "number",
    "avgHumidity": "number",
    "avgSoilPh": "number"
  }
}
```

## Error Responses
All endpoints return errors in the following format:
```json
{
  "error": "Error message string"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Data Types
- UUID: Universally Unique Identifier (string)
- ISO 8601 date: Date string in ISO 8601 format (e.g., "2023-12-01T12:00:00.000Z")
- Point coordinates: GeoJSON Point format with [longitude, latitude] array
