import { useContext } from "react";
import { NotificationContext } from "@/context/NotificationContext";

export const useNotification = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }

  return {
    success: (message: string, duration?: number) => 
      context.addNotification({ type: "success", message, duration }),
    error: (message: string, duration?: number) => 
      context.addNotification({ type: "error", message, duration }),
    info: (message: string, duration?: number) => 
      context.addNotification({ type: "info", message, duration }),
  };
};
