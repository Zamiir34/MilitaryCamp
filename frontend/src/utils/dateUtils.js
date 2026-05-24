import { format, isValid } from 'date-fns';

export const formatDate = (date, formatStr = 'yyyy-MM-dd') => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (!isValid(d)) return 'Invalid Date';
  return format(d, formatStr);
};

export const formatDateTime = (date) => formatDate(date, 'yyyy-MM-dd HH:mm:ss');
export const formatTime = (date) => formatDate(date, 'HH:mm:ss');
export const formatHumanDate = (date) => formatDate(date, 'PPP');
