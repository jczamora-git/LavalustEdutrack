import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Unauthorized = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    console.warn("403 Unauthorized: User attempted to access restricted route:", {
      attemptedPath: location.pathname,
      userRole: user?.role,
      userId: user?.id,
    });
  }, [location.pathname, user]);

  const getDashboardUrl = () => {
    switch (user?.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      case 'student':
        return '/student/dashboard';
      default:
        return '/';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <Card className="w-full max-w-md border-destructive/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-3xl">Access Denied</CardTitle>
          <CardDescription className="text-base">
            You don't have permission to access this resource
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">Requested path:</span> <code className="text-xs">{location.pathname}</code>
            </p>
            {user && (
              <p className="text-sm text-muted-foreground mt-2">
                <span className="font-semibold">Your role:</span> <span className="capitalize">{user.role}</span>
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Link to={getDashboardUrl()} className="block">
              <Button className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
            <Link to="/" className="block">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            If you believe this is an error, please contact your administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
