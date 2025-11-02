'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Plus, DollarSign, GripVertical, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
}

interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  isDefault: boolean;
}

interface Deal {
  id: string;
  title: string;
  value: string;
  currency: string;
  probability: number;
  stageId: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  expectedCloseDate: string | null;
}

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: '',
    title: '',
    value: '',
    stageId: '',
  });
  
  // Drag and drop state
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  
  // Stage selector popover state
  const [openStageSelectorId, setOpenStageSelectorId] = useState<string | null>(null);
  const [contextMenuDeal, setContextMenuDeal] = useState<{ deal: Deal; x: number; y: number } | null>(null);

  useEffect(() => {
    fetchPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      fetchDeals();
      fetchCustomers();
      // Set default stage
      if (selectedPipeline.stages.length > 0 && !formData.stageId) {
        setFormData(prev => ({
          ...prev,
          stageId: selectedPipeline.stages[0].id,
        }));
      }
    }
  }, [selectedPipeline]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  const fetchPipelines = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to view pipelines');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/pipelines`, {
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
        const pipelinesData = data.data.map((p: any) => ({
          ...p,
          stages: typeof p.stages === 'string' ? JSON.parse(p.stages) : p.stages,
        }));
        setPipelines(pipelinesData);
        
        // Select default pipeline or first one
        const defaultPipeline = pipelinesData.find((p: Pipeline) => p.isDefault) || pipelinesData[0];
        if (defaultPipeline) {
          setSelectedPipeline(defaultPipeline);
        }
      } else {
        setError(data.error?.message || 'Failed to fetch pipelines');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pipelines');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeals = async () => {
    if (!selectedPipeline) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${API_URL}/api/deals?pipelineId=${selectedPipeline.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setDeals(data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch deals:', err);
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
    } catch (err: any) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedPipeline) {
      setError('Please select a pipeline');
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to create deals');
        return;
      }

      const response = await fetch(`${API_URL}/api/deals`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: formData.customerId,
          pipelineId: selectedPipeline.id,
          stageId: formData.stageId,
          title: formData.title,
          value: parseFloat(formData.value),
          currency: 'USD',
          probability: selectedPipeline.stages.find((s) => s.id === formData.stageId)?.probability || 0,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Deal created successfully!');
        setFormData({
          customerId: '',
          title: '',
          value: '',
          stageId: selectedPipeline.stages[0]?.id || '',
        });
        setShowForm(false);
        fetchDeals();
      } else {
        setError(data.error?.message || 'Failed to create deal');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create deal');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', deal.id);
    e.dataTransfer.setData('application/json', JSON.stringify({ id: deal.id, stageId: deal.stageId }));
    
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDragOverStageId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedDeal && draggedDeal.stageId !== stageId) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverStageId(stageId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverStageId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStageId(null);

    if (!draggedDeal) {
      // Try to recover from dataTransfer
      try {
        const dealData = e.dataTransfer.getData('application/json');
        if (dealData) {
          const dealInfo = JSON.parse(dealData);
          const deal = deals.find(d => d.id === dealInfo.id);
          if (deal && deal.stageId !== targetStageId) {
            await updateDealStage(deal.id, targetStageId);
          }
        }
      } catch (err) {
        console.error('Error recovering deal from drag:', err);
      }
      setDraggedDeal(null);
      return;
    }

    // Don't update if deal is already in target stage
    if (draggedDeal.stageId === targetStageId) {
      setDraggedDeal(null);
      return;
    }

    const dealId = draggedDeal.id;
    setDraggedDeal(null);
    
    try {
      await updateDealStage(dealId, targetStageId);
    } catch (error) {
      console.error('Failed to update deal stage:', error);
      setError('Failed to move deal');
    }
  };

  const updateDealStage = async (dealId: string, newStageId: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login to update deals');
        return;
      }

      // Get the new stage to get its probability
      const newStage = selectedPipeline?.stages.find(s => s.id === newStageId);
      if (!newStage) {
        setError('Stage not found');
        return;
      }

      const response = await fetch(`${API_URL}/api/deals/${dealId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stageId: newStageId,
          probability: newStage.probability,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Deal moved successfully!');
        await fetchDeals(); // Refresh deals
      } else {
        setError(data.error?.message || 'Failed to update deal');
        throw new Error(data.error?.message || 'Failed to update deal');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update deal');
      throw err;
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/deals/${dealId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Deal deleted successfully!');
        fetchDeals();
      } else {
        setError(data.error?.message || 'Failed to delete deal');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete deal');
    }
  };

  const handleQuickStageChange = async (dealId: string, newStageId: string) => {
    setOpenStageSelectorId(null);
    setContextMenuDeal(null);
    await updateDealStage(dealId, newStageId);
  };

  const handleContextMenu = (e: React.MouseEvent, deal: Deal) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuDeal({
      deal,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuDeal(null);
      setOpenStageSelectorId(null);
    };

    if (contextMenuDeal || openStageSelectorId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenuDeal, openStageSelectorId]);

  const getDealsForStage = (stageId: string): Deal[] => {
    return deals.filter((deal) => deal.stageId === stageId);
  };

  const formatCurrency = (value: string, currency: string) => {
    const numValue = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(numValue);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
            <h1 className="text-3xl font-bold">Sales Pipeline</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Deal
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
            <button
              onClick={() => setSuccess('')}
              className="float-right text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Right-click Context Menu */}
        {contextMenuDeal && (
          <div
            className="fixed bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[200px] py-2"
            style={{
              left: `${contextMenuDeal.x}px`,
              top: `${contextMenuDeal.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b">
              {contextMenuDeal.deal.title}
            </div>
            <div className="px-3 py-2 text-xs text-gray-500 border-b">
              Move to Stage:
            </div>
            {selectedPipeline?.stages
              .sort((a, b) => a.order - b.order)
              .map((stage) => (
                <button
                  key={stage.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (contextMenuDeal.deal.stageId !== stage.id) {
                      handleQuickStageChange(contextMenuDeal.deal.id, stage.id);
                    }
                  }}
                  disabled={contextMenuDeal.deal.stageId === stage.id}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                    contextMenuDeal.deal.stageId === stage.id
                      ? 'bg-green-50 text-green-700 font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{stage.name}</span>
                    <span className="text-xs text-gray-500">
                      ({stage.probability}%)
                    </span>
                  </div>
                  {contextMenuDeal.deal.stageId === stage.id && (
                    <span className="text-green-600">✓</span>
                  )}
                </button>
              ))}
            <div className="border-t mt-1 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDeal(contextMenuDeal.deal.id);
                  setContextMenuDeal(null);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete Deal
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading pipeline...</p>
          </div>
        ) : selectedPipeline ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">{selectedPipeline.name}</h2>
              {selectedPipeline.isDefault && (
                <span className="text-sm text-gray-600">(Default Pipeline)</span>
              )}
            </div>

            {/* Kanban Board */}
            <div className="overflow-x-auto">
              <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
                {selectedPipeline.stages
                  .sort((a, b) => a.order - b.order)
                  .map((stage) => {
                    const stageDeals = getDealsForStage(stage.id);
                    const totalValue = stageDeals.reduce(
                      (sum, deal) => sum + parseFloat(deal.value),
                      0
                    );

                    return (
                      <div
                        key={stage.id}
                        className={`bg-gray-100 rounded-lg p-4 min-w-[300px] flex-shrink-0 ${
                          dragOverStageId === stage.id ? 'ring-2 ring-green-500' : ''
                        }`}
                        onDragOver={(e) => handleDragOver(e, stage.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, stage.id)}
                      >
                        <div className="mb-4">
                          <h3 className="font-semibold text-lg">{stage.name}</h3>
                          <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                            <span>{stageDeals.length} deals</span>
                            <span className="font-semibold">
                              {formatCurrency(totalValue.toString(), 'USD')}
                            </span>
                          </div>
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${stage.probability}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {stage.probability}% probability
                            </span>
                          </div>
                        </div>

                        <div 
                          className="space-y-3 min-h-[100px]"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (draggedDeal) {
                              handleDragOver(e, stage.id);
                            }
                          }}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDrop(e, stage.id);
                          }}
                        >
                          {stageDeals.length === 0 && dragOverStageId === stage.id && (
                            <div 
                              className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center text-gray-400 bg-green-50 pointer-events-none"
                            >
                              Drop deal here
                            </div>
                          )}
                          {stageDeals.map((deal) => (
                            <div
                              key={deal.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, deal)}
                              onDragEnd={handleDragEnd}
                              onContextMenu={(e) => handleContextMenu(e, deal)}
                              className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border-l-4 border-green-500 cursor-move relative group"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <h4 className="font-semibold">{deal.title}</h4>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {/* Quick Stage Selector Button */}
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenStageSelectorId(
                                          openStageSelectorId === deal.id ? null : deal.id
                                        );
                                      }}
                                      className="text-gray-600 hover:text-green-600 text-sm p-1 hover:bg-gray-100 rounded"
                                      title="Change stage"
                                    >
                                      <ArrowRight className="w-4 h-4" />
                                    </button>
                                    
                                    {/* Stage Selector Dropdown */}
                                    {openStageSelectorId === deal.id && (
                                      <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[220px] py-2 max-h-[400px] overflow-y-auto">
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b sticky top-0 bg-white">
                                          Move to Stage
                                        </div>
                                        {selectedPipeline?.stages
                                          .sort((a, b) => a.order - b.order)
                                          .map((stage) => (
                                            <button
                                              key={stage.id}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (deal.stageId !== stage.id) {
                                                  handleQuickStageChange(deal.id, stage.id);
                                                }
                                              }}
                                              disabled={deal.stageId === stage.id}
                                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                                                deal.stageId === stage.id
                                                  ? 'bg-green-50 text-green-700 font-medium'
                                                  : 'text-gray-700'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span>{stage.name}</span>
                                                <span className="text-xs text-gray-500">
                                                  ({stage.probability}%)
                                                </span>
                                              </div>
                                              {deal.stageId === stage.id && (
                                                <span className="text-green-600">✓</span>
                                              )}
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Delete Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDeal(deal.id);
                                    }}
                                    className="text-red-600 hover:text-red-800 text-sm p-1 hover:bg-red-50 rounded"
                                    title="Delete deal"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-2 ml-6">
                                {deal.customerFirstName} {deal.customerLastName}
                              </p>
                              <div className="flex items-center justify-between ml-6">
                                <span className="font-bold text-green-600">
                                  {formatCurrency(deal.value, deal.currency)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {deal.probability}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {showForm && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Create New Deal</h2>
                <form onSubmit={handleCreateDeal} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer *</label>
                    <select
                      required
                      value={formData.customerId}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.firstName} {customer.lastName} - {customer.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Stage *</label>
                    <select
                      required
                      value={formData.stageId}
                      onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      {selectedPipeline.stages
                        .sort((a, b) => a.order - b.order)
                        .map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name} ({stage.probability}%)
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Deal Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="e.g., Enterprise License Deal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Deal Value *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2 flex gap-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Create Deal
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

            {deals.length === 0 && !showForm && (
              <div className="bg-white rounded-lg shadow p-12 text-center mt-8">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  No deals in pipeline
                </p>
                <p className="text-gray-600 mb-4">
                  Get started by creating your first deal
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Deal
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-xl font-semibold text-gray-700 mb-2">No pipeline found</p>
            <p className="text-gray-600">
              No pipeline available for your organization
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

