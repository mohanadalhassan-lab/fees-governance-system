import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import api from '../utils/api';

const GMRiskDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('ANNUAL');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedPeriod) params.append('period', selectedPeriod);

      const response = await api.get(`/dashboards/gm-risk?${params}`);
      setDashboardData(response.data);
    } catch (err) {
      setError('Failed to load risk dashboard data');
      console.error('Error fetching risk dashboard:', err);
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

  const getRiskLevelColor = (level) => {
    const colors = {
      'CRITICAL': 'text-red-700 bg-red-100',
      'HIGH': 'text-orange-700 bg-orange-100',
      'MEDIUM': 'text-yellow-700 bg-yellow-100',
      'LOW': 'text-green-700 bg-green-100'
    };
    return colors[level] || 'text-gray-700 bg-gray-100';
  };

  if (loading) {
    return (
      <DashboardLayout title="GM Risk Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading risk data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="GM Risk Dashboard">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  const { summary, worstMatchingFees, exceptionPatterns, thresholdExceptions, riskTrends } = dashboardData || {};

  return (
    <DashboardLayout title="GM Risk Dashboard - Risk Monitoring & Analysis">
      {/* Period Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Period</label>
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

      {/* Risk Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Critical Risk Fees</h3>
          <p className="text-3xl font-bold text-red-600">
            {summary?.criticalRiskFees || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Matching ratio &lt; 85%</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">High Risk Fees</h3>
          <p className="text-3xl font-bold text-orange-600">
            {summary?.highRiskFees || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Matching ratio 85-94%</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Threshold Exceptions</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {summary?.thresholdExceptions || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Below global threshold</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Risk Exposure</h3>
          <p className="text-3xl font-bold text-blue-600">
            {formatCurrency(summary?.totalRiskExposure || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Uncollected revenue</p>
        </div>
      </div>

      {/* Worst Matching Ratio Fees */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Fees with Worst Matching Ratios</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Segment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Matching Ratio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected vs Realized
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue Impact
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {worstMatchingFees && worstMatchingFees.length > 0 ? (
                worstMatchingFees.map((fee, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{fee.feeName}</div>
                      <div className="text-xs text-gray-500">{fee.feeCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {fee.segment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-bold ${
                        fee.matchingRatio < 85 ? 'text-red-600' :
                        fee.matchingRatio < 95 ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                        {formatPercentage(fee.matchingRatio)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-gray-700">{formatCurrency(fee.expectedAmount)}</div>
                      <div className="text-green-600">{formatCurrency(fee.realizedAmount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(fee.riskLevel)}`}>
                        {fee.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      {formatCurrency(fee.revenueImpact)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exception Patterns Analysis */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Exception Pattern Detection</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exceptionPatterns && exceptionPatterns.length > 0 ? (
            exceptionPatterns.map((pattern, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">{pattern.patternType}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(pattern.severity)}`}>
                    {pattern.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{pattern.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Occurrences:</span>
                    <span className="font-semibold text-gray-900">{pattern.occurrences}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Affected Fees:</span>
                    <span className="font-semibold text-gray-900">{pattern.affectedFees}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Financial Impact:</span>
                    <span className="font-semibold text-red-600">{formatCurrency(pattern.financialImpact)}</span>
                  </div>
                </div>
                {pattern.recommendation && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold">Recommendation:</span> {pattern.recommendation}
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center text-gray-500 py-8">
              No exception patterns detected
            </div>
          )}
        </div>
      </div>

      {/* Threshold Exceptions Detail */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Threshold Exception Details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Ratio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Threshold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gap
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action Required
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {thresholdExceptions && thresholdExceptions.length > 0 ? (
                thresholdExceptions.map((exception, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{exception.feeName}</div>
                      <div className="text-xs text-gray-500">{exception.feeCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-red-600">
                        {formatPercentage(exception.currentRatio)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(exception.thresholdValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-red-600">
                        -{formatPercentage(exception.gap)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {exception.trend === 'IMPROVING' ? (
                          <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : exception.trend === 'DECLINING' ? (
                          <svg className="w-4 h-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className={`text-xs ${
                          exception.trend === 'IMPROVING' ? 'text-green-600' :
                          exception.trend === 'DECLINING' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {exception.trend}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-700">
                      {exception.actionRequired}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No threshold exceptions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Trends */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Risk Trend Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {riskTrends?.avgMatchingRatio ? formatPercentage(riskTrends.avgMatchingRatio) : 'N/A'}
            </div>
            <div className="text-xs text-gray-500">Avg Matching Ratio</div>
            <div className={`text-xs mt-1 ${
              riskTrends?.matchingRatioTrend === 'UP' ? 'text-green-600' : 'text-red-600'
            }`}>
              {riskTrends?.matchingRatioTrend === 'UP' ? '↑ Improving' : '↓ Declining'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {riskTrends?.totalExceptions || 0}
            </div>
            <div className="text-xs text-gray-500">Total Exceptions</div>
            <div className={`text-xs mt-1 ${
              riskTrends?.exceptionsTrend === 'DOWN' ? 'text-green-600' : 'text-red-600'
            }`}>
              {riskTrends?.exceptionsTrend === 'DOWN' ? '↓ Decreasing' : '↑ Increasing'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(riskTrends?.totalRiskExposure || 0)}
            </div>
            <div className="text-xs text-gray-500">Risk Exposure</div>
            <div className={`text-xs mt-1 ${
              riskTrends?.exposureTrend === 'DOWN' ? 'text-green-600' : 'text-red-600'
            }`}>
              {riskTrends?.exposureTrend === 'DOWN' ? '↓ Reducing' : '↑ Growing'}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {riskTrends?.feesAtRisk || 0}
            </div>
            <div className="text-xs text-gray-500">Fees at Risk</div>
            <div className={`text-xs mt-1 ${
              riskTrends?.feesAtRiskTrend === 'DOWN' ? 'text-green-600' : 'text-red-600'
            }`}>
              {riskTrends?.feesAtRiskTrend === 'DOWN' ? '↓ Improving' : '↑ Worsening'}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GMRiskDashboard;
