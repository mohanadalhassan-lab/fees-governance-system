import React, { useState, useEffect } from 'react';
import { Search, Filter, Shield, CheckCircle2, XCircle, Clock, Eye, FileText, Download } from 'lucide-react';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/helpers';

const Exemptions = () => {
  const [exemptions, setExemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchExemptions();
  }, []);

  const fetchExemptions = async () => {
    try {
      const response = await api.get('/exemptions');
      setExemptions(response.data);
    } catch (error) {
      console.error('Error fetching exemptions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter exemptions
  const filteredExemptions = exemptions.filter(ex => {
    const matchesSearch = 
      ex.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.fee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.exemption_id?.toString().includes(searchTerm);
    
    const matchesType = filterType === 'all' || ex.exemption_type === filterType;
    const matchesStatus = filterStatus === 'all' || ex.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: exemptions.length,
    approved: exemptions.filter(e => e.status === 'Approved').length,
    pending: exemptions.filter(e => e.status === 'Pending').length,
    rejected: exemptions.filter(e => e.status === 'Rejected').length,
    permanent: exemptions.filter(e => e.exemption_type === 'Permanent').length,
    temporary: exemptions.filter(e => e.exemption_type === 'Temporary').length,
    sector: exemptions.filter(e => e.exemption_type === 'Sector-Based').length,
  };

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
          <h1 className="page-title">Exemptions Management</h1>
          <p className="page-subtitle">Review and manage fee exemptions</p>
        </div>
        <button className="btn btn-primary">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Total Exemptions</p>
              <p className="text-2xl font-semibold text-neutral-900 mt-1">{stats.total}</p>
            </div>
            <div className="icon-wrapper bg-primary-50">
              <Shield className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Approved</p>
              <p className="text-2xl font-semibold text-success-600 mt-1">{stats.approved}</p>
            </div>
            <div className="icon-wrapper bg-success-50">
              <CheckCircle2 className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Pending</p>
              <p className="text-2xl font-semibold text-warning-600 mt-1">{stats.pending}</p>
            </div>
            <div className="icon-wrapper bg-warning-50">
              <Clock className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Rejected</p>
              <p className="text-2xl font-semibold text-danger-600 mt-1">{stats.rejected}</p>
            </div>
            <div className="icon-wrapper bg-danger-50">
              <XCircle className="w-6 h-6 text-danger-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Permanent</p>
              <p className="text-xl font-semibold text-neutral-900 mt-1">{stats.permanent}</p>
            </div>
            <span className="badge badge-info">Type</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Temporary</p>
              <p className="text-xl font-semibold text-neutral-900 mt-1">{stats.temporary}</p>
            </div>
            <span className="badge badge-warning">Type</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Sector-Based</p>
              <p className="text-xl font-semibold text-neutral-900 mt-1">{stats.sector}</p>
            </div>
            <span className="badge badge-primary">Type</span>
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
              placeholder="Search exemptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input"
          >
            <option value="all">All Types</option>
            <option value="Permanent">Permanent</option>
            <option value="Temporary">Temporary</option>
            <option value="Sector-Based">Sector-Based</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="all">All Status</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Exemptions Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Fee</th>
                <th>Type</th>
                <th>Requested Date</th>
                <th>Valid Until</th>
                <th>Approved By</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExemptions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-neutral-500">
                    No exemptions found
                  </td>
                </tr>
              ) : (
                filteredExemptions.map((exemption) => (
                  <tr key={exemption.exemption_id}>
                    <td>
                      <span className="font-mono text-sm">#{exemption.exemption_id}</span>
                    </td>
                    <td>
                      <div>
                        <div className="font-medium text-neutral-900">{exemption.customer_name}</div>
                        <div className="text-sm text-neutral-500">ID: {exemption.customer_id}</div>
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-neutral-700">{exemption.fee_name}</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        exemption.exemption_type === 'Permanent' ? 'badge-info' :
                        exemption.exemption_type === 'Temporary' ? 'badge-warning' : 'badge-primary'
                      }`}>
                        {exemption.exemption_type}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm">{formatDate(exemption.requested_date)}</span>
                    </td>
                    <td>
                      {exemption.valid_until ? (
                        <span className="text-sm">{formatDate(exemption.valid_until)}</span>
                      ) : (
                        <span className="text-sm text-neutral-400">N/A</span>
                      )}
                    </td>
                    <td>
                      {exemption.approved_by_name ? (
                        <div className="text-sm">{exemption.approved_by_name}</div>
                      ) : (
                        <span className="text-sm text-neutral-400">Pending</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        exemption.status === 'Approved' ? 'badge-success' :
                        exemption.status === 'Pending' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {exemption.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="btn-icon" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="btn-icon" title="View Documents">
                          <FileText className="w-4 h-4" />
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
            Showing <span className="font-semibold">{filteredExemptions.length}</span> of{' '}
            <span className="font-semibold">{exemptions.length}</span> exemptions
          </p>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-neutral-600">
              Approval Rate:{' '}
              <span className="font-semibold text-success-600">
                {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
              </span>
            </span>
            <span className="text-neutral-600">
              Pending Review:{' '}
              <span className="font-semibold text-warning-600">{stats.pending}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exemptions;
