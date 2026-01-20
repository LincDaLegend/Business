import React, { useState } from 'react';
import { Notification } from '../types.ts';
import { 
  Bell, 
  X, 
  Check,
  AlertTriangle,
  Package,
  DollarSign,
  Truck,
  Info,
  CheckCircle,
  Trash2
} from 'lucide-react';

interface NotificationCenterProps {
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  notifications, 
  setNotifications, 
  isOpen, 
  onClose 
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'low_stock':
        return <Package className="w-5 h-5 text-amber-500" />;
      case 'payment_received':
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'shipping_reminder':
        return <Truck className="w-5 h-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-brand-600" />;
    }
  };

  const getBgColor = (type: Notification['type'], read: boolean) => {
    if (read) return 'bg-gray-50';
    switch (type) {
      case 'low_stock':
      case 'warning':
        return 'bg-amber-50';
      case 'payment_received':
      case 'success':
        return 'bg-green-50';
      case 'shipping_reminder':
        return 'bg-blue-50';
      default:
        return 'bg-brand-50';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      
      <div 
        className="absolute right-4 top-[80px] w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-brand-600 text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Mark all read
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No notifications</p>
              <p className="text-sm text-gray-400">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${getBgColor(notification.type, notification.read)}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${notification.read ? 'text-gray-500' : 'text-gray-900'}`}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Mark read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-xs text-gray-400 hover:text-red-500 font-medium flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={clearAll}
              className="w-full py-2 text-sm text-gray-500 hover:text-red-500 font-medium transition-colors"
            >
              Clear all notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
