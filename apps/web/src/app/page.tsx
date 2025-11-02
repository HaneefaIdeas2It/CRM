'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, TrendingUp, CheckSquare, LogOut, User, Mail, Edit2, X } from 'lucide-react';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  useEffect(() => {
    // Check if user is logged in
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');
      setIsAuthenticated(!!token);
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setEditFormData({
            firstName: parsedUser.firstName || '',
            lastName: parsedUser.lastName || '',
            email: parsedUser.email || '',
          });
        } catch (e) {
          // Invalid user data
        }
      }
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = '/';
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement API call to update user profile
    // For now, just update local storage
    const updatedUser = {
      ...user,
      firstName: editFormData.firstName,
      lastName: editFormData.lastName,
      email: editFormData.email,
    };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setShowEditForm(false);
    setShowUserMenu(false);
  };

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header with Logout button in top right */}
      <header className="w-full p-4 flex justify-end items-center relative">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            {/* User name with hover menu */}
            <div className="relative">
              <button
                onMouseEnter={() => setShowUserMenu(true)}
                onMouseLeave={() => !showEditForm && setShowUserMenu(false)}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
              >
                <User className="w-4 h-4 mr-2" />
                <span className="font-semibold">
                  {user.firstName} {user.lastName}
                </span>
              </button>

              {/* User Details Dropdown */}
              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                  onMouseEnter={() => setShowUserMenu(true)}
                  onMouseLeave={() => !showEditForm && setShowUserMenu(false)}
                >
                  {!showEditForm ? (
                    <div className="p-4">
                      <div className="flex items-center mb-4 pb-4 border-b">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <User className="w-6 h-6 text-green-700" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.role || 'User'}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{user.email}</span>
                        </div>

                        {user.organizationName && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Organization: </span>
                            <span>{user.organizationName}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <button
                          onClick={() => setShowEditForm(true)}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit Profile
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Edit Profile</h3>
                        <button
                          onClick={() => {
                            setShowEditForm(false);
                            setEditFormData({
                              firstName: user.firstName || '',
                              lastName: user.lastName || '',
                              email: user.email || '',
                            });
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleUpdateProfile} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={editFormData.firstName}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, firstName: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={editFormData.lastName}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, lastName: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, email: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            type="submit"
                            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditForm(false);
                              setEditFormData({
                                firstName: user.firstName || '',
                                lastName: user.lastName || '',
                                email: user.email || '',
                              });
                            }}
                            className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        ) : (
          <Link 
            href="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login / Register
          </Link>
        )}
      </header>

      {/* Main content centered */}
      <div className="flex-1 flex flex-col items-center justify-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
          <h1 className="text-4xl font-bold text-center mb-4">Welcome to CRM System</h1>
          <p className="text-center text-gray-600 mb-8">Modern cloud-native customer relationship management</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/customers" className="group">
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="flex items-center mb-3">
                <Users className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold">Customer Management</h2>
              </div>
              <p className="text-gray-600">Track and manage your customer relationships</p>
              <p className="text-sm text-blue-600 mt-3 group-hover:underline">View Customers →</p>
            </div>
          </Link>
          
          <Link href="/pipeline" className="group">
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="flex items-center mb-3">
                <TrendingUp className="w-6 h-6 text-green-600 mr-2" />
                <h2 className="text-xl font-semibold">Sales Pipeline</h2>
              </div>
              <p className="text-gray-600">Visualize and manage your sales process</p>
              <p className="text-sm text-green-600 mt-3 group-hover:underline">View Pipeline →</p>
            </div>
          </Link>
          
          <Link href="/tasks" className="group">
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="flex items-center mb-3">
                <CheckSquare className="w-6 h-6 text-purple-600 mr-2" />
                <h2 className="text-xl font-semibold">Task Management</h2>
              </div>
              <p className="text-gray-600">Organize and prioritize your work</p>
              <p className="text-sm text-purple-600 mt-3 group-hover:underline">View Tasks →</p>
            </div>
          </Link>
        </div>

        {/* Dashboard Link */}
        {isAuthenticated && (
          <div className="mt-8 text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Users className="w-5 h-5 mr-2" />
              View Dashboard
            </Link>
          </div>
        )}
        </div>
      </div>
    </main>
  );
}

