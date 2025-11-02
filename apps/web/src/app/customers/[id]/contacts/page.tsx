'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Phone, Mail, Calendar, FileText, X, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ContactHistory {
  id: string;
  customerId: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';
  subject: string | null;
  body: string;
  duration: number | null;
  attachments: string[] | string;
  aiSummary: string | null;
  createdAt: string;
  createdBy: string;
  customerFirstName: string;
  customerLastName: string;
  creatorFirstName: string;
  creatorLastName: string;
}

export default function CustomerContactsPage() {
  const params = useParams();
  const customerId = params.id as string;
  const [contacts, setContacts] = useState<ContactHistory[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'NOTE' as 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE',
    subject: '',
    body: '',
    duration: '',
  });

  useEffect(() => {
    fetchContacts();
    fetchCustomer();
  }, [customerId]);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  const fetchCustomer = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/customers/${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setCustomer(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch customer:', err);
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to view contact history');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/api/contact-history?customerId=${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 401) {
        setError('Session expired. Please login again.');
        return;
      }

      const data = await response.json();

      if (data.success) {
        // Handle attachments - parse if string
        const processedContacts = (data.data || []).map((contact: ContactHistory) => ({
          ...contact,
          attachments:
            typeof contact.attachments === 'string'
              ? JSON.parse(contact.attachments)
              : contact.attachments || [],
        }));
        setContacts(processedContacts);
      } else {
        setError(data.error?.message || 'Failed to fetch contact history');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contact history');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to create contact history');
        return;
      }

      const response = await fetch(`${API_URL}/api/contact-history`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          type: formData.type,
          subject: formData.subject || null,
          body: formData.body,
          duration: formData.duration ? parseInt(formData.duration, 10) : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Contact history entry created successfully!');
        setFormData({
          type: 'NOTE',
          subject: '',
          body: '',
          duration: '',
        });
        setShowForm(false);
        fetchContacts();
      } else {
        setError(data.error?.message || 'Failed to create contact history');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create contact history');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact history entry?')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/contact-history/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Contact history entry deleted successfully!');
        fetchContacts();
      } else {
        setError(data.error?.message || 'Failed to delete contact history');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete contact history');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CALL':
        return <Phone className="w-4 h-4" />;
      case 'EMAIL':
        return <Mail className="w-4 h-4" />;
      case 'MEETING':
        return <Calendar className="w-4 h-4" />;
      case 'NOTE':
        return <FileText className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CALL':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'EMAIL':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'MEETING':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'NOTE':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/customers"
              className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
            >
              ← Back to Customers
            </Link>
            <h1 className="text-3xl font-bold">
              Contact History
              {customer && (
                <span className="text-xl text-gray-600 font-normal ml-2">
                  - {customer.firstName} {customer.lastName}
                </span>
              )}
            </h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Add Contact Entry</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="NOTE">Note</option>
                  <option value="CALL">Call</option>
                  <option value="EMAIL">Email</option>
                  <option value="MEETING">Meeting</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Follow-up call"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Details *</label>
                <textarea
                  required
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={4}
                  placeholder="Enter contact details..."
                />
              </div>
              {(formData.type === 'CALL' || formData.type === 'MEETING') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., 30"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Entry
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading contact history...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-700 mb-2">No contact history</p>
            <p className="text-gray-600 mb-4">
              Start tracking interactions with this customer
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Entry
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-3 py-1 rounded-full border flex items-center gap-2 ${getTypeColor(
                        contact.type
                      )}`}
                    >
                      {getTypeIcon(contact.type)}
                      <span className="font-medium">{contact.type}</span>
                    </div>
                    {contact.subject && (
                      <h3 className="font-semibold text-lg">{contact.subject}</h3>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-gray-700 mb-3 whitespace-pre-wrap">{contact.body}</p>

                <div className="flex items-center gap-4 text-sm text-gray-600 pt-3 border-t">
                  <span>
                    By: {contact.creatorFirstName} {contact.creatorLastName}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(contact.createdAt).toLocaleDateString()} at{' '}
                    {new Date(contact.createdAt).toLocaleTimeString()}
                  </span>
                  {contact.duration && (
                    <>
                      <span>•</span>
                      <span>Duration: {formatDuration(contact.duration)}</span>
                    </>
                  )}
                </div>

                {contact.attachments && Array.isArray(contact.attachments) && contact.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                    <div className="flex flex-wrap gap-2">
                      {contact.attachments.map((attachment, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700"
                        >
                          {attachment}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {contact.aiSummary && (
                  <div className="mt-3 pt-3 border-t bg-blue-50 p-3 rounded">
                    <p className="text-sm font-medium text-blue-900 mb-1">AI Summary:</p>
                    <p className="text-sm text-blue-800">{contact.aiSummary}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

