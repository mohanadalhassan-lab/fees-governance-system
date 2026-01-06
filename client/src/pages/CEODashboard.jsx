import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2, 
  Clock, Users, FileText, ArrowUp, ArrowDown, DollarSign, Filter 
} from 'lucide-react';
import api from '../utils/api';
import { formatCurrency, formatPercentage, formatNumber, getStatusColor } from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';

const CEODashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [segmentFilter, setSegmentFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboards/ceo');
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const {
    global_threshold,
    satisfaction_counts,
    exemptions_summary,
    all_fees,
    segment_breakdown,
    category_performance,
    top_fees_by_value,
    worst_matching_ratios,
    pending_approvals
  } = dashboard || {};

  // Filter fees based on selected filters
  const filteredFees = all_fees?.filter(fee => {
    if (segmentFilter !== 'All' && fee.segment !== segmentFilter) return false;
    if (categoryFilter !== 'All' && fee.category !== categoryFilter) return false;
    return true;
  }) || [];

  // Get unique categories for filter
  const categories = ['All', ...new Set(all_fees?.map(f => f.category) || [])];
  const segments = ['All', 'Retail', 'Corporate'];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Executive Overview</h1>
        <p className="page-subtitle">
          Real-time fees governance and satisfaction monitoring
        </p>
      </div>

      {/* Global Threshold Alert */}
      {global_threshold && (
        <div className="executive-card bg-primary-50 border-primary-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-primary-900 mb-1">
                Global Satisfaction Threshold
              </h3>
              <p className="text-sm text-primary-700 mb-2">
                Set for year {global_threshold.threshold_year} by {global_threshold.set_by_name}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary-900">
                  {formatPercentage(global_threshold.threshold_percentage, 0)}
                </span>
                <span className="text-sm text-primary-700">minimum matching ratio</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Satisfaction State Metrics */}
      <div className="metric-grid">
        <div className="executive-stat border-l-4 border-danger">
          <div className="stat-label">Not Satisfied</div>
          <div className="stat-value text-danger">{formatNumber(satisfaction_counts.NOT_SATISFIED)}</div>
          <div className="flex items-center gap-2 mt-2">
            <AlertCircle className="w-4 h-4 text-danger" />
            <span className="text-sm text-executive-steel">Requires Action</span>
          </div>
        </div>

        <div className="executive-stat border-l-4 border-warning">
          <div className="stat-label">Conditionally Eligible</div>
          <div className="stat-value text-warning">{formatNumber(satisfaction_counts.CONDITIONALLY_ELIGIBLE)}</div>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-sm text-executive-steel">Awaiting GM Notes</span>
          </div>
        </div>

        <div className="executive-stat border-l-4 border-info">
          <div className="stat-label">Pending CEO Approval</div>
          <div className="stat-value text-info">{formatNumber(satisfaction_counts.PENDING_CEO_APPROVAL)}</div>
          <div className="flex items-center gap-2 mt-2">
            <FileText className="w-4 h-4 text-info" />
            <span className="text-sm text-executive-steel">Ready for Review</span>
          </div>
        </div>

        <div className="executive-stat border-l-4 border-success">
          <div className="stat-label">Satisfied</div>
          <div className="stat-value text-success">{formatNumber(satisfaction_counts.SATISFIED)}</div>
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-sm text-executive-steel">Approved</span>
          </div>
        </div>
      </div>

      {/* Exemptions Summary */}
      <div className="executive-card">
        <h2 className="section-title">Customer Exemptions Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-executive-cream rounded-lg">
            <div className="text-3xl font-bold text-executive-navy mb-1">
              {formatNumber(exemptions_summary.total_exempted)}
            </div>
            <div className="text-sm text-executive-steel">Total Exempted</div>
            <div className="text-xs text-executive-muted mt-1">
              of {formatNumber(exemptions_summary.total_customers)} customers
            </div>
          </div>
          
          <div className="text-center p-4 bg-info-light rounded-lg">
            <div className="text-2xl font-bold text-info-dark mb-1">
              {formatNumber(exemptions_summary.sector_exempted)}
            </div>
            <div className="text-sm text-info-dark font-medium">Sector-Based</div>
          </div>
          
          <div className="text-center p-4 bg-warning-light rounded-lg">
            <div className="text-2xl font-bold text-warning-dark mb-1">
              {formatNumber(exemptions_summary.permanent_exempted)}
            </div>
            <div className="text-sm text-warning-dark font-medium">Permanent</div>
          </div>
          
          <div className="text-center p-4 bg-danger-light rounded-lg">
            <div className="text-2xl font-bold text-danger-dark mb-1">
              {formatNumber(exemptions_summary.temporary_exempted)}
            </div>
            <div className="text-sm text-danger-dark font-medium">Temporary</div>
          </div>
        </div>
      </div>

      {/* Segment Breakdown */}
      {segment_breakdown && segment_breakdown.length > 0 && (
        <div className="executive-card">
          <h2 className="section-title">Segment Performance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {segment_breakdown.map((segment) => (
              <div key={segment.segment} className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-executive-navy mb-4">{segment.segment} Banking</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-executive-steel">Total Fees</p>
                    <p className="text-2xl font-bold text-executive-navy">{formatNumber(segment.total_fees)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-executive-steel">Customers</p>
                    <p className="text-2xl font-bold text-executive-navy">{formatNumber(segment.total_customers)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-executive-steel">Expected Amount</p>
                    <p className="text-lg font-semibold text-executive-navy">{formatCurrency(segment.expected_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-executive-steel">Performance</p>
                    <p className={`text-lg font-semibold ${
                      segment.avg_matching_ratio >= (global_threshold?.threshold_percentage || 98) 
                        ? 'text-success' 
                        : 'text-warning'
                    }`}>
                      {formatPercentage(segment.avg_matching_ratio, 1)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Fees Table */}
      {all_fees && all_fees.length > 0 && (
        <div className="content-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">All Fees ({formatNumber(filteredFees.length)})</h2>
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select 
                  value={segmentFilter}
                  onChange={(e) => setSegmentFilter(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                >
                  {segments.map(seg => (
                    <option key={seg} value={seg}>{seg}</option>
                  ))}
                </select>
              </div>
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="executive-table">
              <thead>
                <tr>
                  <th>Fee Name</th>
                  <th>Segment</th>
                  <th>Category</th>
                  <th>Customers</th>
                  <th>Expected</th>
                  <th>Collected + Accrued</th>
                  <th>Performance</th>
                  <th>GM Acks</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.map((fee) => (
                  <tr key={fee.fee_id}>
                    <td className="font-medium">{fee.fee_name}</td>
                    <td>{fee.segment}</td>
                    <td className="text-sm">{fee.category}</td>
                    <td className="text-right">{formatNumber(fee.total_customers)}</td>
                    <td className="text-right">{formatCurrency(fee.expected_amount)}</td>
                    <td className="text-right">{formatCurrency(fee.collected_amount + fee.accrued_amount)}</td>
                    <td className="text-right">
                      <span className={`badge-${
                        fee.matching_ratio >= (global_threshold?.threshold_percentage || 98) ? 'success' : 
                        fee.matching_ratio >= 90 ? 'warning' : 'danger'
                      }`}>
                        {formatPercentage(fee.matching_ratio, 2)}
                      </span>
                    </td>
                    <td className="text-center">
                      {fee.gm_acknowledgments > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-success-light text-success-dark rounded-full text-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          {fee.gm_acknowledgments} GM(s)
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">None</span>
                      )}
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        fee.status === 'Active' ? 'bg-success-light text-success-dark' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {fee.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Fees by Value */}
        <div className="content-section">
          <h2 className="section-title">Top Fees by Expected Value</h2>
          <div className="space-y-3">
            {top_fees_by_value?.slice(0, 5).map((fee, index) => (
              <div key={fee.fee_id} className="flex items-center gap-4 p-3 bg-executive-cream rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-executive-navy truncate">{fee.fee_name}</p>
                  <p className="text-sm text-executive-steel">{fee.segment} • {fee.category}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-executive-navy">
                    {formatCurrency(fee.expected_amount)}
                  </p>
                  <p className={`text-sm badge-${getStatusColor(fee.satisfaction_state)} mt-1`}>
                    {formatPercentage(fee.matching_ratio, 1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worst Matching Ratios */}
        <div className="content-section">
          <h2 className="section-title">Fees Requiring Attention</h2>
          <div className="space-y-3">
            {worst_matching_ratios?.slice(0, 5).map((fee) => (
              <div key={fee.fee_id} className="flex items-center gap-4 p-3 bg-danger-light/30 rounded-lg border border-danger-light">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-8 h-8 text-danger" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-executive-navy truncate">{fee.fee_name}</p>
                  <p className="text-sm text-executive-steel">{fee.segment} • {fee.category}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <TrendingDown className="w-4 h-4 text-danger" />
                    <span className="font-bold text-danger text-lg">
                      {formatPercentage(fee.matching_ratio, 1)}
                    </span>
                  </div>
                  <p className="text-xs text-executive-steel mt-1">
                    {formatCurrency(fee.collected_amount + fee.accrued_amount)} / {formatCurrency(fee.expected_amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending CEO Approvals */}
      {pending_approvals && pending_approvals.length > 0 && (
        <div className="content-section border-l-4 border-info">
          <h2 className="section-title flex items-center gap-2">
            <Clock className="w-5 h-5 text-info" />
            Pending Your Approval
          </h2>
          <div className="overflow-x-auto">
            <table className="executive-table">
              <thead>
                <tr>
                  <th>Fee Name</th>
                  <th>Segment</th>
                  <th>Matching Ratio</th>
                  <th>GM Acknowledgments</th>
                  <th>State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending_approvals.map((fee) => (
                  <tr key={fee.fee_id}>
                    <td className="font-medium">{fee.fee_name}</td>
                    <td>{fee.segment}</td>
                    <td>
                      <span className={`badge-${fee.matching_ratio >= (global_threshold?.threshold_percentage || 98) ? 'success' : 'warning'}`}>
                        {formatPercentage(fee.matching_ratio, 2)}
                      </span>
                    </td>
                    <td>{fee.acknowledged_gms} GM(s)</td>
                    <td>
                      <StatusBadge status={fee.satisfaction_state} />
                    </td>
                    <td>
                      <button className="btn-primary text-sm py-1 px-3">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CEODashboard;
