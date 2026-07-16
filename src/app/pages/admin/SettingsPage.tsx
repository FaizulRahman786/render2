import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Building2, Bell, Shield, DollarSign, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

const DEFAULT_SETTINGS = {
  instituteName: 'Excellence Coaching Institute',
  email: 'admin@excellence.edu.in',
  phone: '9876500000',
  website: '',
  address: '123, Coaching Hub, Sector 18, Noida, UP – 201301',
  notifFeeReminder: 'true',
  notifClassAlert: 'true',
  notifTestResult: 'true',
  notifAnnouncement: 'false',
  feeInstallments: 'true',
  lateFeeEnabled: 'true',
  lateFeePercent: '2',
};

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.admin.getSettings().then(r => {
      if (r.success && Object.keys(r.data).length) {
        setSettings({ ...DEFAULT_SETTINGS, ...r.data });
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));
  const toggle = (key: string) => setSettings(prev => ({ ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' }));

  const save = async (section: string, keys: string[]) => {
    setSaving(section);
    try {
      const patch: Record<string, string> = {};
      keys.forEach(k => { patch[k] = settings[k]; });
      await api.admin.saveSettings(patch);
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const SaveBtn = ({ section, keys, color }: { section: string; keys: string[]; color: string }) => (
    <div className="flex justify-end">
      <Button
        className={`bg-gradient-to-r ${color}`}
        disabled={saving === section}
        onClick={() => save(section, keys)}
      >
        {saving === section ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save</>}
      </Button>
    </div>
  );

  if (loading) return (
    <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-muted-foreground mt-2">Configure institute information and platform preferences</p>
      </div>

      {/* Institute Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Institute Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Institute Name</Label>
              <Input value={settings.instituteName} onChange={e => set('instituteName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" value={settings.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={settings.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input placeholder="https://www.yourcoaching.com" value={settings.website} onChange={e => set('website', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Input value={settings.address} onChange={e => set('address', e.target.value)} />
            </div>
          </div>
          <SaveBtn section="institute" keys={['instituteName', 'email', 'phone', 'website', 'address']} color="from-blue-600 to-purple-600" />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'notifFeeReminder', label: 'Fee Due Reminders', desc: 'Send automatic reminders to students with pending fees' },
            { key: 'notifClassAlert', label: 'Class Schedule Alerts', desc: 'Notify students and teachers before a class starts' },
            { key: 'notifTestResult', label: 'Test Result Notifications', desc: 'Notify students when their test results are published' },
            { key: 'notifAnnouncement', label: 'General Announcements', desc: 'Push announcements to all users when posted' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={settings[item.key] === 'true'}
                onCheckedChange={() => toggle(item.key)}
              />
            </div>
          ))}
          <SaveBtn section="notifications" keys={['notifFeeReminder', 'notifClassAlert', 'notifTestResult', 'notifAnnouncement']} color="from-orange-600 to-amber-500" />
        </CardContent>
      </Card>

      {/* Fee Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Fee Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Allow Fee Installments</p>
              <p className="text-sm text-muted-foreground">Let students pay course fees in multiple installments</p>
            </div>
            <Switch checked={settings.feeInstallments === 'true'} onCheckedChange={() => toggle('feeInstallments')} />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Late Fee Penalty</p>
              <p className="text-sm text-muted-foreground">Apply a percentage penalty on overdue fee payments</p>
            </div>
            <Switch checked={settings.lateFeeEnabled === 'true'} onCheckedChange={() => toggle('lateFeeEnabled')} />
          </div>
          {settings.lateFeeEnabled === 'true' && (
            <div className="space-y-2 max-w-xs">
              <Label>Late Fee Percentage (%)</Label>
              <Input type="number" value={settings.lateFeePercent} onChange={e => set('lateFeePercent', e.target.value)} min="0" max="20" />
            </div>
          )}
          <SaveBtn section="fees" keys={['feeInstallments', 'lateFeeEnabled', 'lateFeePercent']} color="from-green-600 to-teal-600" />
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Supabase Authentication</p>
                <p className="text-sm text-muted-foreground">Admin identity is managed through Supabase phone OTP or Google sign-in.</p>
              </div>
              <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
