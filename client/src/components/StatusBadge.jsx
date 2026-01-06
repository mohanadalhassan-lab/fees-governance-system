import React from 'react';
import { getStatusBadgeConfig } from '../utils/helpers';

const StatusBadge = ({ status }) => {
  const config = getStatusBadgeConfig(status);
  return (
    <span className={`badge ${config.class}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
