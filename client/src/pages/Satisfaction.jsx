import React, { useState, useEffect } from 'react';
import { Smile, Meh, Frown, TrendingUp, TrendingDown, Filter, Download, Calendar } from 'lucide-react';
import api from '../utils/api';
import { formatPercentage, getStatusColor } from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';

const Satisfaction = () => {
  const [satisfactionData, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterSegment, setFilterSegment] = useState('all');

  useEffect(() => {
    fetchSatisfactionData();
  }, [filterPeriod, filterSegment]);

  const fetchSatisfactionData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterPeriod !== 'all') params.append('period', filterPeriod);
      if (filterSegment !== 'all') params.append('segment', filterSegment);
      
      const response = await api.get(`/satisfaction?${params.toString()}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching satisfaction data:', error);
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

  const { summary, by_fee, trends, by_segment } = satisfactionData || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Satisfaction Dashboard</h1>
          <p className="page-subtitle">Monitor fee satisfaction levels and trends</p>
        </div>
        <button className="btn btn-primary">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="input"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>

          <select
            value={filterSegment}
            onChange={(e) => setFilterSegment(e.target.value)}
            className="input"
          >
            <option value="all">All Segments</option>
            <option value="Retail">Retail</option>
            <option value="Corporate">Corporate</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Green (Excellent)</p>
              <p className="text-2xl font-semibold text-success-600 mt-1">
                {summary?.green || 0}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {formatPercentage(((summary?.green || 0) / (summary?.total || 1)) * 100)}
              </p>
            </div>
            <div className="icon-wrapper bg-success-50">
              <Smile className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Yellow (Good)</p>
              <p className="text-2xl font-semibold text-warning-600 mt-1">
                {summary?.yellow || 0}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {formatPercentage(((summary?.yellow || 0) / (summary?.total || 1)) * 100)}
              </p>
            </div>
            <div className="icon-wrapper bg-warning-50">
              <Meh className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Orange (Fair)</p>
              <p className="text-2xl font-semibold text-orange-600 mt-1">
                {summary?.orange || 0}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {formatPercentage(((summary?.orange || 0) / (summary?.total || 1)) * 100)}
              </p>
            </div>
            <div className="icon-wrapper bg-orange-50">
              <Meh className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Red (Poor)</p>
              <p className="text-2xl font-semibold text-danger-600 mt-1">
                {summary?.red || 0}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {formatPercentage(((summary?.red || 0) / (summary?.total || 1)) * 100)}
              </p>
            </div>
            <div className="icon-wrapper bg-danger-50">
              <Frown className="w-6 h-6 text-danger-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Overall Satisfaction Score */}
      <div className="card bg-gradient-to-r from-primary-50 to-primary-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary-900">Overall Satisfaction Score</h3>
            <p className="text-sm text-primary-700 mt-1">
              Weighted average across all fees and segments
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-primary-600">
              {formatPercentage(summary?.overall_score || 0)}
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
              {summary?.trend === 'up' ? (
                <>
                  <TrendingUp className="w-5 h-5 text-success-600" />
                  <span className="text-sm font-medium text-success-600">+{summary?.change || 0}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-5 h-5 text-danger-600" />
                  <span className="text-sm font-medium text-danger-600">-{summary?.change || 0}%</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Satisfaction by Segment */}
      {by_segment && by_segment.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {by_segment.map((segment) => (
            <div key={segment.segment} className="card">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                {segment.segment} Segment
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Satisfaction Score</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {formatPercentage(segment.avg_score)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-success-600">● Green</span>
                    <span className="font-medium">{segment.green}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-warning-600">● Yellow</span>
                    <span className="font-medium">{segment.yellow}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-orange-600">● Orange</span>
                    <span className="font-medium">{segment.orange}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-danger-600">● Red</span>
                    <span className="font-medium">{segment.red}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Satisfaction by Fee */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Satisfaction by Fee</h3>
          <span className="text-sm text-neutral-500">
            {by_fee?.length || 0} fees tracked
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Fee Name</th>
                <th>Segment</th>
                <th>Matching %</th>
                <th>Status</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {by_fee && by_fee.length > 0 ? (
                by_fee.map((fee) => (
                  <tr key={fee.fee_id}>
                    <td>
                      <div className="font-medium text-neutral-900">{fee.fee_name}</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        fee.segment === 'Retail' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {fee.segment}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-neutral-100 rounded-full h-2 w-24">
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
                      {fee.trend === 'up' ? (
                        <TrendingUp className="w-5 h-5 text-success-600" />
                      ) : fee.trend === 'down' ? (
                        <TrendingDown className="w-5 h-5 text-danger-600" />
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-neutral-500">
                    No satisfaction data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="card bg-info-50 border border-info-200">
        <h3 className="font-semibold text-info-900 mb-3">Key Insights</h3>
        <ul className="space-y-2 text-sm text-info-800">
          <li className="flex items-start gap-2">
            <span className="text-info-600 mt-0.5">•</span>
            <span>
              <strong>{formatPercentage(((summary?.green || 0) / (summary?.total || 1)) * 100)}</strong> of fees 
              are in the Green zone (excellent satisfaction)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-info-600 mt-0.5">•</span>
            <span>
              <strong>{summary?.red || 0}</strong> fees require immediate attention (Red status)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-info-600 mt-0.5">•</span>
            <span>
              Overall satisfaction is <strong>{summary?.trend === 'up' ? 'improving' : 'declining'}</strong> 
              {' '}by <strong>{summary?.change || 0}%</strong> compared to previous period
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Satisfaction;
