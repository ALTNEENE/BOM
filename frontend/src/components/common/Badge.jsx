import { useTranslation } from 'react-i18next';

const badgeLabels = {
  todo: 'badges.todo',
  'in-progress': 'badges.in_progress',
  review: 'badges.review',
  completed: 'badges.completed',
  blocked: 'badges.blocked',
  planning: 'badges.planning',
  active: 'badges.active',
  'on-hold': 'badges.on_hold',
  cancelled: 'badges.cancelled',
  low: 'badges.low',
  medium: 'badges.medium',
  high: 'badges.high',
  urgent: 'badges.urgent',
  critical: 'badges.critical',
};

const Badge = ({ status, priority, type, children }) => {
  const { t } = useTranslation();
  const value = status || priority || type || children;
  if (!value) return null;
  const normalized = value.toString().toLowerCase().replace(/\s+/g, '-');
  const labelKey = badgeLabels[normalized];
  const label = labelKey ? t(labelKey) : value;

  return <span className={`badge badge-${normalized}`}>{label}</span>;
};

export default Badge;
