'use client';

import { useEffect, useState } from 'react';

interface ClientOnlyDateProps {
  date: string | Date;
  format?: 'time' | 'date' | 'datetime';
  fallback?: string;
}

export function ClientOnlyDate({ date, format = 'time', fallback = '' }: ClientOnlyDateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  let formatted: string;
  switch (format) {
    case 'time':
      formatted = dateObj.toLocaleTimeString();
      break;
    case 'date':
      formatted = dateObj.toLocaleDateString();
      break;
    case 'datetime':
      formatted = dateObj.toLocaleString();
      break;
    default:
      formatted = dateObj.toLocaleTimeString();
  }

  return <>{formatted}</>;
}