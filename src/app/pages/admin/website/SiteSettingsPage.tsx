import React, { useCallback, useEffect, useState } from 'react';
import { Building2, MessageCircle, Home, Save, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';

const CONTACT_KEYS = ['instituteName', 'email', 'phone', 'website', 'address'];
const WHATSAPP_KEYS = ['whatsappNumber', 'whatsappMessage'];
const HOMEPAGE_KEYS = ['homepageMode', 'homepageCustomPageSlug'];

export const SiteSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [customPages, setCustomPages] = useState<{ id: string; name: string; slug: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([api.admin.getSettings(), api.admin.getCustomPages()]);
      const map: Record<string, string> = {};
      Object.entries(sRes.data ?? {}).forEach(([key, value]) => { map[key] = String(value); });
      setSettings(map);
      setCustomPages(cRes?.data ?? []);
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key: string, value: string) => { setSettings((s) => ({ ...s, [key]: value })); setDirty(true); };

  const saveAll = async () => {
    setSaving(true);
    try {
      const res = await api.admin.saveSettings(settings);
      toast.success(res?.message || 'Settings saved');
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const customMode = (settings.homepageMode || 'cms') === 'custom';
  const publishedCustom = customPages.filter((p) => p.status === 'published');

  const Section = ({ icon: Icon, title, children, keys }: { icon: React.ElementType; title: string; children: React.ReactNode; keys: string[] }) => {
    const hasChanges = keys.some((k) => settings[k] !== undefined) || dirty;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4 text-blue-600" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <Section icon={Building2} title="Institute contact details" keys={CONTACT_KEYS}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Institute name</Label>
            <Input value={settings.instituteName || ''} onChange={(e) => set('instituteName', e.target.value)} />
          </div>
          <div>
            <Label>Website</Label>
            <Input value={settings.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={settings.email || ''} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={settings.phone || ''} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Textarea rows={2} value={settings.address || ''} onChange={(e) => set('address', e.target.value)} />
          </div>
        </div>
      </Section>

      <Section icon={MessageCircle} title="WhatsApp widget" keys={WHATSAPP_KEYS}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>WhatsApp number</Label>
            <Input value={settings.whatsappNumber || ''} onChange={(e) => set('whatsappNumber', e.target.value)} placeholder="e.g. 919876543210 (with country code)" />
          </div>
          <div>
            <Label>Pre-filled message</Label>
            <Input value={settings.whatsappMessage || ''} onChange={(e) => set('whatsappMessage', e.target.value)} placeholder="e.g. Hi! I would like to know more about admissions" />
          </div>
        </div>
        <p className="text-xs text-gray-400">When set, a WhatsApp chat button appears on the public site.</p>
      </Section>

      <Section icon={Home} title="Homepage mode" keys={HOMEPAGE_KEYS}>
        <div className="space-y-4">
          <div>
            <Label>Homepage</Label>
            <select
              value={settings.homepageMode || 'cms'}
              onChange={(e) => set('homepageMode', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="cms">CMS homepage (sections below)</option>
              <option value="custom">Custom page (full control)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {customMode
                ? 'The selected custom page becomes the site homepage. Keep it published — otherwise visitors see the CMS homepage as a fallback.'
                : 'The homepage is built from the sections managed under Homepage sections.'}
            </p>
          </div>
          {customMode && (
            <div>
              <Label>Custom homepage page</Label>
              <select
                value={settings.homepageCustomPageSlug || ''}
                onChange={(e) => set('homepageCustomPageSlug', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="">— Choose a published custom page —</option>
                {publishedCustom.map((p) => (
                  <option key={p.id} value={p.slug}>{p.name} (/{p.slug})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <Button onClick={saveAll} disabled={saving || !dirty}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save settings
        </Button>
        {!dirty && <p className="text-xs text-gray-400">No unsaved changes</p>}
      </div>
    </div>
  );
};
