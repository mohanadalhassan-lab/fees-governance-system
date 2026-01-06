import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatPercentage, formatDate, formatNumber, getStatusBadgeConfig } from '../utils/helpers';

export default function GMCorporateDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [pendingAcknowledgments, setPendingAcknowledgments] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [acknowledgmentNote, setAcknowledgmentNote] = useState('');

  useEffect(() => {
    fetchDashboardData();
    fetchPendingAcknowledgments();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboards/gm-corporate');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingAcknowledgments = async () => {
    try {
      const response = await api.get('/gm/acknowledgments/pending?segment=corporate');
      setPendingAcknowledgments(response.data);
    } catch (error) {
      console.error('Error fetching pending acknowledgments:', error);
    }
  };

  const submitAcknowledgment = async () => {
    if (!selectedFee || !acknowledgmentNote.trim()) {
      alert('Please provide acknowledgment notes');
      return;
    }

    try {
      await api.post('/gm/acknowledgments', {
        fee_id: selectedFee.fee_id,
        notes: acknowledgmentNote,
        segment: 'Corporate'
      });

      alert('Acknowledgment submitted successfully');
      setSelectedFee(null);
      setAcknowledgmentNote('');
      fetchPendingAcknowledgments();
      fetchDashboardData();
    } catch (error) {
      console.error('Error submitting acknowledgment:', error);
      alert('Failed to submit acknowledgment');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow-lg p-6 text-white">
          <h1 className="text-3xl font-bold">GM Corporate Banking Dashboard</h1>
          <p className="mt-2 text-purple-100">Corporate Segment Fees Governance & Performance</p>
          <p className="text-sm text-purple-200 mt-1">Welcome, {user?.full_name}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Corporate Fees</p>
            <p className="text-3xl font-bold text-gray-900">{dashboardData?.summary?.total_fees || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Under your supervision</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Overall Performance</p>
            <p className="text-3xl font-bold text-purple-600">
              {formatPercentage(dashboardData?.summary?.overall_performance || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Match rate</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Pending Acknowledgments</p>
            <p className="text-3xl font-bold text-orange-600">{pendingAcknowledgments.length}</p>
            <p className="text-xs text-gray-500 mt-1">Require your action</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-600">Trade Finance Volume</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(dashboardData?.summary?.trade_finance_volume || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total fees</p>
          </div>
        </div>

        {/* Pending Acknowledgments Alert */}
        {pendingAcknowledgments.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg shadow">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-yellow-800">Action Required</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  You have {pendingAcknowledgments.length} corporate fee(s) waiting for your acknowledgment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Corporate Fees by Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-3">Trade Finance Fees</h3>
            <p className="text-2xl font-bold text-blue-600">
              {dashboardData?.categories?.trade_finance?.count || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {formatPercentage(dashboardData?.categories?.trade_finance?.performance || 0)} avg
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-3">Corporate Services</h3>
            <p className="text-2xl font-bold text-purple-600">
              {dashboardData?.categories?.services?.count || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {formatPercentage(dashboardData?.categories?.services?.performance || 0)} avg
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-3">FX & Treasury</h3>
            <p className="text-2xl font-bold text-green-600">
              {dashboardData?.categories?.fx?.count || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {formatPercentage(dashboardData?.categories?.fx?.performance || 0)} avg
            </p>
          </div>
        </div>

        {/* Corporate Fees Performance */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
            <h2 className="text-xl font-bold text-gray-900">All Corporate Fees</h2>
            <p className="text-sm text-gray-600 mt-1">
              Complete list of {dashboardData?.fees?.length || 0} corporate banking fees under your supervision
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Customers</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Collected</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Accrued</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Performance</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">GM Ack</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData?.fees?.map((fee) => (
                  <tr key={fee.fee_id} className="hover:bg-purple-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {fee.fee_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {fee.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatNumber(fee.customers_charged)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(fee.expected_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {formatCurrency(fee.collected_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {formatCurrency(fee.accrued_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        fee.matching_ratio >= 98 ? 'bg-green-100 text-green-800' :
                        fee.matching_ratio >= 90 ? 'bg-yellow-100 text-yellow-800' :
                        fee.matching_ratio >= 80 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {formatPercentage(fee.matching_ratio)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {fee.gm_acknowledged ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Acknowledged
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Not Yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {!fee.gm_acknowledged && fee.matching_ratio >= 98 && (
                        <button
                          onClick={() => setSelectedFee(fee)}
                          className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-xs font-medium"
                        >
                          Acknowledge
                        </button>
                      )}
                      {fee.gm_acknowledged && (
                        <span className="text-xs text-gray-500">Done</span>
                      )}
                      {!fee.gm_acknowledged && fee.matching_ratio < 98 && (
                        <span className="text-xs text-gray-400">Below Threshold</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Exemptions */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-900">Active Exemptions (Corporate)</h2>
            <p className="text-sm text-gray-600 mt-1">Corporate customer exemptions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Impact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData?.exemptions?.map((exemption, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {exemption.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {exemption.fee_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        exemption.type === 'temporary' ? 'bg-orange-100 text-orange-800' :
                        exemption.type === 'permanent' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {exemption.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                      {formatCurrency(exemption.impact_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(exemption.start_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {exemption.end_date ? formatDate(exemption.end_date) : 'Permanent'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {exemption.days_remaining !== null ? (
                        <span className={
                          exemption.days_remaining <= 7 ? 'text-red-600 font-bold' :
                          exemption.days_remaining <= 30 ? 'text-orange-600 font-medium' :
                          'text-gray-600'
                        }>
                          {exemption.days_remaining} days
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-900">Recent Notifications</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {dashboardData?.notifications?.map((notification) => (
              <div key={notification.notification_id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                    notification.is_read ? 'bg-gray-300' : 'bg-purple-600'
                  }`}></div>
                  <div className="ml-4 flex-1">
                    <p className={`text-sm ${notification.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(notification.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Acknowledgment Modal */}
      {selectedFee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-8 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Submit Acknowledgment</h3>
              <p className="text-gray-600 mt-2">Fee: <span className="font-medium">{selectedFee.fee_name}</span></p>
              <p className="text-gray-600">Match Rate: <StatusBadge value={selectedFee.matching_ratio} /></p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GM Notes (Required) *
              </label>
              <textarea
                value={acknowledgmentNote}
                onChange={(e) => setAcknowledgmentNote(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Provide your acknowledgment notes and any relevant observations..."
              />
              <p className="text-xs text-gray-500 mt-2">
                Your notes will be reviewed by the CEO as part of the satisfaction approval process.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedFee(null);
                  setAcknowledgmentNote('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitAcknowledgment}
                disabled={!acknowledgmentNote.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Submit Acknowledgment
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
