import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Loader2, Save, User } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export const TeacherProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameForm, setNameForm] = useState({ name: user?.name || '', phone: '' });

  useEffect(() => {
    api.teacher.getProfile().then((r) => {
      if (r.success) {
        setNameForm({ name: r.data.name || '', phone: r.data.phone || '' });
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.teacher.updateProfile({ name: nameForm.name, phone: nameForm.phone });
      // Refreshing the cached user is best-effort: a transient failure here
      // must not surface as a failed profile update.
      await refreshUser().catch(() => undefined);
      toast.success('Profile updated successfully');
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your information and account security</p>
      </div>

      {loading ? <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div> : (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="p-6 bg-gradient-to-br from-green-600 to-teal-600 rounded-full">
                  <User className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{user?.name}</h2>
                  <p className="text-muted-foreground">{user?.email}</p>
                  <p className="text-sm text-green-600 mt-1 font-medium">Teacher</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Update Profile</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSaveName} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input className="mt-1" value={nameForm.name} onChange={(e) => setNameForm({...nameForm, name: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input className="mt-1" value={nameForm.phone} onChange={(e) => setNameForm({...nameForm, phone: e.target.value})} />
                  </div>
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
