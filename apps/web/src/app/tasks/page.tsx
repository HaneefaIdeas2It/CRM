'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Filter, Calendar, AlertCircle, GripVertical } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE';
  dueDate: string | null;
  assigneeId: string;
  assigneeFirstName: string;
  assigneeLastName: string;
  relatedCustomerId: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  timeSpent: number | null;
  completedAt: string | null;
  createdAt: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    status: 'PENDING' as 'PENDING' | 'IN_PROGRESS' | 'COMPLETE',
    dueDate: '',
    assigneeId: '',
    relatedCustomerId: '',
  });

  useEffect(() => {
    fetchTasks();
    fetchCustomers();
    fetchUsers();
  }, [filterStatus, filterPriority]);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to view tasks');
        setLoading(false);
        return;
      }

      let url = `${API_URL}/api/tasks`;
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      if (params.toString()) url += '?' + params.toString();

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        setError('Session expired. Please login again.');
        return;
      }

      const data = await response.json();

      if (data.success) {
        setTasks(data.data || []);
      } else {
        setError(data.error?.message || 'Failed to fetch tasks');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/customers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        // For now, just use current user as assignee option
        // In future, fetch all users from /api/users endpoint
        setUsers([user]);
        setFormData(prev => ({ ...prev, assigneeId: user.id }));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to create tasks');
        return;
      }

      // Prepare request body with proper formatting
      const requestBody: any = {
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        status: formData.status,
      };

      // Convert datetime-local to ISO string if provided
      if (formData.dueDate) {
        requestBody.dueDate = new Date(formData.dueDate).toISOString();
      } else {
        requestBody.dueDate = null;
      }

      // Handle optional UUID fields - only include if they have valid values
      if (formData.assigneeId && formData.assigneeId.trim() !== '') {
        requestBody.assigneeId = formData.assigneeId;
      }

      if (formData.relatedCustomerId && formData.relatedCustomerId.trim() !== '') {
        requestBody.relatedCustomerId = formData.relatedCustomerId;
      } else {
        requestBody.relatedCustomerId = null;
      }

      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Task created successfully!');
        setFormData({
          title: '',
          description: '',
          priority: 'MEDIUM',
          status: 'PENDING',
          dueDate: '',
          assigneeId: formData.assigneeId, // Keep assignee
          relatedCustomerId: '',
        });
        setShowForm(false);
        fetchTasks();
      } else {
        // Show detailed validation errors if available
        if (data.error?.details?.errors) {
          const validationErrors = data.error.details.errors
            .map((err: any) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
          setError(`Validation failed: ${validationErrors}`);
        } else {
          setError(data.error?.message || 'Failed to create task');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to update tasks');
        return;
      }

      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh tasks list
        await fetchTasks();
      } else {
        setError(data.error?.message || 'Failed to update task');
        throw new Error(data.error?.message || 'Failed to update task');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
      throw err; // Re-throw to allow drop handler to catch
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    console.log('Drag start:', task.id, task.status);
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', task.id);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.setData('application/json', JSON.stringify({ id: task.id, status: task.status }));
    // Add a visual effect
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    console.log('Drag end');
    setDragOverStatus(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    // Don't clear draggedTask here - let the drop handler do it
    // setTimeout(() => {
    //   setDraggedTask(null);
    // }, 100);
  };


  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStatus(null);

    console.log('Drop event triggered for status:', targetStatus);
    console.log('Current draggedTask:', draggedTask);

    // Try to get task info from dataTransfer if draggedTask is null
    let taskToMove = draggedTask;
    
    if (!taskToMove) {
      try {
        const taskData = e.dataTransfer.getData('application/json');
        if (taskData) {
          taskToMove = JSON.parse(taskData) as Task;
          console.log('Recovered task from dataTransfer:', taskToMove);
        } else {
          const taskId = e.dataTransfer.getData('text/plain');
          if (taskId) {
            // Find task in current list
            taskToMove = tasks.find(t => t.id === taskId) || null;
            console.log('Found task from ID:', taskToMove);
          }
        }
      } catch (err) {
        console.error('Error recovering task from dataTransfer:', err);
      }
    }

    if (!taskToMove) {
      console.log('No task to move');
      return;
    }

    // Don't update if task is already in target status
    if (taskToMove.status === targetStatus) {
      console.log('Task already in target status');
      setDraggedTask(null);
      return;
    }

    // Don't allow moving completed tasks
    if (taskToMove.status === 'COMPLETE') {
      console.log('Cannot move completed tasks');
      setDraggedTask(null);
      return;
    }

    console.log(`Moving task ${taskToMove.id} from ${taskToMove.status} to ${targetStatus}`);
    
    // Update task status
    const taskId = taskToMove.id;
    setDraggedTask(null); // Clear immediately to prevent double-drops
    
    try {
      await handleUpdateStatus(taskId, targetStatus);
      console.log('Task status updated successfully');
    } catch (error) {
      console.error('Failed to update task status:', error);
      setError('Failed to update task status');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Task deleted successfully!');
        fetchTasks();
      } else {
        setError(data.error?.message || 'Failed to delete task');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PENDING':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && !tasks.find(t => t.id && t.completedAt);
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus && task.status !== filterStatus) return false;
    if (filterPriority && task.priority !== filterPriority) return false;
    return true;
  });

  const tasksByStatus = {
    PENDING: filteredTasks.filter((t) => t.status === 'PENDING'),
    IN_PROGRESS: filteredTasks.filter((t) => t.status === 'IN_PROGRESS'),
    COMPLETE: filteredTasks.filter((t) => t.status === 'COMPLETE'),
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <CheckSquare className="w-8 h-8 text-purple-600 mr-3" />
            <h1 className="text-3xl font-bold">Task Management</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              ← Back to Home
            </Link>
          </div>
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
            <h2 className="text-xl font-semibold mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Follow up with customer"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Task details..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority *</label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status *</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETE">Complete</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Related Customer</label>
                <select
                  value={formData.relatedCustomerId}
                  onChange={(e) =>
                    setFormData({ ...formData, relatedCustomerId: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">None</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Create Task
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETE">Complete</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <CheckSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-700 mb-2">No tasks found</p>
            <p className="text-gray-600 mb-4">Get started by creating your first task</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Create Task
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pending Tasks */}
            <div
              className={`bg-white rounded-lg shadow ${
                dragOverStatus === 'PENDING' ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold">Pending</h3>
                <p className="text-sm text-gray-600">{tasksByStatus.PENDING.length} tasks</p>
              </div>
              <div 
                className="p-4 space-y-3 min-h-[100px]"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (draggedTask) {
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverStatus('PENDING');
                  }
                }}
                onDragLeave={(e) => {
                  // Only clear if we're leaving the container, not moving to a child
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const x = e.clientX;
                  const y = e.clientY;
                  
                  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                    setDragOverStatus(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Drop on PENDING column');
                  handleDrop(e, 'PENDING');
                }}
              >
                {tasksByStatus.PENDING.length === 0 && dragOverStatus === 'PENDING' && (
                  <div 
                    className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center text-gray-400 bg-blue-50 pointer-events-none"
                  >
                    Drop task here
                  </div>
                )}
                {tasksByStatus.PENDING.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-move bg-white"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <h4 className="font-semibold">{task.title}</h4>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ×
                      </button>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`px-2 py-1 rounded text-xs border ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                      {task.customerFirstName && (
                        <span className="text-xs text-gray-600">
                          👤 {task.customerFirstName} {task.customerLastName}
                        </span>
                      )}
                    </div>
                    {task.dueDate && (
                      <div className={`flex items-center text-xs mb-2 ${isOverdue(task.dueDate) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(task.dueDate).toLocaleDateString()}
                        {isOverdue(task.dueDate) && (
                          <AlertCircle className="w-3 h-3 ml-1" />
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'COMPLETE')}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* In Progress Tasks */}
            <div
              className={`bg-white rounded-lg shadow ${
                dragOverStatus === 'IN_PROGRESS' ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="p-4 border-b bg-blue-50">
                <h3 className="font-semibold">In Progress</h3>
                <p className="text-sm text-gray-600">{tasksByStatus.IN_PROGRESS.length} tasks</p>
              </div>
              <div 
                className="p-4 space-y-3 min-h-[100px]"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (draggedTask) {
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverStatus('IN_PROGRESS');
                  }
                }}
                onDragLeave={(e) => {
                  // Only clear if we're leaving the container, not moving to a child
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const x = e.clientX;
                  const y = e.clientY;
                  
                  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                    setDragOverStatus(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Drop on IN_PROGRESS column');
                  handleDrop(e, 'IN_PROGRESS');
                }}
              >
                {tasksByStatus.IN_PROGRESS.length === 0 && dragOverStatus === 'IN_PROGRESS' && (
                  <div 
                    className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center text-gray-400 bg-blue-50 pointer-events-none"
                  >
                    Drop task here
                  </div>
                )}
                {tasksByStatus.IN_PROGRESS.map((task) => (
                  <div
                    key={task.id}
                    draggable={task.status !== 'COMPLETE'}
                    onDragStart={(e) => {
                      if (task.status !== 'COMPLETE') {
                        handleDragStart(e, task);
                      }
                    }}
                    onDragEnd={handleDragEnd}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow border-l-4 border-blue-500 bg-white"
                    style={{ cursor: task.status !== 'COMPLETE' ? 'move' : 'default' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <h4 className="font-semibold">{task.title}</h4>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ×
                      </button>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`px-2 py-1 rounded text-xs border ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    {task.dueDate && (
                      <div className={`flex items-center text-xs mb-2 ${isOverdue(task.dueDate) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'PENDING')}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex-1"
                      >
                        Move to Pending
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'COMPLETE')}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex-1"
                      >
                        Mark Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Tasks */}
            <div
              className={`bg-white rounded-lg shadow ${
                dragOverStatus === 'COMPLETE' ? 'ring-2 ring-green-500' : ''
              }`}
            >
              <div className="p-4 border-b bg-green-50">
                <h3 className="font-semibold">Complete</h3>
                <p className="text-sm text-gray-600">{tasksByStatus.COMPLETE.length} tasks</p>
              </div>
              <div 
                className="p-4 space-y-3 min-h-[100px]"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (draggedTask) {
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverStatus('COMPLETE');
                  }
                }}
                onDragLeave={(e) => {
                  // Only clear if we're leaving the container, not moving to a child
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const x = e.clientX;
                  const y = e.clientY;
                  
                  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                    setDragOverStatus(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Drop on COMPLETE column');
                  handleDrop(e, 'COMPLETE');
                }}
              >
                {tasksByStatus.COMPLETE.length === 0 && dragOverStatus === 'COMPLETE' && (
                  <div 
                    className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center text-gray-400 bg-green-50 pointer-events-none"
                  >
                    Drop task here
                  </div>
                )}
                {tasksByStatus.COMPLETE.map((task) => (
                  <div
                    key={task.id}
                    draggable={false}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow border-l-4 border-green-500 opacity-75 bg-white"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold flex-1 line-through">{task.title}</h4>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ×
                      </button>
                    </div>
                    {task.completedAt && (
                      <p className="text-xs text-gray-500">
                        Completed: {new Date(task.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

