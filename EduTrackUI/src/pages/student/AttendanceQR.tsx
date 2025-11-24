import React, { useRef, useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import * as QRCodeLib from 'qrcode.react';
import { AlertCircle, MapPin, Clock } from 'lucide-react';

// Support both default and named exports from different package builds
const QRCodeComponent: React.ComponentType<any> = (QRCodeLib as any).default || (QRCodeLib as any).QRCode || (QRCodeLib as any).QRCodeCanvas || (QRCodeLib as any).QRCodeSVG || (() => null);

const AttendanceQR: React.FC = () => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [ts, setTs] = useState(() => Date.now());
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes = 300 seconds

  // Auto-regenerate QR after 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTs(Date.now()); // Auto-regenerate
          return 300; // Reset to 5 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError(`Location error: ${error.message}`);
        }
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  }, []);

  const value = React.useMemo(() => {
    // Payload encoded into the QR - includes location and timestamp
    return JSON.stringify({
      type: 'attendance',
      student_id: user?.id || null,
      ts,
      location: location || { lat: 0, lng: 0 },
      expires_at: ts + 5 * 60 * 1000, // 5 minutes from generation
    });
  }, [user?.id, ts, location]);

  const regenerate = () => {
    setTs(Date.now());
    setTimeRemaining(300);
  };

  const downloadQR = () => {
    // qrcode.react renders a canvas by default; find it inside our wrapper
    const node = canvasRef.current;
    if (!node) return;
    const canvas = node.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${user?.id || 'unknown'}.png`;
    a.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <DashboardLayout>
      <div className="w-full bg-gray-50 min-h-screen py-4 sm:py-6 md:py-8 px-0 pt-20 md:pt-8">
        <div className="w-full px-4 sm:px-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Student Attendance QR</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Show this QR to the proctor to register attendance.</p>
        </div>

        <div className="w-full px-4 sm:px-6 md:px-8 max-w-3xl mx-auto">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>My Attendance QR</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 flex flex-col items-center gap-4 sm:gap-6">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-600">Student</p>
                <p className="text-base sm:text-lg font-semibold mt-1">{user?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">ID: {user?.id}</p>
              </div>

              {locationError && (
                <div className="w-full flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700">{locationError}</p>
                </div>
              )}

              {location && (
                <div className="w-full text-xs text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</span>
                  </div>
                </div>
              )}

              <div ref={canvasRef} className="bg-white p-2 sm:p-4 rounded-md shadow">
                <QRCodeComponent value={value} size={200} level={'M'} includeMargin={true} />
              </div>

              <div className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-mono text-blue-600">Expires in {formatTime(timeRemaining)}</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <Button onClick={regenerate} className="bg-blue-600 hover:bg-blue-700 text-sm w-full sm:w-auto">Regenerate</Button>
                <Button onClick={downloadQR} variant="outline" className="text-sm w-full sm:w-auto">Download PNG</Button>
              </div>

              <p className="text-xs text-gray-500 text-center px-2">QR auto-expires after 5 minutes. Location data is included for campus verification.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceQR;
