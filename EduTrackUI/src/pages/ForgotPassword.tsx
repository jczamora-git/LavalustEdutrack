import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AlertMessage } from "@/components/AlertMessage";
import EmailLoadingModal from "@/components/EmailLoadingModal";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setShowEmailModal(true);
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      console.log('Forgot password response status:', res.status);
      const text = await res.text();
      console.log('Forgot password response text:', text);

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        console.error('Failed to parse JSON response:', text);
        setError('Invalid response from server. Check browser console for details.');
        toast.error('Server error. Please try again.');
        setShowEmailModal(false);
        setIsLoading(false);
        return;
      }

      console.log('Forgot password parsed JSON:', json);

      if (res.ok && json.success) {
        setSuccess(true);
        setEmail("");
        const msg = json.message || 'Check your email for password reset instructions.';
        setAlert({ type: 'success', message: msg });
        toast.success(msg);

        // Auto-redirect after email modal completes
        setTimeout(() => {
          navigate('/auth');
        }, 5000);
      } else {
        const errorMsg = json.message || 'Failed to send reset email.';
        setError(errorMsg);
        setAlert({ type: 'error', message: errorMsg });
        toast.error(errorMsg);
        console.error('API error:', errorMsg);
        setShowEmailModal(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error. Please try again.';
      setError(errorMsg);
      setAlert({ type: 'error', message: errorMsg });
      toast.error(errorMsg);
      console.error('Fetch error:', err);
      setShowEmailModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalComplete = () => {
    setShowEmailModal(false);
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary/5 via-accent/5 to-success/5 flex flex-col items-center justify-center">
      {/* Email Loading Modal */}
      <EmailLoadingModal
        isOpen={showEmailModal}
        isSuccess={success}
        emailType="reset"
        onComplete={handleModalComplete}
        autoCloseDuration={3000}
      />

      {/* Header with logo/branding */}
      {alert && (
        <div className="mb-6">
          <AlertMessage type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent mb-4 mx-auto">
          <Mail className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Forgot Password</h1>
        <p className="text-muted-foreground mt-2">We'll help you reset your password</p>
      </div>

      {/* Main card */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="border-b border-muted">
          <CardTitle className="text-xl">Reset Your Password</CardTitle>
          <CardDescription>Enter your email address and we'll send you a link to reset your password</CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {success ? (
            <Alert className="border-green-200 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <p className="font-semibold mb-2">Email sent successfully!</p>
                <p>Check your inbox for a link to reset your password. The link will expire in 24 hours.</p>
                <p className="mt-3 text-sm">Redirecting to login in a few seconds...</p>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {error && (
                <Alert className="border-red-200 bg-red-50 mb-4">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    required
                    className="h-10"
                    disabled={isLoading}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">We'll send a password reset link to this email</p>
                </div>

                <Button type="submit" className="w-full h-10 text-base font-medium" disabled={isLoading}>
                  {isLoading ? 'Sending email...' : 'Send Reset Link'}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-muted">
                <Link to="/auth" className="block text-center">
                  <Button variant="outline" className="w-full h-10">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Footer info */}
      <p className="text-xs text-muted-foreground mt-8 max-w-md text-center">
        Remember your password? <Link to="/auth" className="text-primary hover:underline font-semibold">Sign in here</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
