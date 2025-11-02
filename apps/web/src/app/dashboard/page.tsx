'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, CheckSquare, DollarSign, Calendar, Activity } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface DashboardStats {
  customers: {
    total: number;
    recent: number;
  };
  deals: {
    total: number;
    totalValue: number;
    active: number;
  };
  tasks: {
    total: number;
    pending: number;
    overdue: number;
  };
  contacts: {
    total: number;
    thisMonth: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to view dashboard');
        setLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [customersRes, dealsRes, tasksRes, contactsRes] = await Promise.all([
        fetch(`${API_URL}/api/customers`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_URL}/api/deals`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_URL}/api/tasks`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_URL}/api/contact-history?limit=1000`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      const [customersData, dealsData, tasksData, contactsData] = await Promise.all([
        customersRes.json(),
        dealsRes.json(),
        tasksRes.json(),
        contactsRes.json(),
      ]);

      // Calculate statistics
      const customers = customersData.success ? customersData.data || [] : [];
      const deals = dealsData.success ? dealsData.data || [] : [];
      const tasks = tasksData.success ? tasksData.data || [] : [];
      const contacts = contactsData.success ? contactsData.data || [] : [];

      // Recent customers (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentCustomers = customers.filter(
        (c: any) => new Date(c.createdAt) >= sevenDaysAgo
      );

      // Active deals (not closed)
      const activeDeals = deals.filter(
        (d: any) => !d.actualCloseDate && d.stageId !== '6' // Not closed lost
      );

      // Calculate total deal value
      const totalDealValue = deals.reduce(
        (sum: number, deal: any) => sum + parseFloat(deal.value || 0),
        0
      );

      // Pending tasks
      const pendingTasks = tasks.filter((t: any) => t.status === 'PENDING');

      // Overdue tasks
      const now = new Date();
      const overdueTasks = tasks.filter(
        (t: any) =>
          t.status !== 'COMPLETE' &&
          t.dueDate &&
          new Date(t.dueDate) < now
      );

      // Contacts this month
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      const contactsThisMonth = contacts.filter(
        (c: any) => new Date(c.createdAt) >= firstDayOfMonth
      );

      setStats({
        customers: {
          total: customers.length,
          recent: recentCustomers.length,
        },
        deals: {
          total: deals.length,
          totalValue: totalDealValue,
          active: activeDeals.length,
        },
        tasks: {
          total: tasks.length,
          pending: pendingTasks.length,
          overdue: overdueTasks.length,
        },
        contacts: {
          total: contacts.length,
          thisMonth: contactsThisMonth.length,
        },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of your CRM system</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        ) : stats ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Customers Card */}
              <Link href="/customers" className="group">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-500 group-hover:text-blue-600">
                      View All →
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {stats.customers.total}
                  </h3>
                  <p className="text-sm text-gray-600">Total Customers</p>
                  {stats.customers.recent > 0 && (
                    <p className="text-xs text-blue-600 mt-2">
                      +{stats.customers.recent} in last 7 days
                    </p>
                  )}
                </div>
              </Link>

              {/* Deals Card */}
              <Link href="/pipeline" className="group">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-500 group-hover:text-green-600">
                      View Pipeline →
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {stats.deals.active}
                  </h3>
                  <p className="text-sm text-gray-600">Active Deals</p>
                  <p className="text-xs text-green-600 mt-2 font-semibold">
                    {formatCurrency(stats.deals.totalValue)} total value
                  </p>
                </div>
              </Link>

              {/* Tasks Card */}
              <Link href="/tasks" className="group">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <CheckSquare className="w-6 h-6 text-purple-600" />
                    </div>
                    <span className="text-sm text-gray-500 group-hover:text-purple-600">
                      View Tasks →
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {stats.tasks.pending}
                  </h3>
                  <p className="text-sm text-gray-600">Pending Tasks</p>
                  {stats.tasks.overdue > 0 ? (
                    <p className="text-xs text-red-600 mt-2 font-semibold">
                      ⚠️ {stats.tasks.overdue} overdue
                    </p>
                  ) : (
                    <p className="text-xs text-purple-600 mt-2 font-semibold">
                      {stats.tasks.total} total tasks
                    </p>
                  )}
                </div>
              </Link>

              {/* Contact History Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {stats.contacts.thisMonth}
                </h3>
                <p className="text-sm text-gray-600">Contacts This Month</p>
                <p className="text-xs text-gray-500 mt-2">
                  {stats.contacts.total} total contacts
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/customers"
                  className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">Manage Customers</h3>
                      <p className="text-sm text-gray-600">View and edit customer information</p>
                    </div>
                  </div>
                </Link>
                <Link
                  href="/pipeline"
                  className="p-4 border rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <div>
                      <h3 className="font-semibold">Sales Pipeline</h3>
                      <p className="text-sm text-gray-600">Track and manage your deals</p>
                    </div>
                  </div>
                </Link>
                <Link
                  href="/tasks"
                  className="p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-purple-600" />
                    <div>
                      <h3 className="font-semibold">Task Management</h3>
                      <p className="text-sm text-gray-600">Organize your work and priorities</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Deal Summary
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Deals:</span>
                    <span className="font-semibold">{stats.deals.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Deals:</span>
                    <span className="font-semibold text-green-600">{stats.deals.active}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="text-gray-900 font-medium">Total Pipeline Value:</span>
                    <span className="font-bold text-lg text-green-600">
                      {formatCurrency(stats.deals.totalValue)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Task Overview
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Tasks:</span>
                    <span className="font-semibold">{stats.tasks.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pending:</span>
                    <span className="font-semibold text-yellow-600">{stats.tasks.pending}</span>
                  </div>
                  {stats.tasks.overdue > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Overdue:</span>
                      <span className="font-semibold text-red-600">{stats.tasks.overdue}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="text-gray-900 font-medium">Completion Rate:</span>
                    <span className="font-bold text-lg">
                      {stats.tasks.total > 0
                        ? Math.round(
                            ((stats.tasks.total - stats.tasks.pending) / stats.tasks.total) * 100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

