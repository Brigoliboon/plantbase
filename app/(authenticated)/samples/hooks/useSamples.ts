import { useCallback, useEffect, useState } from 'react';
import { PlantSample, Researcher, SamplingLocation } from '@/types';
import { NotificationType } from '@/components/ui/Notification';

interface SampleFormData {
  samples: Array<{
    scientific_name: string;
    common_name: string;
    notes: string;
  }>;
  location_id: string;
  researcher_id: string;
  sample_date: string;
  temperature: string;
  humidity: string;
  soil_ph: string;
  altitude: string;
  soil_type: string;
}

interface LocationData {
  lng: number;
  lat: number;
  desc: string;
}

interface NotificationState {
  type: NotificationType;
  message: string;
  isVisible: boolean;
}

export function useSamples() {
  const [samples, setSamples] = useState<PlantSample[]>([]);
  const [locations, setLocations] = useState<SamplingLocation[]>([]);
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({
    type: 'success',
    message: '',
    isVisible: false,
  });

  const showNotification = useCallback((type: NotificationType, message: string) => {
    setNotification({ type, message, isVisible: true });
  }, []);

  const closeNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, isVisible: false }));
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

  const createSample = useCallback(async (formData: SampleFormData, location: LocationData | null) => {
    setIsSubmitting(true);
    try {
      const payload = {
        samples: formData.samples,
        location_id: formData.location_id || "",
        coordinates: location ? { lng: location.lng, lat: location.lat, desc: location.desc } : null,
        researcher_id: formData.researcher_id,
        sample_date: formData.sample_date,
        temperature: formData.temperature,
        humidity: formData.humidity,
        soil_ph: formData.soil_ph,
        altitude: formData.altitude,
        soil_type: formData.soil_type,
      };

      const response = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save samples');

      const newSamples = Array.isArray(data) ? data : [data];
      setSamples((prev) => [...newSamples, ...prev]);
      showNotification('success', `${newSamples.length} samples added successfully.`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save samples';
      showNotification('error', message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [showNotification]);

  const updateSample = useCallback(async (sampleId: string, formData: SampleFormData, location: LocationData | null) => {
    setIsSubmitting(true);
    try {
      const payload = {
        samples: formData.samples,
        location_id: formData.location_id || "",
        coordinates: location ? { lng: location.lng, lat: location.lat, desc: location.desc } : null,
        researcher_id: formData.researcher_id,
        sample_date: formData.sample_date,
        temperature: formData.temperature,
        humidity: formData.humidity,
        soil_ph: formData.soil_ph,
        altitude: formData.altitude,
        soil_type: formData.soil_type,
      };

      const response = await fetch(`/api/samples/${sampleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update sample');

      setSamples((prev) => prev.map((sample) => (sample.sample_id === data.sample_id ? data : sample)));
      showNotification('success', 'Sample updated successfully.');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update sample';
      showNotification('error', message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [showNotification]);

  const deleteSample = useCallback(async (sampleId: string) => {
    if (!confirm('Are you sure you want to delete this sample?')) return false;

    try {
      const response = await fetch(`/api/samples/${sampleId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete sample');

      setSamples((prev) => prev.filter((sample) => sample.sample_id !== sampleId));
      showNotification('success', 'Sample deleted successfully.');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete sample';
      showNotification('error', message);
      return false;
    }
  }, [showNotification]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return {
    samples,
    locations,
    researchers,
    isLoading,
    isSubmitting,
    notification,
    showNotification,
    closeNotification,
    fetchInitialData,
    createSample,
    updateSample,
    deleteSample,
  };
}
