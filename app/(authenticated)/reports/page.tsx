'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { redirect } from 'next/navigation';
import { useReportsAnalytics } from './hooks/useReportsAnalytics';

export default function ReportsPage() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedSpecies, setSelectedSpecies] = useState('all');

  const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useReportsAnalytics({
    timeRange: selectedFilter,
    locationId: selectedLocation,
    species: selectedSpecies,
  });

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    alert('CSV export functionality will be implemented');
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert('PDF export functionality will be implemented');
  };

  const { user, loading: authLoading } = useAuth();
  if (!user && !authLoading) redirect('/login');

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  if (analyticsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Error loading analytics</h2>
          <p className="text-gray-600">{analyticsError}</p>
        </div>
      </div>
    );
  }

  const { samplesOverTime, soilPhTrends, temperatureHumidityTrends, summaryStats } = analyticsData || {};

  return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Visualize and analyze your plant sample data
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download size={20} className="mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download size={20} className="mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        {/* <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            </div>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Data</option>
              <option value="last-week">Last Week</option>
              <option value="last-month">Last Month</option>
              <option value="last-year">Last Year</option>
            </select>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Locations</option>
              <option value="north">North</option>
              <option value="south">South</option>
              <option value="east">East</option>
              <option value="west">West</option>
            </select>
            <select
              value={selectedSpecies}
              onChange={(e) => setSelectedSpecies(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Species</option>
              <option value="quercus">Quercus</option>
              <option value="pinus">Pinus</option>
              <option value="betula">Betula</option>
            </select>
          </div>
        </div> */}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Samples Over Time */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Samples Collected Over Time
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={samplesOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="samples" fill="#10b981" name="Samples" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Soil pH Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Soil pH Trends
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={soilPhTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[6, 8]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ph" stroke="#f59e0b" name="pH" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Temperature & Humidity Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Temperature & Humidity Trends
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temperatureHumidityTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#10b981"
                  name="Temperature (°C)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  stroke="#3b82f6"
                  name="Humidity (%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Samples</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{summaryStats?.totalSamples || 0}</p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">+12% from last period</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Temperature</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{summaryStats?.avgTemperature || 0}°C</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Across all samples</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Humidity</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{summaryStats?.avgHumidity || 0}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Across all samples</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Soil pH</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{summaryStats?.avgSoilPh || 0}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Across all samples</p>
          </div>
        </div>
      </div>
  
  );
}

