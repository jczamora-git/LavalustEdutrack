import React, { createContext, useState, useCallback, useContext } from "react";

export interface Notification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  duration?: number;
  timestamp?: number;
  // Optional arbitrary metadata (e.g. full announcement object)
  meta?: any;
  // Optional source id to help deduplication (e.g. announcement id)
  sourceId?: string | number;
  // Whether this notification should also show as a toast in the NotificationContainer
  displayToast?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationContext must be used within NotificationProvider");
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, "id">) => {
    // Generate a more robust unique id to avoid collisions when many notifications
    // are created in the same millisecond.
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 3000,
      timestamp: notification.timestamp ?? now,
      displayToast: notification.displayToast ?? true,
    };

    setNotifications((prev) => [...prev, newNotification]);

    // Debug: log new notification for troubleshooting
    try {
      // eslint-disable-next-line no-console
      console.debug('[Notification] add', { id, message: newNotification.message, sourceId: newNotification.sourceId });
    } catch (e) {}

    // Auto-remove after duration (duration === 0 means persistent)
    if (newNotification.duration && newNotification.duration > 0) {
      const timeout = setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, newNotification.duration);

      // Optional: clear timeout if notification is removed manually
      // (no explicit cleanup necessary here since we don't track timeouts)
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      // eslint-disable-next-line no-console
      console.debug('[Notification] remove', id);
    } catch (e) {}
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
