import { Check, AlertCircle, X } from "lucide-react";
import { useEffect } from "react";

interface AlertMessageProps {
  type: "success" | "error" | "info";
  message: string;
  onClose: () => void;
  duration?: number;
}

export const AlertMessage = ({
  type,
  message,
  onClose,
  duration = 3000,
}: AlertMessageProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = {
    success: "bg-green-100/90 border-green-300",
    error: "bg-red-100/90 border-red-300",
    info: "bg-blue-100/90 border-blue-300",
  }[type];

  const textColor = {
    success: "text-green-700",
    error: "text-red-700",
    info: "text-blue-700",
  }[type];

  const Icon = {
    success: Check,
    error: AlertCircle,
    info: AlertCircle,
  }[type];

  return (
    <div
      className={`fixed top-4 right-4 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bgColor} ${textColor} z-50 animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
