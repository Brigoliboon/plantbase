'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import MainLayout from '@/app/(authenticated)/layout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Notification, { NotificationType } from '@/components/ui/Notification';
import { Plus, Search, Edit, Trash2, MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import { SamplingLocation } from '@/types';

// Dynamically import Mapbox to avoid SSR issues
const Map = dynamic(() => import('@/components/map/LocationMap'), { ssr: false });

export default function LocationsPage() {
  const [locations, setLocations] = useState<SamplingLocation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SamplingLocation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: NotificationType; message: string; isVisible: boolean }>({
    type: 'success',
    message: '',
    isVisible: false,
  });

  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    description: '',
    region: '',
    country: '',
  });

  const showNotification = useCallback((type: NotificationType, message: string) => {
    setNotification({ type, message, isVisible: true });
  }, []);

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/locations');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load locations');
      setLocations(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch locations';
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleOpenModal = (location?: SamplingLocation) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name || '',
        latitude: location.coordinates?.latitude?.toString() || '',
        longitude: location.coordinates?.longitude?.toString() || '',
        description: location.description || '',
        region: location.region || '',
        country: location.country || '',
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        latitude: '',
        longitude: '',
        description: '',
        region: '',
        country: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.latitude || !formData.longitude) {
      showNotification('error', 'Latitude and longitude are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        description: formData.description || null,
        region: formData.region || null,
        country: formData.country || null,
      };

      const endpoint = editingLocation ? `/api/locations/${editingLocation.location_id}` : '/api/locations';
      const method = editingLocation ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save location');

      if (editingLocation) {
        setLocations((prev) =>
          prev.map((location) => (location.location_id === data.location_id ? data : location))
        );
        showNotification('success', 'Location updated successfully.');
      } else {
        setLocations((prev) => [data, ...prev]);
        showNotification('success', 'Location added successfully.');
      }

      handleCloseModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save location';
      showNotification('error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const response = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete location');

      setLocations((prev) => prev.filter((location) => location.location_id !== id));
      showNotification('success', 'Location deleted successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete location';
      showNotification('error', message);
    }
  };

  const filteredLocations = useMemo(() => {
    if (!searchTerm) return locations;
    const query = searchTerm.toLowerCase();
    return locations.filter((location) => {
      const description = location.description?.toLowerCase() || '';
      const region = location.region?.toLowerCase() || '';
      const country = location.country?.toLowerCase() || '';
      return description.includes(query) || region.includes(query) || country.includes(query);
    });
  }, [locations, searchTerm]);

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sampling Locations</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage locations where samples are collected
            </p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus size={20} className="mr-2" />
            Add Location
          </Button>
        </div>

        {/* Map Visualization */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Location Map
          </h2>
          <div className="h-96 rounded-lg overflow-hidden">
            <Map locations={locations} />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Search by description, region, country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Locations Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Coordinates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Loading locations...
                    </td>
                  </tr>
                ) : filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No locations found.
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((location) => (
                    <tr key={location.location_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-green-600" />
                        <span>
                          {location.coordinates
                            ? `${location.coordinates.latitude.toFixed(4)}, ${location.coordinates.longitude.toFixed(4)}`
                            : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {location.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {location.region}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {location.country || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(location)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(location.location_id)}
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
          title={editingLocation ? 'Edit Location' : 'Add New Location'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitude *"
                type="number"
                step="0.0001"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                required
              />
              <Input
                label="Longitude *"
                type="number"
                step="0.0001"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                required
              />
            </div>
            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
            <Input
              label="Region"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {editingLocation ? 'Update Location' : 'Add Location'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </>
      
  );
}

