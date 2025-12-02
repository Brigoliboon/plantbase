'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Researcher } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Notification from '@/components/ui/Notification';
import { User, Mail, Phone, Building, Edit, Trash2 } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [researcher, setResearcher] = useState<Researcher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    affiliation: '',
    contact: {
      email: '',
      phone: '',
      affiliation: '',
    },
  });

  useEffect(() => {
    if (user?.id) {
      fetchResearcher();
    }
  }, [user]);

  const fetchResearcher = async () => {
    try {
      const response = await fetch(`/api/researchers/me`);
      if (response.ok) {
        const data = await response.json();
        setResearcher(data);
        setFormData({
          full_name: data.full_name || '',
          affiliation: data.affiliation || '',
          contact: {
            email: data.contact?.email || '',
            phone: data.contact?.phone || '',
            affiliation: data.contact?.affiliation || '',
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch researcher:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await fetch(`/api/researchers/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedResearcher = await response.json();
        setResearcher(updatedResearcher);
        setIsEditing(false);
        setNotification({
          type: 'success',
          message: 'Profile updated successfully',
        });
      } else {
        const error = await response.json();
        setNotification({
          type: 'error',
          message: error.error || 'Failed to update profile',
        });
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to update profile',
      });
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/researchers/me`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotification({
          type: 'success',
          message: 'Account deleted successfully',
        });
        // Redirect to login or home page after deletion
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        const error = await response.json();
        setNotification({
          type: 'error',
          message: error.error || 'Failed to delete account',
        });
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to delete account',
      });
    } finally {
      setShowDeleteModal(false);
    }
  };

  const closeNotification = () => {
    setNotification(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600 dark:text-gray-400">Loading profile...</div>
      </div>
    );
  }

  if (!researcher) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600 dark:text-gray-400">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your researcher profile and account settings
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2"
          >
            <Edit size={16} />
            Edit Profile
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2"
          >
            <Trash2 size={16} />
            Delete Account
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <User className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {researcher.full_name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Researcher ID: {researcher.researcher_id}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Basic Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="text-gray-400" size={16} />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Full Name</p>
                    <p className="text-gray-900 dark:text-white">{researcher.full_name}</p>
                  </div>
                </div>
                {researcher.affiliation && (
                  <div className="flex items-center gap-3">
                    <Building className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Affiliation</p>
                      <p className="text-gray-900 dark:text-white">{researcher.affiliation}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Contact Information
              </h3>
              <div className="space-y-4">
                {researcher.contact?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="text-gray-900 dark:text-white">{researcher.contact.email}</p>
                    </div>
                  </div>
                )}
                {researcher.contact?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                      <p className="text-gray-900 dark:text-white">{researcher.contact.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(researcher.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(researcher.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Profile"
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
          <Input
            label="Affiliation"
            value={formData.affiliation}
            onChange={(e) => setFormData({ ...formData, affiliation: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.contact.email}
            onChange={(e) =>
              setFormData({
                ...formData,
                contact: { ...formData.contact, email: e.target.value },
              })
            }
          />
          <Input
            label="Phone"
            value={formData.contact.phone}
            onChange={(e) =>
              setFormData({
                ...formData,
                contact: { ...formData.contact, phone: e.target.value },
              })
            }
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate}>Save Changes</Button>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-red-800 dark:text-red-200 font-medium">
              Warning: This action cannot be undone
            </p>
            <p className="text-red-700 dark:text-red-300 text-sm mt-1">
              Deleting your account will permanently remove all your data, including samples and locations.
              This action is irreversible.
            </p>
          </div>
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete your account? Please type &quot;DELETE&quot; to confirm.
          </p>
          <Input
            placeholder="Type DELETE to confirm"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Account
          </Button>
        </div>
      </Modal>

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={closeNotification} isVisible={false}        />
      )}
    </div>
  );
}
