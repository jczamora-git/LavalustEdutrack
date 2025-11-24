import { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationContext } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS, apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export const NotificationBell = () => {
  const { notifications, removeNotification, addNotification } = useNotificationContext();
  const { user } = useAuth();
  const hasFetchedAnnouncements = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.length;

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-bell-container')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'Just now';
    
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return 'A while ago';
  };

  const parseDateToTimestamp = (val?: string | number | null) => {
    if (!val) return undefined;
    if (typeof val === 'number') return val;
    // Normalize 'YYYY-MM-DD HH:MM:SS' to ISO 'YYYY-MM-DDTHH:MM:SS' for Date parsing
    if (typeof val === 'string') {
      const trimmed = val.trim();
      // If already ISO-like
      if (trimmed.includes('T')) return Date.parse(trimmed);
      // Replace space between date and time with 'T'
      const iso = trimmed.replace(' ', 'T');
      // If seconds missing, Date.parse can still work
      const parsed = Date.parse(iso);
      if (!isNaN(parsed)) return parsed;
      // Fallback try replacing space with 'T' and adding seconds
      return Date.parse(iso + ':00');
    }
    return undefined;
  };

  const getNotificationTimestamp = (notification: any) => {
    // Prefer announcement published_at, then starts_at, then created_at
    const ann = notification?.meta;
    if (ann) {
      const byPublished = parseDateToTimestamp(ann.published_at ?? ann.created_at ?? ann.starts_at ?? ann.updated_at);
      if (byPublished) return byPublished;
    }
    // fallback to notification.timestamp (number)
    if (notification?.timestamp) return notification.timestamp;
    return undefined;
  };

  const fetchAnnouncementsOnce = async () => {
    if (hasFetchedAnnouncements.current) return;
    try {
      const res = await apiGet(API_ENDPOINTS.ANNOUNCEMENTS);
      const list = res.data ?? res.announcements ?? res ?? [];

      try {
        // eslint-disable-next-line no-console
        console.debug('[NotificationBell] fetched announcements', Array.isArray(list) ? list.length : 0);
      } catch (e) {}

      const existingIds = new Set<string | number>();
      const existingMsgs = new Set<string>();
      notifications.forEach((n: any) => {
        if (n.sourceId) existingIds.add(String(n.sourceId));
        if (n.message) existingMsgs.add(n.message);
      });

      const matchesAudience = (aud: string | null | undefined) => {
        const role = user?.role ?? '';
        if (!aud) return true;
        const a = String(aud).toLowerCase();
        if (a === 'all') return true;
        if (role === 'student' && (a === 'students' || a === 'student')) return true;
        if (role === 'teacher' && (a === 'teachers' || a === 'teacher')) return true;
        if (role === 'admin') return true;
        return false;
      };

      (Array.isArray(list) ? list : []).forEach((a: any) => {
        const sid = a.id ?? a._id ?? null;
        const msg = a.title ? `${a.title}: ${a.message ?? ''}` : (a.message ?? '');
        if (!matchesAudience(a.audience)) return;
        if (sid && existingIds.has(String(sid))) return;
        if (!sid && existingMsgs.has(msg)) return;
        // Debug: log before adding
        try { console.debug('[NotificationBell] add notification for announcement', { sid, msg }); } catch (e) {}
        // add as persistent bell notification but do not show toast alert
        addNotification({ type: 'info', message: msg, duration: 0, meta: a, sourceId: sid, displayToast: false });
      });
      hasFetchedAnnouncements.current = true;
    } catch (e) {
      // ignore - leave bell empty
      // console.error('Failed to fetch announcements for bell', e);
    }
  };

  return (
    <div className="notification-bell-container relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-muted"
        onClick={async () => {
          const next = !isOpen;
          setIsOpen(next);
          // fetch announcements when opening the bell (fallback)
          if (next) await fetchAnnouncementsOnce();
        }}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const ann = notification.meta;
                  // If notification.meta looks like an announcement, render detailed view
                  if (ann && (ann.title || ann.message)) {
                    return (
                      <div key={notification.id} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{ann.title}</p>
                              <span className="text-xs text-muted-foreground">{ann.audience}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">{ann.message}</p>
                            <div className="text-xs text-muted-foreground mt-2">
                              {ann.published_at && <span>Published: {new Date(ann.published_at).toLocaleString()}</span>}
                              {ann.starts_at && <span className="ml-3">Starts: {new Date(ann.starts_at).toLocaleString()}</span>}
                              {ann.ends_at && <span className="ml-3">Ends: {new Date(ann.ends_at).toLocaleString()}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className={cn('w-3 h-3 rounded-full', notification.type === 'info' ? 'bg-blue-500' : notification.type === 'success' ? 'bg-green-500' : 'bg-red-500')} />
                            <p className="text-xs text-muted-foreground">{formatTime(getNotificationTimestamp(notification))}</p>
                            <Button variant="ghost" size="icon" className="mt-1" onClick={() => removeNotification(notification.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default simple message rendering
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                        notification.type === 'success' && 'border-l-4 border-l-green-500',
                        notification.type === 'error' && 'border-l-4 border-l-red-500',
                        notification.type === 'info' && 'border-l-4 border-l-blue-500'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatTime(getNotificationTimestamp(notification))}</p>
                        </div>
                        <div className={cn('w-2 h-2 rounded-full mt-1 flex-shrink-0', notification.type === 'success' && 'bg-green-500', notification.type === 'error' && 'bg-red-500', notification.type === 'info' && 'bg-blue-500')} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-border text-center">
              <Button variant="ghost" size="sm" className="text-xs">
                View All Notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
