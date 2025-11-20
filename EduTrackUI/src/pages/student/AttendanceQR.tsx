import React, { useRef, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import * as QRCodeLib from 'qrcode.react';

// Support both default and named exports from different package builds
const QRCodeComponent: React.ComponentType<any> = (QRCodeLib as any).default || (QRCodeLib as any).QRCode || (QRCodeLib as any).QRCodeCanvas || (QRCodeLib as any).QRCodeSVG || (() => null);

const AttendanceQR: React.FC = () => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [ts, setTs] = useState(() => Date.now());

  const value = React.useMemo(() => {
    // Payload encoded into the QR - can be validated server-side if needed
    return JSON.stringify({
      type: 'attendance',
      student_id: user?.id || null,
      ts
    });
  }, [user?.id, ts]);

  const regenerate = () => setTs(Date.now());

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

  return (
    <DashboardLayout>
      <div className="w-full bg-gray-50 min-h-screen py-8">
        <div className="w-full px-6 mb-6">
          <h1 className="text-3xl font-bold">Student Attendance QR</h1>
          <p className="text-sm text-gray-600">Show this QR to the proctor to register attendance.</p>
        </div>

        <div className="w-full px-6 max-w-3xl mx-auto">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>My Attendance QR</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Student</p>
                <p className="text-lg font-semibold">{user?.name}</p>
                <p className="text-xs text-gray-500">ID: {user?.id}</p>
              </div>

              <div ref={canvasRef} className="bg-white p-4 rounded-md shadow">
                <QRCodeComponent value={value} size={256} level={'M'} includeMargin={true} />
              </div>

              <div className="flex gap-3">
                <Button onClick={regenerate} className="bg-blue-600 hover:bg-blue-700">Regenerate</Button>
                <Button onClick={downloadQR} variant="outline">Download PNG</Button>
              </div>

              <p className="text-xs text-gray-500">QR encodes a short attendance token that expires on regeneration.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceQR;
