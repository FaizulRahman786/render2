import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Loader2, Save, User } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: '',
    parentName: '',
    parentPhone: '',
    address: '',
    class: '',
    board: '',
  });

  useEffect(() => {
    api.student.getProfile().then((r) => {
      if (r.success) {
        setProfile(r.data);
        const p = r.data.profile || r.data;
        setForm({
          phone: r.data.phone || '',
          parentName: p.parentName || '',
          parentPhone: p.parentPhone || '',
          address: p.address || '',
          class: p.class || '',
          board: p.board || '',
        });
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.student.updateProfile(form);
      toast.success('Profile updated successfully');
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your personal information and security</p>
      </div>
      {loading ? <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div> : (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="p-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full">
                  <User className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{profile?.name}</h2>
                  <p className="text-muted-foreground">{profile?.email}</p>
                  <p className="text-sm text-blue-600 mt-1 font-medium">Student</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Update Profile</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Phone Number</Label><Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
                  <div><Label>Parent/Guardian Name</Label><Input value={form.parentName} onChange={(e) => setForm({...form, parentName: e.target.value})} /></div>
                  <div><Label>Parent Phone</Label><Input value={form.parentPhone} onChange={(e) => setForm({...form, parentPhone: e.target.value})} /></div>
                  <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
                  <div><Label>Class</Label><Input value={form.class} onChange={(e) => setForm({...form, class: e.target.value})} /></div>
                  <div><Label>Board</Label><Input value={form.board} onChange={(e) => setForm({...form, board: e.target.value})} /></div>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
