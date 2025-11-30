'use client';

import { useMemo, useState } from 'react';
import MainLayout from '@/app/(authenticated)/layout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Notification from '@/components/ui/Notification';
import { Plus, Search, Edit, Trash2, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { PlantSample } from '@/types';
import LocationPicker from '@/components/map/LocationPicker';
import { useSamples } from './hooks/useSamples';


export default function SamplesPage() {
  const {
    samples,
    researchers,
    isLoading,
    isSubmitting,
    notification,
    showNotification,
    closeNotification,
    createSample,
    updateSample,
    deleteSample,
  } = useSamples();

  const [location, setLocation] = useState<{ lng: number; lat: number , desc:string} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<PlantSample | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    samples: [{
      scientific_name: '',
      common_name: '',
      notes: '',
    }],
    location_id: '',
    coordinates:location,
    researcher_id: '',
    sample_date: '',
    temperature: '',
    humidity: '',
    soil_ph: '',
    altitude: '',
    soil_type: '',
  });

  const numberOrNull = (value: string) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleOpenModal = (sample?: PlantSample) => {
    if (sample) {
      setEditingSample(sample);
      setFormData({
        samples: [{
          scientific_name: sample.scientific_name,
          common_name: sample.common_name || '',
          notes: sample.notes || '',
        }],
        location_id: sample.location_id || '',
        researcher_id: sample.researcher_id || '',
        sample_date: sample.sample_date ? sample.sample_date.slice(0, 10) : '',
        temperature: sample.environmental_condition?.temperature?.toString() || '',
        humidity: sample.environmental_condition?.humidity?.toString() || '',
        soil_ph: sample.environmental_condition?.soil_ph?.toString() || '',
        altitude: sample.environmental_condition?.altitude?.toString() || '',
        soil_type: sample.environmental_condition?.soil_type || '',
      });
      // Set location from sample's coordinates
      if (sample.sampling_location?.coordinates) {
        setLocation({
          lng: sample.sampling_location.coordinates.coordinates[0],
          lat: sample.sampling_location.coordinates.coordinates[1],
          desc: sample.sampling_location.description || '',
        });
      } else {
        setLocation(null);
      }
    } else {
      setEditingSample(null);
      setFormData({
        samples: [{
          scientific_name: '',
          common_name: '',
          notes: '',
        }],
        location_id: '',
        researcher_id: '',
        sample_date: '',
        temperature: '',
        humidity: '',
        soil_ph: '',
        altitude: '',
        soil_type: '',
      });
      setLocation(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSample(null);
  };

  const addSample = () => {
    setFormData((prev) => ({
      ...prev,
      samples: [...prev.samples, { scientific_name: '', common_name: '', notes: '' }],
    }));
  };

  const removeSample = (index: number) => {
    if (formData.samples.length > 1) {
      setFormData((prev) => ({
        ...prev,
        samples: prev.samples.filter((_, i) => i !== index),
      }));
    }
  };

  const updateFormSample = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      samples: prev.samples.map((sample, i) =>
        i === index ? { ...sample, [field]: value } : sample
      ),
    }));
  };

  const updateLocationDesc = (value: string) => {
    setLocation(prev => prev ? { ...prev, desc: value } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalidSamples = formData.samples.filter((sample) => !sample.scientific_name);
    if (invalidSamples.length > 0) {
      showNotification('error', 'Scientific name is required for all samples.');
      return;
    }

    let updatedFormData = { ...formData };

    // Create location if location is provided and location_id is empty
    if (location && !formData.location_id) {
      // Validate coordinates
      if (location.lat < -90 || location.lat > 90) {
        showNotification('error', 'Invalid latitude. Must be between -90 and 90 degrees.');
        return;
      }
      if (location.lng < -180 || location.lng > 180) {
        showNotification('error', 'Invalid longitude. Must be between -180 and 180 degrees.');
        return;
      }
   
      try {
        const locationResponse = await fetch('/api/locations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lat: location.lat,
            lng: location.lng,
            desc: location.desc || null,
          }),
        });

        if (!locationResponse.ok) {
          const errorData = await locationResponse.json();
          throw new Error(errorData.error || 'Failed to create location');
        }

        console.log(locationResponse)
        const newLocation = await locationResponse.json();
        updatedFormData.location_id = newLocation.location_id;
      } catch (error) {
        console.error('Error creating location:', error);
        showNotification('error', error instanceof Error ? error.message : 'Failed to create location. Please try again.');
        return;
      }
    }

    console.log(updatedFormData);
    const success = editingSample
      ? await updateSample(editingSample.sample_id, updatedFormData, location)
      : await createSample(updatedFormData, location);

    if (success) {
      handleCloseModal();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sample?')) return;
    await deleteSample(id);
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
        console.log(locationName)
      return (
        scientific.includes(query) ||
        common.includes(query) ||
        locationName.toLowerCase().includes(query)
      );
    });
  }, [samples, searchTerm]);


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
  console.log(filteredSamples)
  return (
    <>
      <Notification
        type={notification.type}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={closeNotification}
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
          <Button className='flex' onClick={() => handleOpenModal()}>
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
                      {sample.sampling_location?.coordinates?.coordinates
                        ? sample.sampling_location?.municipality || sample.sampling_location?.region : '—'}
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
          title={editingSample ? 'Edit Sample' : 'Add New Samples'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Plant Info Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Plant Information</h3>
                {!editingSample && (
                  <Button type="button" variant="outline" onClick={addSample}>
                    <Plus size={16} className="mr-2" />
                    Add Sample
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <div className="flex space-x-4 pb-4">
                  {formData.samples.map((sample, index) => (
                    <div key={index} className="flex-shrink-0 w-80 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white">Sample {index + 1}</h4>
                        {!editingSample && formData.samples.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeSample(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-4">
                        <Input
                          label="Scientific Name *"
                          value={sample.scientific_name}
                          onChange={(e) => updateFormSample(index, 'scientific_name', e.target.value)}
                          required
                        />
                        <Input
                          label="Common Name"
                          value={sample.common_name}
                          onChange={(e) => updateFormSample(index, 'common_name', e.target.value)}
                        />
                <Textarea
                  label="Description"
                  value={sample.notes}
                  onChange={(e) => updateFormSample(index, 'notes', e.target.value)}
                  rows={3}
                />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Location</h3>
              <LocationPicker
                onValueChanged={setLocation}
              />
              <div className='flex flex-col mt-2 flex gap-2'>
                 <Input
                  label="Longitude"
                  type="number"
                  step="0.1"
                  disabled={true}
                  value={location?.lng || ''}
                />
                 <Input
                  label="Latitude"
                  type="number"
                  step="0.1"
                  disabled={true}
                  value={location?.lat}
                />
                <Textarea
                  label="Notes"
                  value={location?.desc || ''}
                  onChange={(e) => updateLocationDesc(e.target.value)}
                  rows={3}
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
                  step={0.1}
                  min={0}
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
                {editingSample ? 'Update Sample' : 'Add Samples'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}

