import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import api from '../utils/api';

const GMComplianceDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('ANNUAL');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedPeriod) params.append('period', selectedPeriod);

      const response = await api.get(`/dashboards/gm-compliance?${params}`);
      setDashboardData(response.data);
    } catch (err) {
      setError('Failed to load compliance dashboard data');
      console.error('Error fetching compliance dashboard:', err);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-QA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getComplianceStatusColor = (status) => {
    const colors = {
      'COMPLIANT': 'text-green-700 bg-green-100',
      'PARTIAL': 'text-yellow-700 bg-yellow-100',
      'NON_COMPLIANT': 'text-red-700 bg-red-100',
      'UNDER_REVIEW': 'text-blue-700 bg-blue-100'
    };
    return colors[status] || 'text-gray-700 bg-gray-100';
  };

  if (loading) {
    return (
      <DashboardLayout title="GM Compliance Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading compliance data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="GM Compliance Dashboard">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  const { summary, policyCompliance, exemptionsAudit, regulatoryMetrics, auditTrail, recentActivities } = dashboardData || {};

  return (
    <DashboardLayout title="GM Compliance Dashboard - Compliance & Audit Oversight">
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

      {/* Compliance Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Overall Compliance</h3>
          <p className="text-3xl font-bold text-green-600">
            {formatPercentage(summary?.overallComplianceRate || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Policies & Regulations</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Audit Items</h3>
          <p className="text-3xl font-bold text-blue-600">
            {summary?.totalAuditItems || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">{summary?.pendingAuditItems || 0} pending review</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Exemptions Reviewed</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {summary?.totalExemptionsReviewed || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">{summary?.exemptionsThisPeriod || 0} this period</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Policy Violations</h3>
          <p className="text-3xl font-bold text-purple-600">
            {summary?.policyViolations || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">{summary?.resolvedViolations || 0} resolved</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Policy Compliance
            </button>
            <button
              onClick={() => setActiveTab('exemptions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'exemptions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Exemptions Audit
            </button>
            <button
              onClick={() => setActiveTab('regulatory')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'regulatory'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Regulatory Reports
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'audit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Audit Trail
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Policy Compliance Status</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Policy Area
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Requirements
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Compliant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Compliance Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Review
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {policyCompliance && policyCompliance.length > 0 ? (
                      policyCompliance.map((policy, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{policy.policyArea}</div>
                            <div className="text-xs text-gray-500">{policy.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {policy.totalRequirements}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            {policy.compliantCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-semibold ${
                              policy.complianceRate >= 95 ? 'text-green-600' :
                              policy.complianceRate >= 80 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {formatPercentage(policy.complianceRate)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getComplianceStatusColor(policy.status)}`}>
                              {policy.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(policy.lastReviewDate)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                          No policy compliance data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'exemptions' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Exemptions Audit Review</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Exemption Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer/Sector
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fee Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Justification
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Approved By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue Impact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Audit Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exemptionsAudit && exemptionsAudit.length > 0 ? (
                      exemptionsAudit.map((exemption, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">{exemption.exemptionType}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{exemption.entityName}</div>
                            <div className="text-xs text-gray-500">{exemption.entityCode}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{exemption.feeName}</div>
                            <div className="text-xs text-gray-500">{exemption.feeCode}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs text-gray-700 max-w-xs">{exemption.justification}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {exemption.approvedBy}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                            {formatCurrency(exemption.revenueImpact)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getComplianceStatusColor(exemption.auditStatus)}`}>
                              {exemption.auditStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                          No exemptions audit data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'regulatory' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Regulatory Metrics & Reports</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {regulatoryMetrics && regulatoryMetrics.length > 0 ? (
                  regulatoryMetrics.map((metric, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">{metric.metricName}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getComplianceStatusColor(metric.status)}`}>
                          {metric.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{metric.description}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Reporting Frequency:</span>
                          <span className="font-semibold text-gray-900">{metric.frequency}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Last Submission:</span>
                          <span className="font-semibold text-gray-900">{formatDate(metric.lastSubmission)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Next Due:</span>
                          <span className={`font-semibold ${
                            new Date(metric.nextDue) < new Date() ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {formatDate(metric.nextDue)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Compliance Score:</span>
                          <span className={`font-semibold ${
                            metric.complianceScore >= 90 ? 'text-green-600' :
                            metric.complianceScore >= 70 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {formatPercentage(metric.complianceScore)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center text-gray-500 py-8">
                    No regulatory metrics data available
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Recent Audit Trail Activities</h2>
              <div className="space-y-3">
                {auditTrail && auditTrail.length > 0 ? (
                  auditTrail.map((entry, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full mr-2 ${
                              entry.actionType === 'CREATE' ? 'bg-green-100 text-green-700' :
                              entry.actionType === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                              entry.actionType === 'DELETE' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {entry.actionType}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{entry.entityType}</span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{entry.description}</p>
                          <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
                            <div>
                              <span className="font-medium">User:</span> {entry.userName}
                            </div>
                            <div>
                              <span className="font-medium">Role:</span> {entry.userRole}
                            </div>
                            <div>
                              <span className="font-medium">IP:</span> {entry.ipAddress}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xs text-gray-500">{formatDate(entry.timestamp)}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(entry.timestamp).toLocaleTimeString('en-QA')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No audit trail data available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Compliance Activities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="text-sm font-medium text-gray-900">{activity.title}</div>
                <div className="text-xs text-gray-600 mt-1">{activity.description}</div>
                <div className="text-xs text-gray-400 mt-2">{formatDate(activity.timestamp)}</div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center text-gray-500 py-4">
              No recent activities
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GMComplianceDashboard;
