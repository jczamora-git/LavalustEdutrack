import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { API_ENDPOINTS, apiGet, apiPost, apiPut } from "@/lib/api";
import { useNotification } from "@/hooks/useNotification";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Announcements = () => {
  // const { user, isAuthenticated } = useAuth();
  // const navigate = useNavigate();

  // useEffect(() => {
  //   if (!isAuthenticated || user?.role !== "admin") {
  //     navigate("/auth");
  //   }
  // }, [isAuthenticated, user, navigate]);

  const notify = useNotification();
  const [announcements, setAnnouncements] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [startsAt, setStartsAt] = useState<string>("");
  const [endsAt, setEndsAt] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editAudience, setEditAudience] = useState("all");
  const [editStartsAt, setEditStartsAt] = useState<string>("");
  const [editEndsAt, setEditEndsAt] = useState<string>("");
  const [editSaving, setEditSaving] = useState(false);

  // if (!isAuthenticated) return null;

  useEffect(() => {
    let mounted = true;
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const res = await apiGet(API_ENDPOINTS.ANNOUNCEMENTS);
        // Expecting res.data or res.announcements or array directly
        const list = res.data ?? res.announcements ?? res ?? [];
        if (Array.isArray(list) && mounted) {
          setAnnouncements(list);
        }
      } catch (e) {
        console.error('Failed to fetch announcements', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAnnouncements();
    return () => { mounted = false; };
  }, []);

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Announcements</h1>
            <p className="text-muted-foreground">Create and manage system announcements</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
                </div>
                <div>
                  <Label htmlFor="starts_at">Starts At</Label>
                  <Input id="starts_at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ends_at">Ends At</Label>
                  <Input id="ends_at" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Announcement details" rows={4} />
                </div>
                <div>
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select value={audience} onValueChange={(v) => setAudience(String(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="students">Students Only</SelectItem>
                      <SelectItem value="teachers">Teachers Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button className="w-full" disabled={saving || !title || !message} onClick={async () => {
                    if (!title || !message) return notify.error('Title and message are required');
                    setSaving(true);
                    try {
                      // published_at is the current timestamp
                      let published = new Date().toISOString().slice(0,19).replace('T',' ');

                      // Helper: convert input value to SQL datetime 'YYYY-MM-DD HH:MM:SS'
                      const toSqlDatetime = (val: string) => {
                        if (!val) return null;
                        // datetime-local inputs look like 'YYYY-MM-DDTHH:MM' or 'YYYY-MM-DDTHH:MM:SS'
                        if (val.includes('T')) {
                          const withSpace = val.replace('T', ' ');
                          return withSpace.length === 16 ? `${withSpace}:00` : withSpace;
                        }
                        // date-only (YYYY-MM-DD)
                        return `${val} 00:00:00`;
                      };

                      const payload: any = {
                        title,
                        message,
                        audience,
                        status: 'active',
                        published_at: published,
                      };

                      const s = toSqlDatetime(startsAt);
                      const e = toSqlDatetime(endsAt);
                      if (s) payload.starts_at = s;
                      if (e) payload.ends_at = e;

                      const res = await apiPost(API_ENDPOINTS.ANNOUNCEMENTS, payload);
                      // Expect res.success and res.data or created object
                      const created = res.data ?? res.announcement ?? null;
                      if (created) {
                        setAnnouncements((prev) => [created, ...prev]);
                        setTitle(''); setMessage(''); setAudience('all'); setStartsAt(''); setEndsAt(''); setIsCreateOpen(false);
                        notify.success('Announcement published');
                      } else {
                        // If backend returns newly created row directly (no wrapper)
                        if (res && Array.isArray(res) === false && res.id) {
                          setAnnouncements((prev) => [res, ...prev]);
                          setTitle(''); setMessage(''); setAudience('all'); setStartsAt(''); setEndsAt(''); setIsCreateOpen(false);
                          notify.success('Announcement published');
                        } else {
                          notify.error(res?.message || 'Failed to create announcement');
                        }
                      }
                    } catch (e: any) {
                      notify.error(e?.message || 'Failed to create announcement');
                    } finally {
                      setSaving(false);
                    }
                  }}>{saving ? 'Publishing...' : 'Publish Announcement'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              All Announcements
            </CardTitle>
            <CardDescription>Manage and track announcements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{announcement.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {announcement.starts_at ? `Starts: ${new Date(announcement.starts_at).toLocaleString()}` : ''}
                      {announcement.ends_at ? ` · Ends: ${new Date(announcement.ends_at).toLocaleString()}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{announcement.audience}</Badge>
                    <Badge
                      variant={announcement.status === "active" ? "default" : "outline"}
                    >
                      {announcement.status}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => {
                      // Open edit modal and populate fields
                      setEditingId(Number(announcement.id));
                      setEditTitle(announcement.title ?? '');
                      setEditMessage(announcement.message ?? '');
                      setEditAudience(announcement.audience ?? 'all');
                      setEditStartsAt(announcement.starts_at ? (announcement.starts_at.replace(' ', 'T').slice(0,19)) : '');
                      setEditEndsAt(announcement.ends_at ? (announcement.ends_at.replace(' ', 'T').slice(0,19)) : '');
                      setIsEditOpen(true);
                    }}>
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Edit Announcement Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-starts_at">Starts At</Label>
                <Input id="edit-starts_at" type="datetime-local" value={editStartsAt} onChange={(e) => setEditStartsAt(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-ends_at">Ends At</Label>
                <Input id="edit-ends_at" type="datetime-local" value={editEndsAt} onChange={(e) => setEditEndsAt(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-message">Message</Label>
                <Textarea id="edit-message" value={editMessage} onChange={(e) => setEditMessage(e.target.value)} rows={4} />
              </div>
              <div>
                <Label htmlFor="edit-audience">Target Audience</Label>
                <Select value={editAudience} onValueChange={(v) => setEditAudience(String(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="students">Students Only</SelectItem>
                    <SelectItem value="teachers">Teachers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  <Button className="flex-1" disabled={editSaving || !editTitle || !editMessage} onClick={async () => {
                    if (!editingId) return;
                    setEditSaving(true);
                    try {
                      const toSqlDatetime = (val: string) => {
                        if (!val) return null;
                        if (val.includes('T')) {
                          const withSpace = val.replace('T', ' ');
                          return withSpace.length === 16 ? `${withSpace}:00` : withSpace;
                        }
                        return `${val} 00:00:00`;
                      };

                      const payload: any = {
                        title: editTitle,
                        message: editMessage,
                        audience: editAudience,
                        status: 'active',
                      };
                      const s = toSqlDatetime(editStartsAt);
                      const e = toSqlDatetime(editEndsAt);
                      if (s) payload.starts_at = s;
                      if (e) payload.ends_at = e;

                      const res = await apiPut(API_ENDPOINTS.ANNOUNCEMENT_BY_ID(editingId), payload);
                      if (res && (res.success || res.id)) {
                        // Update local list
                        setAnnouncements((prev) => prev.map((a) => a.id === editingId ? ({ ...a, ...payload, id: editingId }) : a));
                        setIsEditOpen(false);
                        notify.success('Announcement updated');
                      } else {
                        notify.error(res?.message || 'Failed to update announcement');
                      }
                    } catch (err: any) {
                      notify.error(err?.message || 'Failed to update announcement');
                    } finally {
                      setEditSaving(false);
                    }
                  }}>{editSaving ? 'Saving...' : 'Save Changes'}</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Announcements;
