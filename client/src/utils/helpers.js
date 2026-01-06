export const formatCurrency = (value, currency = 'QAR') => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-QA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-QA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  return `${formatNumber(value, decimals)}%`;
};

export const formatDate = (date, format = 'medium') => {
  if (!date) return '-';
  const d = new Date(date);
  
  const formats = {
    short: { month: 'short', day: 'numeric', year: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    dateOnly: { month: 'short', day: 'numeric', year: 'numeric' },
  };
  
  return new Intl.DateTimeFormat('en-QA', formats[format] || formats.medium).format(d);
};

export const calculateDaysRemaining = (endDate) => {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getStatusColor = (percentage) => {
  // If it's a satisfaction status string
  if (typeof percentage === 'string') {
    const colors = {
      Green: 'bg-success-500',
      Yellow: 'bg-warning-500',
      Orange: 'bg-orange-500',
      Red: 'bg-danger-500',
      NOT_SATISFIED: 'danger',
      CONDITIONALLY_ELIGIBLE: 'warning',
      PENDING_CEO_APPROVAL: 'info',
      SATISFIED: 'success',
      active: 'success',
      pending: 'warning',
      rejected: 'danger',
      expired: 'neutral',
    };
    return colors[percentage] || 'neutral';
  }
  
  // If it's a numeric percentage
  if (percentage >= 98) return 'bg-success-500';
  if (percentage >= 95) return 'bg-warning-500';
  if (percentage >= 90) return 'bg-orange-500';
  return 'bg-danger-500';
};

export const getStatusBadgeConfig = (state) => {
  if (!state) return { label: 'N/A', class: 'badge-neutral' };
  
  const badgeConfigs = {
    Green: { label: 'Green', class: 'badge-success' },
    Yellow: { label: 'Yellow', class: 'badge-warning' },
    Orange: { label: 'Orange', class: 'badge-orange' },
    Red: { label: 'Red', class: 'badge-danger' },
    NOT_SATISFIED: { label: 'Not Satisfied', class: 'badge-danger' },
    CONDITIONALLY_ELIGIBLE: { label: 'Conditionally Eligible', class: 'badge-warning' },
    PENDING_CEO_APPROVAL: { label: 'Pending CEO Approval', class: 'badge-info' },
    SATISFIED: { label: 'Satisfied', class: 'badge-success' },
    active: { label: 'Active', class: 'badge-success' },
    pending: { label: 'Pending', class: 'badge-warning' },
    rejected: { label: 'Rejected', class: 'badge-danger' },
    expired: { label: 'Expired', class: 'badge-neutral' },
    approved: { label: 'Approved', class: 'badge-success' },
    Active: { label: 'Active', class: 'badge-success' },
    Pending: { label: 'Pending', class: 'badge-warning' },
    Rejected: { label: 'Rejected', class: 'badge-danger' },
    Approved: { label: 'Approved', class: 'badge-success' },
    Inactive: { label: 'Inactive', class: 'badge-neutral' },
  };
  
  return badgeConfigs[state] || { label: state, class: 'badge-neutral' };
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};
