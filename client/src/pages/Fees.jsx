import React, { useState, useEffect } from 'react';
import { Search, Filter, DollarSign, TrendingUp, AlertCircle, Edit2, Eye, Plus } from 'lucide-react';
import api from '../utils/api';
import { formatCurrency, formatPercentage, getStatusColor } from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';

const Fees = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSegment, setFilterSegment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      const response = await api.get('/fees');
      setFees(response.data);
    } catch (error) {
      console.error('Error fetching fees:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter fees
  const filteredFees = fees.filter(fee => {
    const matchesSearch = 
      fee.fee_name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.fee_name_ar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.fee_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSegment = filterSegment === 'all' || fee.segment === filterSegment;
    const matchesStatus = filterStatus === 'all' || fee.status === filterStatus;
    
    return matchesSearch && matchesSegment && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Fees Management</h1>
          <p className="page-subtitle">Monitor and manage all banking fees</p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add New Fee
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Total Fees</p>
              <p className="text-2xl font-semibold text-neutral-900 mt-1">
                {fees.length}
              </p>
            </div>
            <div className="icon-wrapper bg-primary-50">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Active Fees</p>
              <p className="text-2xl font-semibold text-neutral-900 mt-1">
                {fees.filter(f => f.status === 'Active').length}
              </p>
            </div>
            <div className="icon-wrapper bg-success-50">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Retail Fees</p>
              <p className="text-2xl font-semibold text-neutral-900 mt-1">
                {fees.filter(f => f.segment === 'Retail').length}
              </p>
            </div>
            <div className="icon-wrapper bg-info-50">
              <DollarSign className="w-6 h-6 text-info-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Corporate Fees</p>
              <p className="text-2xl font-semibold text-neutral-900 mt-1">
                {fees.filter(f => f.segment === 'Corporate').length}
              </p>
            </div>
            <div className="icon-wrapper bg-warning-50">
              <DollarSign className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search fees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Segment Filter */}
          <select
            value={filterSegment}
            onChange={(e) => setFilterSegment(e.target.value)}
            className="input"
          >
            <option value="all">All Segments</option>
            <option value="Retail">Retail</option>
            <option value="Corporate">Corporate</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Fees Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Fee Code</th>
                <th>Fee Name (EN)</th>
                <th>Fee Name (AR)</th>
                <th>Segment</th>
                <th>Max Amount</th>
                <th>Matching %</th>
                <th>Satisfaction</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFees.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-neutral-500">
                    No fees found
                  </td>
                </tr>
              ) : (
                filteredFees.map((fee) => (
                  <tr key={fee.fee_id}>
                    <td>
                      <span className="font-mono text-sm">{fee.fee_code}</span>
                    </td>
                    <td>
                      <div className="font-medium text-neutral-900">{fee.fee_name_en}</div>
                    </td>
                    <td>
                      <div className="text-right font-medium text-neutral-700">{fee.fee_name_ar}</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        fee.segment === 'Retail' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {fee.segment}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold">{formatCurrency(fee.max_amount)}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-neutral-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getStatusColor(fee.matching_percentage)}`}
                            style={{ width: `${fee.matching_percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {formatPercentage(fee.matching_percentage)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={fee.satisfaction_status} />
                    </td>
                    <td>
                      <span className={`badge ${
                        fee.status === 'Active' ? 'badge-success' :
                        fee.status === 'Inactive' ? 'badge-neutral' : 'badge-warning'
                      }`}>
                        {fee.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="btn-icon" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="btn-icon" title="Edit">
                          <Edit2 className="w-4 h-4" />
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

      {/* Summary Footer */}
      <div className="card bg-neutral-50">
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Showing <span className="font-semibold">{filteredFees.length}</span> of{' '}
            <span className="font-semibold">{fees.length}</span> fees
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-neutral-600">
              Avg Matching: <span className="font-semibold">
                {formatPercentage(
                  fees.reduce((sum, f) => sum + (f.matching_percentage || 0), 0) / fees.length || 0
                )}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fees;
