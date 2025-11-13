import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing reset token. Please use the link from your email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      console.log('Reset password response status:', res.status);
      console.log('Reset password response headers:', res.headers);

      const text = await res.text();
      console.log('Reset password response text:', text);

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        console.error('Failed to parse JSON response:', text);
        setError('Invalid response from server. Check browser console for details.');
        toast.error('Invalid response from server.');
        setIsLoading(false);
        return;
      }

      console.log('Reset password parsed JSON:', json);

      if (res.ok && json.success) {
        toast.success(json.message || 'Password updated. You can now log in.');
        setTimeout(() => navigate('/auth'), 1500);
      } else {
        const errorMsg = json.message || 'Failed to reset password.';
        setError(errorMsg);
        toast.error(errorMsg);
        console.error('API error:', errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error while resetting password.';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center">
      {/* Header with logo/branding */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent mb-4 mx-auto">
          <Lock className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
        <p className="text-muted-foreground mt-2">Create a new password for your EduTrack account</p>
      </div>

      {/* Main card */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="border-b border-muted">
          <CardTitle className="text-xl">Set Your New Password</CardTitle>
          <CardDescription>Enter a secure password to regain access to your account</CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {!token ? (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                No reset token provided. Please use the link from your email.
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
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    New Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    required
                    className="h-10"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">At least 6 characters recommended</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-sm font-medium text-foreground">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    required
                    className="h-10"
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full h-10 text-base font-medium" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="opacity-0">Set new password</span>
                      <span className="absolute">Updating password...</span>
                    </>
                  ) : (
                    'Set New Password'
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-muted">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Remember your password?
                </p>
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
        If you didn't request a password reset, you can safely ignore this message. Your account remains secure.
      </p>
    </div>
  );
};

export default ResetPassword;
