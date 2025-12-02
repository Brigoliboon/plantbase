'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import MainLayout from '@/app/(authenticated)/layout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Notification, { NotificationType } from '@/components/ui/Notification';
import { Plus, Search, Edit, Trash2, Mail, Phone, Building } from 'lucide-react';
import { Researcher } from '@/types';

export default function ResearchersPage() {
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResearcher, setEditingResearcher] = useState<Researcher | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: NotificationType; message: string; isVisible: boolean }>({
    type: 'success',
    message: '',
    isVisible: false,
  });

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    affiliation: '',
  });

  const showNotification = useCallback((type: NotificationType, message: string) => {
    setNotification({ type, message, isVisible: true });
  }, []);

  const fetchResearchers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/researchers');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load researchers');
      setResearchers(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch researchers';
      showNotification('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchResearchers();
  }, [fetchResearchers]);

  const handleOpenModal = (researcher?: Researcher) => {
    if (researcher) {
      setEditingResearcher(researcher);
      setFormData({
        full_name: researcher.full_name,
        email: researcher.contact?.email || '',
        phone: researcher.contact?.phone || '',
        affiliation: researcher.affiliation || '',
      });
    } else {
      setEditingResearcher(null);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        affiliation: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingResearcher(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) {
      showNotification('error', 'Full name and email are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        full_name: formData.full_name,
        affiliation: formData.affiliation || null,
        contact: {
          email: formData.email,
          phone: formData.phone || null,
        },
      };

      const endpoint = editingResearcher ? `/api/researchers/${editingResearcher.researcher_id}` : '/api/researchers';
      const method = editingResearcher ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save researcher');

      if (editingResearcher) {
        setResearchers((prev) =>
          prev.map((researcher) => (researcher.researcher_id === data.researcher_id ? data : researcher))
        );
        showNotification('success', 'Researcher updated successfully.');
      } else {
        setResearchers((prev) => [data, ...prev]);
        showNotification('success', 'Researcher added successfully.');
      }

      handleCloseModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save researcher';
      showNotification('error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this researcher?')) return;

    try {
      const response = await fetch(`/api/researchers/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete researcher');

      setResearchers((prev) => prev.filter((researcher) => researcher.researcher_id !== id));
      showNotification('success', 'Researcher deleted successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete researcher';
      showNotification('error', message);
    }
  };

  const filteredResearchers = useMemo(() => {
    if (!searchTerm) return researchers;
    return researchers.filter((researcher) => {
      const query = searchTerm.toLowerCase();
      return (
        researcher.full_name.toLowerCase().includes(query) ||
        researcher.contact?.email?.toLowerCase().includes(query) ||
        researcher.affiliation?.toLowerCase().includes(query)
      );
    });
  }, [researchers, searchTerm]);

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Researchers</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage researchers who collect samples
            </p>
          </div>
          {/* <Button onClick={() => handleOpenModal()}>
            <Plus size={20} className="mr-2" />
            Add Researcher
          </Button> */}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Search by name, email, affiliation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Researchers Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Affiliation
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th> */}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      Loading researchers...
                    </td>
                  </tr>
                ) : filteredResearchers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No researchers found.
                    </td>
                  </tr>
                ) : (
                  filteredResearchers.map((researcher) => (
                    <tr key={researcher.researcher_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {researcher.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-gray-400" />
                        <a href={`mailto:${researcher.contact?.email}`} className="text-blue-600 hover:underline">
                          {researcher.contact?.email}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {researcher.contact?.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-gray-400" />
                        <a href={`tel:${researcher.contact?.phone}`} className="text-blue-600 hover:underline">
                          {researcher.contact?.phone}
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {researcher.affiliation ? (
                        <div className="flex items-center gap-2">
                          <Building size={16} className="text-gray-400" />
                          {researcher.affiliation}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(researcher)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(researcher.researcher_id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td> */}
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
          title={editingResearcher ? 'Edit Researcher' : 'Add New Researcher'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name *"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Affiliation"
              value={formData.affiliation}
              onChange={(e) => setFormData({ ...formData, affiliation: e.target.value })}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {editingResearcher ? 'Update Researcher' : 'Add Researcher'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}

