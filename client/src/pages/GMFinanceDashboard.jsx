import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import api from '../utils/api';

const GMFinanceDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('ANNUAL');
  const [selectedSegment, setSelectedSegment] = useState('ALL');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, selectedSegment]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedPeriod) params.append('period', selectedPeriod);
      if (selectedSegment !== 'ALL') params.append('segment', selectedSegment);

      const response = await api.get(`/dashboards/gm-finance?${params}`);
      setDashboardData(response.data);
    } catch (err) {
      setError('Failed to load finance dashboard data');
      console.error('Error fetching finance dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-QA', {
      style: 'currency',
      currency: 'QAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${parseFloat(value).toFixed(2)}%`;
  };

  if (loading) {
    return (
      <DashboardLayout title="GM Finance Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading finance data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="GM Finance Dashboard">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  const { summary, revenueAnalysis, collectionRates, gapAnalysis, topRevenueFees, worstCollectionFees } = dashboardData || {};

  return (
    <DashboardLayout title="GM Finance Dashboard - Financial Analysis">
      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUAL">Annual</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Segment</label>
          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Segments</option>
            <option value="RETAIL">Retail Banking</option>
            <option value="CORPORATE">Corporate Banking</option>
          </select>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Expected Revenue</h3>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary?.totalExpectedRevenue || 0)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Realized Revenue</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(summary?.totalRealizedRevenue || 0)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Revenue Gap</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(summary?.revenueGap || 0)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Overall Collection Rate</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatPercentage(summary?.overallCollectionRate || 0)}
          </p>
        </div>
      </div>

      {/* Revenue Analysis by Segment */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Revenue Analysis by Segment</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Segment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Realized Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gap
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Achievement %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {revenueAnalysis && revenueAnalysis.length > 0 ? (
                revenueAnalysis.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {item.segment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {formatCurrency(item.expectedRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600">
                      {formatCurrency(item.realizedRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-red-600">
                      {formatCurrency(item.gap)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-semibold ${
                        item.achievementPercentage >= 95 ? 'text-green-600' :
                        item.achievementPercentage >= 85 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {formatPercentage(item.achievementPercentage)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No revenue analysis data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collection Rates by Category */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Collection Rates by Category</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Fees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accrued
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collection Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {collectionRates && collectionRates.length > 0 ? (
                collectionRates.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {item.totalFees}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600">
                      {formatCurrency(item.collectedAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-blue-600">
                      {formatCurrency(item.accruedAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-semibold ${
                        item.collectionRate >= 90 ? 'text-green-600' :
                        item.collectionRate >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {formatPercentage(item.collectionRate)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No collection rate data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-column layout for Top/Worst Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Top Revenue Fees */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Top 10 Revenue Generating Fees</h2>
          <div className="space-y-3">
            {topRevenueFees && topRevenueFees.length > 0 ? (
              topRevenueFees.map((fee, index) => (
                <div key={index} className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{fee.feeName}</p>
                    <p className="text-xs text-gray-500">{fee.feeCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      {formatCurrency(fee.totalRevenue)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatPercentage(fee.contributionPercentage)} of total
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">No data available</p>
            )}
          </div>
        </div>

        {/* Worst Collection Fees */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Fees with Lowest Collection Rates</h2>
          <div className="space-y-3">
            {worstCollectionFees && worstCollectionFees.length > 0 ? (
              worstCollectionFees.map((fee, index) => (
                <div key={index} className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{fee.feeName}</p>
                    <p className="text-xs text-gray-500">{fee.feeCode}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      fee.collectionRate < 70 ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {formatPercentage(fee.collectionRate)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Gap: {formatCurrency(fee.revenueGap)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Gap Analysis & Exemptions Impact */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Revenue Gap Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-r border-gray-200 pr-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Exemptions Impact</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Sector Exemptions:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(gapAnalysis?.sectorExemptionsRevenueLoss || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Permanent Exemptions:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(gapAnalysis?.permanentExemptionsRevenueLoss || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Temporary Exemptions:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(gapAnalysis?.temporaryExemptionsRevenueLoss || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-r border-gray-200 pr-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Collection Issues</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Uncollected Amount:</span>
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(gapAnalysis?.uncollectedAmount || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Accrued Not Realized:</span>
                <span className="text-sm font-semibold text-yellow-600">
                  {formatCurrency(gapAnalysis?.accruedNotRealized || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Settlement Delays:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(gapAnalysis?.settlementDelays || 0)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Total Gap Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Expected:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(gapAnalysis?.totalExpected || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Realized:</span>
                <span className="text-sm font-semibold text-green-600">
                  {formatCurrency(gapAnalysis?.totalRealized || 0)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-900">Total Gap:</span>
                <span className="text-sm font-bold text-red-600">
                  {formatCurrency(gapAnalysis?.totalGap || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GMFinanceDashboard;
