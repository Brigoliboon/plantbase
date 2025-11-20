'use client';

import { useEffect, useState } from 'react';
import MainLayout from '@/app/(authenticated)/layout';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Leaf, MapPin, Users, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { redirect, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const samplesByRegion = [
  { name: 'North', value: 45 },
  { name: 'South', value: 32 },
  { name: 'East', value: 28 },
  { name: 'West', value: 19 },
];

const environmentalTrends = [
  { date: 'Jan', temperature: 15, humidity: 65, soilPh: 6.5 },
  { date: 'Feb', temperature: 16, humidity: 68, soilPh: 6.7 },
  { date: 'Mar', temperature: 18, humidity: 70, soilPh: 6.8 },
  { date: 'Apr', temperature: 20, humidity: 72, soilPh: 7.0 },
  { date: 'May', temperature: 22, humidity: 75, soilPh: 7.1 },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalSamples: number;
    totalLocations: number;
    totalResearchers: number;
    thisMonthSamples: number;
    recentSamples: {
      sample_id: string;
      scientific_name: string;
      common_name?: string | null;
      sample_date: string;
      sampling_location?: { name?: string | null; region?: string | null } | null;
      researcher?: { full_name: string } | null;
    }[];
  }>({
    totalSamples: 0,
    totalLocations: 0,
    totalResearchers: 0,
    thisMonthSamples: 0,
    recentSamples: [],
  });

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load stats');
        setStats(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load dashboard data';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);
  return (
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of your plant sampling activities
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Samples
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {isLoading ? '—' : stats.totalSamples}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Leaf className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-4 flex items-center gap-1">
              <TrendingUp size={14} />
              +12% from last month
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Locations
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {isLoading ? '—' : stats.totalLocations}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <MapPin className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-4 flex items-center gap-1">
              <TrendingUp size={14} />
              +3 new locations
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Researchers
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {isLoading ? '—' : stats.totalResearchers}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Users className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
            <p className="text-sm text-purple-600 dark:text-purple-400 mt-4 flex items-center gap-1">
              <TrendingUp size={14} />
              Active this month
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  This Month
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {isLoading ? '—' : stats.thisMonthSamples}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <TrendingUp className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
            </div>
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-4 flex items-center gap-1">
              Samples collected
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Samples by Region */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Samples by Region
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={samplesByRegion}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {samplesByRegion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Environmental Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Environmental Trends
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={environmentalTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="temperature" stroke="#10b981" name="Temperature (°C)" />
                <Line type="monotone" dataKey="humidity" stroke="#3b82f6" name="Humidity (%)" />
                <Line type="monotone" dataKey="soilPh" stroke="#f59e0b" name="Soil pH" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Samples */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Plant Samples
            </h2>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                {error}
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sample ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plant Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Researcher
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Loading recent samples...
                    </td>
                  </tr>
                ) : stats.recentSamples.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No samples recorded yet.
                    </td>
                  </tr>
                ) : (
                  stats.recentSamples.map((sample) => (
                    <tr key={sample.sample_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {sample.sample_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-medium">{sample.scientific_name}</div>
                        {sample.common_name && (
                          <div className="text-xs text-gray-500">{sample.common_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {sample.sampling_location?.name || sample.sampling_location?.region || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {sample.sample_date ? format(new Date(sample.sample_date), 'MMM dd, yyyy') : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {sample.researcher?.full_name || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}

