import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { formatCurrency, formatDate, formatPercentage } from '../utils/helpers';

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('fee-performance');
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    period: 'current-month',
    segment: 'all',
    startDate: '',
    endDate: '',
    feeId: '',
    status: 'all'
  });

  const reportTypes = [
    { value: 'fee-performance', label: 'Fee Performance Report' },
    { value: 'exemptions', label: 'Exemptions Analysis Report' },
    { value: 'satisfaction', label: 'Satisfaction Status Report' },
    { value: 'financial', label: 'Financial Impact Report' },
    { value: 'executive-summary', label: 'Executive Summary Report' }
  ];

  const periods = [
    { value: 'current-month', label: 'Current Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'current-quarter', label: 'Current Quarter' },
    { value: 'last-quarter', label: 'Last Quarter' },
    { value: 'ytd', label: 'Year to Date' },
    { value: 'custom', label: 'Custom Range' }
  ];

  useEffect(() => {
    fetchReport();
  }, [reportType, filters.period, filters.segment, filters.status]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { ...filters, type: reportType };
      const response = await api.get('/reports', { params });
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format) => {
    try {
      const response = await api.get(`/reports/export/${format}`, {
        params: { ...filters, type: reportType },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report');
    }
  };

  const renderFeePerformanceReport = () => {
    if (!reportData?.fees) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Fees Monitored</p>
            <p className="text-3xl font-bold text-gray-900">{reportData.summary?.total_fees || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Expected</p>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(reportData.summary?.total_expected || 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Collected + Accrued</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(reportData.summary?.total_actual || 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Overall Match Rate</p>
            <p className="text-3xl font-bold text-purple-600">
              {formatPercentage(reportData.summary?.overall_match_rate || 0)}
            </p>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Fee Performance Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Customers Charged</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collected</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accrued</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Match Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.fees.map((fee) => (
                  <tr key={fee.fee_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {fee.fee_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {fee.segment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {fee.customers_charged || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                      {formatCurrency(fee.expected_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      {formatCurrency(fee.collected_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-yellow-600">
                      {formatCurrency(fee.accrued_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                      <span className={
                        fee.matching_ratio >= 98 ? 'text-green-600' :
                        fee.matching_ratio >= 90 ? 'text-yellow-600' :
                        fee.matching_ratio >= 70 ? 'text-orange-600' :
                        'text-red-600'
                      }>
                        {formatPercentage(fee.matching_ratio || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        fee.status === 'Satisfied' ? 'bg-green-100 text-green-800' :
                        fee.status === 'Pending CEO' ? 'bg-yellow-100 text-yellow-800' :
                        fee.status === 'Eligible' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
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
      </div>
    );
  };

  const renderExemptionsReport = () => {
    if (!reportData?.exemptions) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Exemptions</p>
            <p className="text-3xl font-bold text-gray-900">{reportData.summary?.total_exemptions || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Sector Exemptions</p>
            <p className="text-3xl font-bold text-blue-600">{reportData.summary?.sector_exemptions || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Permanent Exemptions</p>
            <p className="text-3xl font-bold text-green-600">{reportData.summary?.permanent_exemptions || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Temporary Exemptions</p>
            <p className="text-3xl font-bold text-orange-600">{reportData.summary?.temporary_exemptions || 0}</p>
          </div>
        </div>

        {/* Exemptions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Exemptions Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommender</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Impact (QAR)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.exemptions.map((exemption, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {exemption.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {exemption.fee_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        exemption.type === 'sector' ? 'bg-purple-100 text-purple-800' :
                        exemption.type === 'permanent' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {exemption.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {exemption.start_date ? formatDate(exemption.start_date) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {exemption.end_date ? formatDate(exemption.end_date) : 'Permanent'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {exemption.recommender_name || 'System'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                      {formatCurrency(exemption.impact_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        exemption.status === 'Active' ? 'bg-green-100 text-green-800' :
                        exemption.status === 'Expired' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {exemption.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSatisfactionReport = () => {
    if (!reportData?.satisfaction) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Fees</p>
            <p className="text-3xl font-bold text-gray-900">{reportData.summary?.total || 0}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow border-2 border-green-200">
            <p className="text-sm text-green-700 font-medium">Satisfied</p>
            <p className="text-3xl font-bold text-green-600">{reportData.summary?.satisfied || 0}</p>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg shadow border-2 border-yellow-200">
            <p className="text-sm text-yellow-700 font-medium">Pending CEO</p>
            <p className="text-3xl font-bold text-yellow-600">{reportData.summary?.pending_ceo || 0}</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-lg shadow border-2 border-blue-200">
            <p className="text-sm text-blue-700 font-medium">Eligible</p>
            <p className="text-3xl font-bold text-blue-600">{reportData.summary?.eligible || 0}</p>
          </div>
          <div className="bg-red-50 p-6 rounded-lg shadow border-2 border-red-200">
            <p className="text-sm text-red-700 font-medium">Not Satisfied</p>
            <p className="text-3xl font-bold text-red-600">{reportData.summary?.not_satisfied || 0}</p>
          </div>
        </div>

        {/* Satisfaction Details */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Satisfaction Status by Fee</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Match Rate</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Threshold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GM Acks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CEO Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.satisfaction.map((fee) => (
                  <tr key={fee.fee_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {fee.fee_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {fee.segment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                      <span className={
                        fee.matching_ratio >= 98 ? 'text-green-600' :
                        fee.matching_ratio >= 90 ? 'text-yellow-600' :
                        'text-red-600'
                      }>
                        {formatPercentage(fee.matching_ratio || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {formatPercentage(fee.applicable_threshold || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {fee.gm_acknowledgments || 0} / {fee.required_gm_acks || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        fee.ceo_approved ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {fee.ceo_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        fee.final_status === 'Satisfied' ? 'bg-green-100 text-green-800' :
                        fee.final_status === 'Pending CEO' ? 'bg-yellow-100 text-yellow-800' :
                        fee.final_status === 'Eligible' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {fee.final_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderFinancialReport = () => {
    if (!reportData?.financial) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Revenue Expected</p>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(reportData.summary?.total_expected || 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Revenue Realized</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(reportData.summary?.total_realized || 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Revenue Gap</p>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(reportData.summary?.revenue_gap || 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Collection Rate</p>
            <p className="text-3xl font-bold text-purple-600">
              {formatPercentage(reportData.summary?.collection_rate || 0)}
            </p>
          </div>
        </div>

        {/* By Segment */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Financial Impact by Segment</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collected</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accrued</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gap</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collection %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.financial.map((segment) => (
                  <tr key={segment.segment} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {segment.segment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-medium">
                      {formatCurrency(segment.expected || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      {formatCurrency(segment.collected || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-yellow-600">
                      {formatCurrency(segment.accrued || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                      {formatCurrency(segment.gap || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                      <span className={
                        segment.collection_rate >= 98 ? 'text-green-600' :
                        segment.collection_rate >= 90 ? 'text-yellow-600' :
                        'text-red-600'
                      }>
                        {formatPercentage(segment.collection_rate || 0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderExecutiveSummary = () => {
    if (!reportData?.executive) return null;

    return (
      <div className="space-y-6">
        {/* KPI Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow text-white">
            <p className="text-sm opacity-90">Overall Performance Score</p>
            <p className="text-4xl font-bold mt-2">{reportData.executive?.overall_score || 0}%</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow text-white">
            <p className="text-sm opacity-90">Satisfied Fees</p>
            <p className="text-4xl font-bold mt-2">{reportData.executive?.satisfied_count || 0}</p>
            <p className="text-xs mt-1 opacity-75">of {reportData.executive?.total_fees || 0} total</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-lg shadow text-white">
            <p className="text-sm opacity-90">Pending Actions</p>
            <p className="text-4xl font-bold mt-2">{reportData.executive?.pending_actions || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-lg shadow text-white">
            <p className="text-sm opacity-90">Critical Issues</p>
            <p className="text-4xl font-bold mt-2">{reportData.executive?.critical_issues || 0}</p>
          </div>
        </div>

        {/* Key Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Fees</h3>
            <div className="space-y-3">
              {reportData.executive?.top_performers?.map((fee, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="text-sm font-medium text-gray-900">{fee.name}</span>
                  <span className="text-sm font-bold text-green-600">{formatPercentage(fee.rate)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attention Required</h3>
            <div className="space-y-3">
              {reportData.executive?.attention_needed?.map((fee, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <span className="text-sm font-medium text-gray-900">{fee.name}</span>
                  <span className="text-sm font-bold text-red-600">{formatPercentage(fee.rate)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend (Last 6 Months)</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {reportData.executive?.trend?.map((month, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${month.score}%` }}
                ></div>
                <p className="text-xs text-gray-600 mt-2">{month.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CEO Reports</h1>
            <p className="text-gray-600 mt-1">Comprehensive governance and performance reports</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => exportReport('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => exportReport('xlsx')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
              <select
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {periods.map(period => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Segment</label>
              <select
                value={filters.segment}
                onChange={(e) => setFilters({ ...filters, segment: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Segments</option>
                <option value="retail">Retail</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="satisfied">Satisfied</option>
                <option value="pending">Pending CEO</option>
                <option value="eligible">Eligible</option>
                <option value="not-satisfied">Not Satisfied</option>
              </select>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {reportType === 'fee-performance' && renderFeePerformanceReport()}
            {reportType === 'exemptions' && renderExemptionsReport()}
            {reportType === 'satisfaction' && renderSatisfactionReport()}
            {reportType === 'financial' && renderFinancialReport()}
            {reportType === 'executive-summary' && renderExecutiveSummary()}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
