import { useState, useEffect } from 'react';

interface SamplesOverTime {
  month: string;
  samples: number;
}

interface SoilPhTrend {
  date: string;
  ph: number;
}

interface TempHumidityTrend {
  date: string;
  temperature: number;
  humidity: number;
}

interface SummaryStats {
  totalSamples: number;
  avgTemperature: number;
  avgHumidity: number;
  avgSoilPh: number;
}

interface ReportsAnalytics {
  samplesOverTime: SamplesOverTime[];
  soilPhTrends: SoilPhTrend[];
  temperatureHumidityTrends: TempHumidityTrend[];
  summaryStats: SummaryStats;
}

interface FilterOptions {
  timeRange?: string;
  locationId?: string;
  species?: string;
}

export function useReportsAnalytics(filters: FilterOptions = {}) {
  const [data, setData] = useState<ReportsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query string from filters
        const params = new URLSearchParams();
        if (filters.timeRange) params.append('timeRange', filters.timeRange);
        if (filters.locationId) params.append('locationId', filters.locationId);
        if (filters.species) params.append('species', filters.species);

        const queryString = params.toString();
        const url = `/api/reports/analytics${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [filters.timeRange, filters.locationId, filters.species]);

  return { data, loading, error };
}
