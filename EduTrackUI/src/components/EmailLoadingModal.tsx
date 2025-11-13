import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface EmailLoadingModalProps {
  isOpen: boolean;
  isSuccess?: boolean; // Pass true when email is successfully sent
  emailType?: "reset" | "confirmation" | "custom";
  customMessage?: string;
  customSuccessMessage?: string;
  onComplete?: () => void;
  autoCloseDuration?: number; // milliseconds to auto-close after success (0 = manual)
}

const EmailLoadingModal = ({
  isOpen,
  isSuccess = false,
  emailType = "reset",
  customMessage,
  customSuccessMessage,
  onComplete,
  autoCloseDuration = 3000,
}: EmailLoadingModalProps) => {
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [displayedSuccessMessage, setDisplayedSuccessMessage] = useState("");

  // Set default messages based on emailType
  useEffect(() => {
    if (customMessage) {
      setDisplayedMessage(customMessage);
    } else {
      switch (emailType) {
        case "reset":
          setDisplayedMessage("Sending password reset email...");
          break;
        case "confirmation":
          setDisplayedMessage("Sending confirmation email...");
          break;
        case "custom":
          setDisplayedMessage("Sending email...");
          break;
        default:
          setDisplayedMessage("Sending email...");
      }
    }

    if (customSuccessMessage) {
      setDisplayedSuccessMessage(customSuccessMessage);
    } else {
      switch (emailType) {
        case "reset":
          setDisplayedSuccessMessage("Password reset email has been sent");
          break;
        case "confirmation":
          setDisplayedSuccessMessage("Confirmation email has been sent");
          break;
        case "custom":
          setDisplayedSuccessMessage("Email has been sent successfully");
          break;
        default:
          setDisplayedSuccessMessage("Email sent successfully");
      }
    }
  }, [emailType, customMessage, customSuccessMessage]);

  // Auto-close after success
  useEffect(() => {
    if (isSuccess && autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, autoCloseDuration, onComplete]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onComplete?.();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex items-center justify-center w-full max-w-lg p-0 border-0 bg-gradient-to-br from-background to-muted/20 shadow-2xl rounded-2xl">
        <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center space-y-8">
          {!isSuccess ? (
            <>
              {/* Large spinner */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse"></div>
                <div className="relative w-24 h-24">
                  <svg
                    className="animate-spin"
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="url(#gradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="141 282"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(var(--accent))" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Loading message */}
              <div className="space-y-3">
                <p className="text-xl font-semibold text-foreground">
                  {displayedMessage}
                </p>
                <p className="text-sm text-muted-foreground">
                  Please wait while we send your email
                </p>
              </div>

              {/* Animated dots */}
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                <span className="w-2 h-2 bg-success rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
              </div>
            </>
          ) : (
            <>
              {/* Success checkmark */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-success/10 animate-pulse"></div>
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-success to-emerald-500 flex items-center justify-center shadow-lg">
                  {/* Colored check SVG (green) for strong contrast */}
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="animate-in zoom-in duration-500"
                  >
                    <path d="M20 6L9 17l-5-5" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Success message */}
              <div className="space-y-3">
                <p className="text-2xl font-bold text-success">
                  Success!
                </p>
                <p className="text-lg text-foreground">
                  {displayedSuccessMessage}
                </p>
                <p className="text-sm text-muted-foreground">
                  Check your inbox for further instructions
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailLoadingModal;
