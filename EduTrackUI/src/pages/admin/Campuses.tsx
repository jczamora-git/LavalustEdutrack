import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_ENDPOINTS, apiGet, apiPost, apiPut } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Save, RotateCcw } from 'lucide-react';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

interface Campus {
  id?: number;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  geo_radius_m: number;
}

const Campuses = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMap, setShowMap] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { data: campusData, isLoading } = useQuery({
    queryKey: ['campus'],
    queryFn: () => apiGet(API_ENDPOINTS.CAMPUSES),
  });

  const campus: Campus | null = campusData?.data?.[0] || null;

  const upsertMutation = useMutation({
    mutationFn: (data: any) =>
      campus?.id
        ? apiPut(API_ENDPOINTS.CAMPUS_BY_ID(campus.id), data)
        : apiPost(API_ENDPOINTS.CAMPUSES, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campus'] });
      toast({ title: 'Success', description: 'Campus location saved' });
      setIsEditing(false);
      setShowMap(false);
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message || 'Save failed', variant: 'destructive' })
  });

  const [form, setForm] = useState<Campus>({
    name: '',
    address: '',
    latitude: 14.5995,
    longitude: 120.9842,
    geo_radius_m: 500
  });

  useEffect(() => {
    if (campus) {
      setForm(campus);
    }
  }, [campus]);

  // Separate useEffect to update form when coming from MapPicker
  useEffect(() => {
    // This will be called when coordinates/radius change from map picker
  }, []);

  const saving = Boolean((upsertMutation as any).isLoading || (upsertMutation as any).status === 'loading');

  const handleSave = () => {
    if (!form.name) {
      toast({ title: 'Validation', description: 'Campus name required', variant: 'destructive' });
      return;
    }
    upsertMutation.mutate(form);
  };

  const handleReset = () => {
    if (campus) {
      setForm(campus);
    }
    setIsEditing(false);
    setShowMap(false);
  };

  return (
    <DashboardLayout>
      <div className="w-full bg-gray-50 min-h-screen py-8">
        <div className="w-full px-6 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Campus Location</h1>
          <p className="text-lg text-gray-600">Manage your primary campus location for attendance tracking and geofencing</p>
        </div>

        {isLoading ? (
          <div className="w-full px-6">
            <Card>
              <CardContent className="pt-8">
                <p className="text-center text-gray-500">Loading campus data...</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="w-full px-6">
            {isEditing ? (
              // EDIT MODE - Full width form with map
              <div className="space-y-6">
                <Card className="shadow-lg">
                  <CardHeader className="border-b bg-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <MapPin className="w-6 h-6 text-blue-600" />
                      {campus ? 'Edit Campus Location' : 'Set Campus Location'}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* LEFT SIDE - FORM */}
                      <div className="lg:col-span-1">
                        <div className="space-y-5">
                          <div>
                            <Label className="text-sm font-semibold mb-2 block">Campus Name *</Label>
                            <Input
                              value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value })}
                              placeholder="e.g., Main Campus"
                              className="h-10"
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-semibold mb-2 block">Address</Label>
                            <Input
                              value={form.address || ''}
                              onChange={(e) => setForm({ ...form, address: e.target.value })}
                              placeholder="e.g., 123 Education Ave"
                              className="h-10"
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-semibold mb-2 block">Latitude</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={form.latitude}
                              onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                              className="h-10"
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-semibold mb-2 block">Longitude</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={form.longitude}
                              onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                              className="h-10"
                            />
                          </div>

                          <div>
                            <Label className="text-sm font-semibold mb-2 block">Geofence Radius (m)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={form.geo_radius_m}
                              onChange={(e) => setForm({ ...form, geo_radius_m: parseInt(e.target.value) || 1 })}
                              className="h-10"
                            />
                            <p className="text-xs text-gray-500 mt-2">Attendance check-in radius</p>
                          </div>

                          <div className="pt-4 border-t">
                            <Button
                              type="button"
                              variant={showMap ? 'default' : 'outline'}
                              className="w-full"
                              onClick={() => setShowMap(!showMap)}
                            >
                              {showMap ? '✕ Hide Map' : '📍 Show Map Picker'}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT SIDE - MAP */}
                      <div className="lg:col-span-2">
                        {showMap ? (
                          <MapPicker 
                            lat={form.latitude} 
                            lng={form.longitude}
                            radius={form.geo_radius_m}
                            onSelect={(lat, lng, address) => {
                              setForm({ ...form, latitude: lat, longitude: lng, address: address || form.address });
                            }}
                            onRadiusChange={(radius) => {
                              setForm({ ...form, geo_radius_m: radius });
                            }}
                          />
                        ) : (
                          <div className="w-full h-96 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <div className="text-center">
                              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-gray-600 font-medium">Click "Show Map Picker" to select location</p>
                              <p className="text-sm text-gray-500 mt-1">Or enter coordinates manually on the left</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-end pt-8 border-t mt-8">
                      <Button variant="outline" onClick={handleReset} disabled={saving}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 px-6">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Campus'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // VIEW MODE - Display campus info
              <Card className="shadow-lg">
                <CardHeader className="border-b bg-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <MapPin className="w-6 h-6 text-blue-600" />
                      Campus Details
                    </CardTitle>
                    <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                      Edit Location
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-8">
                  {campus ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                          <Label className="text-xs font-semibold text-blue-800 block mb-2">Campus Name</Label>
                          <p className="text-2xl font-bold text-blue-900">{campus.name}</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                          <Label className="text-xs font-semibold text-purple-800 block mb-2">Geofence Radius</Label>
                          <p className="text-2xl font-bold text-purple-900">{campus.geo_radius_m} <span className="text-lg">meters</span></p>
                        </div>
                      </div>

                      {campus.address && (
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <Label className="text-xs font-semibold text-gray-700 block mb-2">Address</Label>
                          <p className="text-lg text-gray-800">{campus.address}</p>
                        </div>
                      )}

                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <Label className="text-xs font-semibold text-blue-800 block mb-3">Location Coordinates</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-blue-700 font-medium mb-1">Latitude</p>
                            <p className="font-mono text-lg text-blue-900">{parseFloat(campus.latitude).toFixed(6)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-700 font-medium mb-1">Longitude</p>
                            <p className="font-mono text-lg text-blue-900">{parseFloat(campus.longitude).toFixed(6)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MapPin className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-xl text-gray-600 font-semibold">No campus location set</p>
                      <p className="text-gray-500 mt-2">Set your campus location to enable geofencing for attendance</p>
                      <Button onClick={() => setIsEditing(true)} className="mt-6 bg-blue-600 hover:bg-blue-700">
                        Set Location Now
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

interface MapPickerProps {
  lat: number;
  lng: number;
  radius: number;
  onSelect: (lat: number, lng: number, address?: string) => void;
  onRadiusChange?: (radius: number) => void;
}

const MapPicker: React.FC<MapPickerProps> = ({ lat, lng, radius, onSelect, onRadiusChange }) => {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);
  const circleRef = React.useRef<any>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searching, setSearching] = React.useState(false);
  const [currentRadius, setCurrentRadius] = React.useState(radius);

  // Reverse geocode to get address from coordinates
  const getAddressFromCoords = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();
      return data.address?.road || data.address?.city || data.display_name || '';
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return '';
    }
  };

  // Search for address using Nominatim
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);
        const addressName = result.display_name || '';

        // Update marker
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        }

        // Update circle
        if (circleRef.current) {
          circleRef.current.setLatLng([newLat, newLng]);
        }

        // Pan to location
        mapInstanceRef.current.setView([newLat, newLng], 16, {
          animate: true,
          duration: 0.5
        });

        // Update parent with address
        onSelect(newLat, newLng, addressName);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  // Handle radius slider change
  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRadius = parseInt(e.target.value);
    setCurrentRadius(newRadius);
    if (circleRef.current) {
      circleRef.current.setRadius(newRadius);
    }
    if (onRadiusChange) {
      onRadiusChange(newRadius);
    }
  };

  React.useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    const initializeMap = async () => {
      try {
        const L = (await import('leaflet')).default;

        // Fix default icon URLs for Vite
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Clean up existing map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Create map with proper initialization
        const mapInstance = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 16,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          zoomControl: true,
          preferCanvas: false,
          attributionControl: true
        });

        // Add tile layer with reliable CDN
        const tileLayer = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
            minZoom: 1,
            crossOrigin: 'anonymous'
          }
        );

        tileLayer.addTo(mapInstance);

        // Create marker with proper initialization
        const marker = L.marker([lat, lng], {
          draggable: false,
          autoPan: true
        }).addTo(mapInstance);

        markerRef.current = marker;

        // Create geofence circle
        const circle = L.circle([lat, lng], {
          radius: currentRadius,
          color: '#3b82f6',
          fillColor: '#93c5fd',
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '5, 5'
        }).addTo(mapInstance);

        circleRef.current = circle;

        // Handle map clicks to select location
        mapInstance.on('click', async (e: any) => {
          const newLat = e.latlng.lat;
          const newLng = e.latlng.lng;

          if (isMounted) {
            marker.setLatLng([newLat, newLng]);
            circle.setLatLng([newLat, newLng]);

            mapInstance.setView([newLat, newLng], mapInstance.getZoom(), {
              animate: true,
              duration: 0.5
            });

            // Get address from coordinates
            const addressName = await getAddressFromCoords(newLat, newLng);
            onSelect(newLat, newLng, addressName);
          }
        });

        // Ensure map is visible and sized properly
        if (isMounted && mapInstance) {
          mapInstance.invalidateSize();
          setTimeout(() => {
            mapInstance.invalidateSize();
            try {
              mapInstance.fitBounds(circle.getBounds(), { padding: [50, 50] });
            } catch (e) {
              // fallback if fitBounds fails
              mapInstance.setView([lat, lng], 16);
            }
          }, 300);
        }

        mapInstanceRef.current = mapInstance;
      } catch (error) {
        console.error('Failed to initialize Leaflet map:', error);
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          markerRef.current = null;
          circleRef.current = null;
        } catch (e) {
          console.error('Error cleaning up map:', e);
        }
      }
    };
  }, []); // Empty dependency array - map initializes only once when component mounts

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Search address... (e.g., Manila, Philippines)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={searching}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
        >
          {searching ? 'Searching...' : '🔍 Search'}
        </button>
      </form>

      {/* Geofence Radius Slider */}
      <div className="bg-purple-50 border border-purple-300 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-purple-800">Geofence Radius</label>
          <span className="text-lg font-bold text-purple-900">{currentRadius}m</span>
        </div>
        <input
          type="range"
          min="50"
          max="2000"
          step="50"
          value={currentRadius}
          onChange={handleRadiusChange}
          className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <div className="flex justify-between text-xs text-purple-600 mt-2">
          <span>50m</span>
          <span>2000m</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">📍 Map Instructions</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• <strong>Search:</strong> Use the search bar above to find an address</li>
          <li>• <strong>Click Map:</strong> Click anywhere on the map to set location & get address</li>
          <li>• <strong>Zoom:</strong> Use mouse wheel or zoom buttons to zoom in/out</li>
          <li>• <strong>Pan:</strong> Drag the map to move around</li>
          <li>• <strong>Geofence:</strong> Adjust radius slider to change attendance zone (blue dashed circle)</li>
        </ul>
      </div>

      {/* Map Container */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className="w-full bg-gray-200 rounded-lg border-2 border-gray-300 overflow-hidden leaflet-container"
          style={{
            height: '400px',
            minHeight: '400px'
          }}
        />
        {/* Loading Indicator */}
        <div className="absolute bottom-4 right-4 bg-white px-3 py-2 rounded-lg shadow-md text-xs text-gray-600 border border-gray-300">
          🌍 OpenStreetMap
        </div>
      </div>
    </div>
  );
};

export default Campuses;
