import React, { useCallback, useEffect, useState } from 'react';
import { LayoutDashboard, Loader2, Pencil } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero banner',
  stats: 'Institute stats',
  about: 'About preview',
  features: 'Features',
  courses: 'Courses',
  faculty: 'Faculty',
  testimonials: 'Testimonials',
  achievements: 'Achievements',
  results: 'Results',
  notices: 'Notices',
  events: 'Events',
  gallery: 'Gallery',
  blog: 'Blog',
  faqs: 'FAQs',
  contact: 'Contact',
};

interface Section {
  key: string;
  enabled: boolean;
  title: string | null;
  subtitle: string | null;
  sortOrder: number;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

export const HomepageSectionsPage: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getHomepageSections();
      if (res.success) setSections(res.data ?? []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load homepage sections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (s: Section, enabled: boolean) => {
    setSavingKey(s.key);
    try {
      const res = await api.admin.updateHomepageSection(s.key, { enabled });
      toast.success(res?.message || (enabled ? 'Section enabled' : 'Section hidden'));
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update section');
    } finally {
      setSavingKey(null);
    }
  };

  const openEdit = (s: Section) => {
    setEditKey(s.key);
    setForm({ title: s.title || '', subtitle: s.subtitle || '', ctaLabel: s.ctaLabel || '', ctaUrl: s.ctaUrl || '', sortOrder: s.sortOrder });
  };

  const saveEdit = async () => {
    if (!editKey) return;
    setSavingKey(editKey);
    try {
      const payload: Record<string, any> = {
        title: form.title || null,
        subtitle: form.subtitle || null,
        ctaLabel: form.ctaLabel || null,
        ctaUrl: form.ctaUrl || null,
        sortOrder: parseInt(form.sortOrder || '0') || 0,
      };
      const res = await api.admin.updateHomepageSection(editKey, payload);
      toast.success(res?.message || 'Section saved');
      setEditKey(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save section');
    } finally {
      setSavingKey(null);
    }
  };

  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const enabledCount = sections.filter((s) => s.enabled).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {enabledCount} of {sections.length} sections are live. Toggle sections on/off; they appear on the homepage in order.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(9)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)
        ) : sorted.map((s) => (
          <Card key={s.key} className={s.enabled ? '' : 'opacity-60'}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4 text-blue-600 shrink-0" />
                    <h3 className="font-semibold text-gray-900 truncate">{SECTION_LABELS[s.key] || s.key}</h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">/{s.key}</p>
                </div>
                {savingKey === s.key ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                ) : (
                  <Switch checked={s.enabled} onCheckedChange={(v) => toggle(s, v)} />
                )}
              </div>
              {s.title && <p className="text-sm text-gray-600 mt-2 truncate">{s.title}</p>}
              {s.subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{s.subtitle}</p>}
              <div className="flex items-center justify-between mt-3">
                <Badge className={s.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {s.enabled ? 'Visible' : 'Hidden'}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editKey} onOpenChange={(o) => !o && setEditKey(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit section — {editKey ? (SECTION_LABELS[editKey] || editKey) : ''}</DialogTitle>
            <DialogDescription>Heading, subtext and call-to-action shown on the homepage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Textarea rows={2} value={form.subtitle || ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Button label</Label>
                <Input value={form.ctaLabel || ''} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="e.g. Explore courses" />
              </div>
              <div>
                <Label>Button link</Label>
                <Input value={form.ctaUrl || ''} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="/courses" />
              </div>
            </div>
            <div>
              <Label>Order</Label>
              <Input type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditKey(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingKey === editKey}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
