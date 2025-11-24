import React from "react";
import { NotificationContext } from "@/context/NotificationContext";
import { AlertMessage } from "@/components/AlertMessage";

export const NotificationContainer: React.FC = () => {
  const context = React.useContext(NotificationContext);

  if (!context) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {context.notifications
        .filter((n) => n.displayToast !== false)
        .map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <AlertMessage
              type={notification.type}
              message={notification.message}
              onClose={() => context.removeNotification(notification.id)}
              duration={notification.duration}
            />
          </div>
        ))}
    </div>
  );
};
