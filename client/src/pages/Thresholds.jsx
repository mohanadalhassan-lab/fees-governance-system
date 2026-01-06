import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Settings, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { formatPercentage } from '../utils/helpers';

const Thresholds = () => {
  const [thresholds, setThresholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [originalThresholds, setOriginalThresholds] = useState([]);

  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    try {
      const response = await api.get('/thresholds');
      setThresholds(response.data);
      setOriginalThresholds(JSON.parse(JSON.stringify(response.data)));
    } catch (error) {
      console.error('Error fetching thresholds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdChange = (id, field, value) => {
    setThresholds(prev => prev.map(t => 
      t.threshold_id === id ? { ...t, [field]: parseFloat(value) } : t
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each modified threshold
      for (const threshold of thresholds) {
        await api.put(`/thresholds/${threshold.threshold_id}`, {
          min_percentage: threshold.min_percentage,
          max_percentage: threshold.max_percentage
        });
      }
      setOriginalThresholds(JSON.parse(JSON.stringify(thresholds)));
      setEditMode(false);
      alert('Thresholds updated successfully!');
    } catch (error) {
      console.error('Error saving thresholds:', error);
      alert('Failed to save thresholds');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setThresholds(JSON.parse(JSON.stringify(originalThresholds)));
    setEditMode(false);
  };

  const hasChanges = JSON.stringify(thresholds) !== JSON.stringify(originalThresholds);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statusConfig = {
    Green: { color: 'success', icon: TrendingUp, bgColor: 'bg-success-50', textColor: 'text-success-600' },
    Yellow: { color: 'warning', icon: Activity, bgColor: 'bg-warning-50', textColor: 'text-warning-600' },
    Orange: { color: 'orange', icon: TrendingDown, bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
    Red: { color: 'danger', icon: AlertTriangle, bgColor: 'bg-danger-50', textColor: 'text-danger-600' },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Threshold Management</h1>
          <p className="page-subtitle">Configure satisfaction thresholds for fee matching</p>
        </div>
        <div className="flex items-center gap-3">
          {editMode ? (
            <>
              <button 
                onClick={handleCancel}
                className="btn btn-secondary"
                disabled={saving}
              >
                <RotateCcw className="w-4 h-4" />
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="btn btn-primary"
                disabled={!hasChanges || saving}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button 
              onClick={() => setEditMode(true)}
              className="btn btn-primary"
            >
              <Settings className="w-4 h-4" />
              Edit Thresholds
            </button>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      {editMode && (
        <div className="card bg-warning-50 border border-warning-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-warning-900">Edit Mode Active</h3>
              <p className="text-sm text-warning-700 mt-1">
                Changes to thresholds will affect satisfaction calculations across all fees. 
                Ensure values do not overlap and cover the full 0-100% range.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Threshold Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {thresholds
          .sort((a, b) => b.min_percentage - a.min_percentage) // Sort descending
          .map((threshold) => {
            const config = statusConfig[threshold.status] || statusConfig.Green;
            const Icon = config.icon;

            return (
              <div key={threshold.threshold_id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`icon-wrapper ${config.bgColor}`}>
                      <Icon className={`w-6 h-6 ${config.textColor}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">
                        {threshold.status} Status
                      </h3>
                      <p className="text-sm text-neutral-600">
                        {threshold.description}
                      </p>
                    </div>
                  </div>
                  <span className={`badge badge-${config.color}`}>
                    {threshold.status}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Range Display */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Minimum %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={threshold.min_percentage}
                        onChange={(e) => handleThresholdChange(threshold.threshold_id, 'min_percentage', e.target.value)}
                        disabled={!editMode}
                        className="input"
                      />
                    </div>
                    <div className="text-2xl font-bold text-neutral-400 pt-6">→</div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Maximum %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={threshold.max_percentage}
                        onChange={(e) => handleThresholdChange(threshold.threshold_id, 'max_percentage', e.target.value)}
                        disabled={!editMode}
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Visual Range Bar */}
                  <div className="relative h-8 bg-neutral-100 rounded-lg overflow-hidden">
                    <div
                      className={`absolute h-full ${config.bgColor} border-2 ${config.textColor} border-opacity-30`}
                      style={{
                        left: `${threshold.min_percentage}%`,
                        width: `${threshold.max_percentage - threshold.min_percentage}%`,
                      }}
                    >
                      <div className="flex items-center justify-center h-full">
                        <span className={`text-xs font-semibold ${config.textColor}`}>
                          {formatPercentage(threshold.min_percentage)} - {formatPercentage(threshold.max_percentage)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="pt-3 border-t border-neutral-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-neutral-500">Created:</span>
                        <span className="ml-2 font-medium text-neutral-700">
                          {new Date(threshold.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Updated:</span>
                        <span className="ml-2 font-medium text-neutral-700">
                          {new Date(threshold.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Validation Guide */}
      <div className="card bg-info-50 border border-info-200">
        <h3 className="font-semibold text-info-900 mb-3">Threshold Configuration Guide</h3>
        <ul className="space-y-2 text-sm text-info-800">
          <li className="flex items-start gap-2">
            <span className="text-info-600 mt-0.5">•</span>
            <span><strong>Green:</strong> Optimal matching percentage - fees are well-aligned with targets</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-info-600 mt-0.5">•</span>
            <span><strong>Yellow:</strong> Acceptable but requires monitoring - minor misalignment</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-info-600 mt-0.5">•</span>
            <span><strong>Orange:</strong> Below acceptable - action recommended to improve matching</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-info-600 mt-0.5">•</span>
            <span><strong>Red:</strong> Critical misalignment - immediate attention required</span>
          </li>
          <li className="flex items-start gap-2 mt-4 pt-3 border-t border-info-300">
            <span className="text-info-600 mt-0.5">⚠️</span>
            <span><strong>Important:</strong> Ensure thresholds do not overlap and cover 0-100% range completely</span>
          </li>
        </ul>
      </div>

      {/* Current Global Threshold */}
      <div className="card bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary-900">Current Global Threshold</h3>
            <p className="text-sm text-primary-700 mt-1">
              Minimum acceptable matching percentage across all fees
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-primary-600">
              {thresholds.find(t => t.status === 'Green')?.min_percentage || 98}%
            </div>
            <span className="text-sm text-primary-700">Target: 98%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Thresholds;
