import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const Notification = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getNotificationConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-500',
          textColor: 'text-green-800',
          closeColor: 'text-green-500 hover:text-green-700'
        };
      case 'error':
        return {
          icon: XCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500',
          textColor: 'text-red-800',
          closeColor: 'text-red-500 hover:text-red-700'
        };
      case 'warning':
        return {
          icon: AlertCircle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-500',
          textColor: 'text-yellow-800',
          closeColor: 'text-yellow-500 hover:text-yellow-700'
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500',
          textColor: 'text-blue-800',
          closeColor: 'text-blue-500 hover:text-blue-700'
        };
    }
  };

  const config = getNotificationConfig();
  const Icon = config.icon;

  return (
    <div className="fixed top-4 right-4 z-50 notification-enter-active">
      <div className={`max-w-sm w-full ${config.bgColor} border ${config.borderColor} rounded-lg shadow-lg`}>
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${config.textColor}`}>
                {message}
              </p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={onClose}
                className={`${config.closeColor} transition-colors`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notification; 