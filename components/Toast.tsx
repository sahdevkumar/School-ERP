import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const bgColors = {
    success: 'bg-white dark:bg-gray-800 border-l-4 border-green-500',
    error: 'bg-white dark:bg-gray-800 border-l-4 border-red-500',
    info: 'bg-white dark:bg-gray-800 border-l-4 border-blue-500',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  return (
    <div className={`flex items-center w-full max-w-xs p-4 mb-3 text-gray-500 shadow-lg rounded-lg dark:text-gray-400 dark:shadow-none border border-gray-100 dark:border-gray-700 animate-fade-in-up ${bgColors[type]}`} role="alert">
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8">
        {icons[type]}
      </div>
      <div className="ml-3 text-sm font-medium text-gray-900 dark:text-white break-words flex-1">{message}</div>
      <button
        type="button"
        className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:hover:bg-gray-700"
        onClick={() => onClose(id)}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};