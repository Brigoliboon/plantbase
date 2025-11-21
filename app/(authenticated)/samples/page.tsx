'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import MainLayout from '@/app/(authenticated)/layout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Notification, { NotificationType } from '@/components/ui/Notification';
import { Plus, Search, Edit, Trash2, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { PlantSample, Researcher, SamplingLocation } from '@/types';
import LocationPicker from '@/components/map/LocationPicker';


export default function SamplesPage() {
  const [samples, setSamples] = useState<PlantSample[]>([]);
  const [locations, setLocations] = useState<SamplingLocation[]>([]);
  const [location, setLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<PlantSample | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: NotificationType; message: string; isVisible: boolean }>({
    type: 'success',
    message: '',
    isVisible: false,
  });

  const [formData, setFormData] = useState({
    scientific_name: '',
    common_name: '',
    notes: '',
    location_id: '',
    researcher_id: '',
    sample_date: '',
    temperature: '',
    humidity: '',
    soil_ph: '',
    altitude: '',
    soil_type: '',
  });

  const showNotification = useCallback((type: NotificationType, message: string) => {
    setNotification({ type, message, isVisible: true });
  }, []);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [samplesRes, locationsRes, researchersRes] = await Promise.all([
        fetch('/api/samples'),
        fetch('/api/locations'),
        fetch('/api/researchers'),
      ]);

      const [samplesData, locationsData, researchersData] = await Promise.all([
        samplesRes.json(),
        locationsRes.json(),
        researchersRes.json(),
      ]);

      if (!samplesRes.ok) throw new Error(samplesData.error || 'Failed to load samples');
      if (!locationsRes.ok) throw new Error(locationsData.error || 'Failed to load locations');
      if (!researchersRes.ok) throw new Error(researchersData.error || 'Failed to load researchers');

      setSamples(samplesData);
      setLocations(locationsData);
      setResearchers(researchersData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load data';
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const numberOrNull = (value: string) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleOpenModal = (sample?: PlantSample) => {
    if (sample) {
      setEditingSample(sample);
      setFormData({
        scientific_name: sample.scientific_name,
        common_name: sample.common_name || '',
        notes: sample.notes || '',
        location_id: sample.location_id || '',
        researcher_id: sample.researcher_id || '',
        sample_date: sample.sample_date ? sample.sample_date.slice(0, 10) : '',
        temperature: sample.environmental_condition?.temperature?.toString() || '',
        humidity: sample.environmental_condition?.humidity?.toString() || '',
        soil_ph: sample.environmental_condition?.soil_ph?.toString() || '',
        altitude: sample.environmental_condition?.altitude?.toString() || '',
        soil_type: sample.environmental_condition?.soil_type || '',
      });
    } else {
      setEditingSample(null);
      setFormData({
        scientific_name: '',
        common_name: '',
        notes: '',
        location_id: '',
        researcher_id: '',
        sample_date: '',
        temperature: '',
        humidity: '',
        soil_ph: '',
        altitude: '',
        soil_type: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSample(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.scientific_name) {
      showNotification('error', 'Scientific name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        scientific_name: formData.scientific_name,
        common_name: formData.common_name || null,
        notes: formData.notes || null,
        location_id: formData.location_id || null,
        researcher_id: formData.researcher_id || null,
        sample_date: formData.sample_date || null,
        environmental: {
          temperature: numberOrNull(formData.temperature),
          humidity: numberOrNull(formData.humidity),
          soil_ph: numberOrNull(formData.soil_ph),
          altitude: numberOrNull(formData.altitude),
          soil_type: formData.soil_type || null,
        },
      };

      const endpoint = editingSample ? `/api/samples/${editingSample.sample_id}` : '/api/samples';
      const method = editingSample ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save sample');

      if (editingSample) {
        setSamples((prev) => prev.map((sample) => (sample.sample_id === data.sample_id ? data : sample)));
        showNotification('success', 'Sample updated successfully.');
      } else {
        setSamples((prev) => [data, ...prev]);
        showNotification('success', 'Sample added successfully.');
      }

      handleCloseModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save sample';
      showNotification('error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sample?')) return;

    try {
      const response = await fetch(`/api/samples/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete sample');

      setSamples((prev) => prev.filter((sample) => sample.sample_id !== id));
      showNotification('success', 'Sample deleted successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete sample';
      showNotification('error', message);
    }
  };

  const filteredSamples = useMemo(() => {
    if (!searchTerm) return samples;
    const query = searchTerm.toLowerCase();
    return samples.filter((sample) => {
      const scientific = sample.scientific_name?.toLowerCase() || '';
      const common = sample.common_name?.toLowerCase() || '';
      const locationName =
        sample.sampling_location?.name ||
        sample.sampling_location?.description ||
        sample.sampling_location?.region ||
        '';
      return (
        scientific.includes(query) ||
        common.includes(query) ||
        locationName.toLowerCase().includes(query)
      );
    });
  }, [samples, searchTerm]);

  const locationOptions = useMemo(
    () => [
      { value: '', label: 'Select a location' },
      ...locations.map((location) => ({
        value: location.location_id,
        label: location.name || location.description || 'Untitled Location',
      })),
    ],
    [locations]
  );

  const researcherOptions = useMemo(
    () => [
      { value: '', label: 'Select a researcher' },
      ...researchers.map((researcher) => ({
        value: researcher.researcher_id,
        label: researcher.full_name,
      })),
    ],
    [researchers]
  );

  return (
    <>
      <Notification
        type={notification.type}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={() => setNotification({ ...notification, isVisible: false })}
      />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Plant Samples</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and view all plant samples
            </p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus size={20} className="mr-2" />
            Add Sample
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Search by plant name, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter size={20} className="mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Samples Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Loading samples...
                    </td>
                  </tr>
                ) : filteredSamples.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No samples found.
                    </td>
                  </tr>
                ) : (
                  filteredSamples.map((sample) => (
                    <tr key={sample.sample_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {sample.sample_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <div>
                        <div className="font-medium">{sample.scientific_name}</div>
                        {sample.common_name && (
                          <div className="text-xs text-gray-500">{sample.common_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {sample.sampling_location?.name || sample.sampling_location?.description || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {sample.sample_date ? format(new Date(sample.sample_date), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {sample.researcher?.full_name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(sample)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(sample.sample_id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingSample ? 'Edit Sample' : 'Add New Sample'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Plant Info Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plant Information</h3>
              <div className="space-y-4">
                <Input
                  label="Scientific Name *"
                  value={formData.scientific_name}
                  onChange={(e) => setFormData({ ...formData, scientific_name: e.target.value })}
                  required
                />
                <Input
                  label="Common Name"
                  value={formData.common_name}
                  onChange={(e) => setFormData({ ...formData, common_name: e.target.value })}
                />
                <Textarea
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {/* Location Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Location</h3>
              <LocationPicker onValueChanged={setLocation}/>
              <div className='mt-2 flex gap-2'>
                 <Input
                  label="Longitude"
                  type="number"
                  step="0.1"
                  disabled={true}
                  value={location?.lng}
                  // onChange={(e) => setFormData({ ...formData, : e.target.value })}
                />
                 <Input
                  label="Latitude"
                  type="number"
                  step="0.1"
                  disabled={true}
                  value={location?.lat}
                  // onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                />
              </div>
            </div>

            {/* Researcher Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Researcher</h3>
              <Select
                label="Researcher"
                value={formData.researcher_id}
                onChange={(e) => setFormData({ ...formData, researcher_id: e.target.value })}
                options={researcherOptions}
              />
            </div>

            {/* Sample Date */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Collection Details</h3>
              <Input
                label="Sample Date"
                type="date"
                value={formData.sample_date}
                onChange={(e) => setFormData({ ...formData, sample_date: e.target.value })}
              />
            </div>

            {/* Environmental Conditions Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Environmental Conditions</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Temperature (°C)"
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                />
                <Input
                  label="Humidity (%)"
                  type="number"
                  step="0.1"
                  value={formData.humidity}
                  onChange={(e) => setFormData({ ...formData, humidity: e.target.value })}
                />
                <Input
                  label="Soil pH"
                  type="number"
                  step="0.1"
                  min="0"
                  max="14"
                  value={formData.soil_ph}
                  onChange={(e) => setFormData({ ...formData, soil_ph: e.target.value })}
                />
                <Input
                  label="Altitude (m)"
                  type="number"
                  value={formData.altitude}
                  onChange={(e) => setFormData({ ...formData, altitude: e.target.value })}
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Soil Type"
                  value={formData.soil_type}
                  onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {editingSample ? 'Update Sample' : 'Add Sample'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}

