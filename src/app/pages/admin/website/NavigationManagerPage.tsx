import React, { useCallback, useEffect, useState } from 'react';
import { List, Plus, Pencil, Trash2, Loader2, Link2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';

interface NavItem {
  id: string;
  label: string;
  href: string;
  parentId: string | null;
  position: number;
  visibility: boolean;
  target: string;
  isSystem: boolean;
}

const EMPTY_FORM = { label: '', href: '', position: 0, visibility: true, target: 'self' };

export const NavigationManagerPage: React.FC = () => {
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NavItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getNavigation();
      if (res.success) setItems(res.data ?? []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load navigation');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); };

  const openEdit = (item: NavItem) => {
    setEditing(item);
    setForm({ label: item.label, href: item.href, position: item.position, visibility: item.visibility, target: item.target });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.label.trim() || !form.href.trim()) {
      toast.error('Label and link are required');
      return;
    }
    setSaving(true);
    try {
      const res = editing
        ? await api.admin.updateNavigationItem(editing.id, form)
        : await api.admin.createNavigationItem(form);
      toast.success(res?.message || 'Saved');
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save navigation item');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (item: NavItem) => {
    setBusyId(item.id);
    try {
      await api.admin.updateNavigationItem(item.id, { visibility: !item.visibility });
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update item');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: NavItem) => {
    if (!window.confirm(`Delete navigation item "${item.label}"?`)) return;
    setBusyId(item.id);
    try {
      const res = await api.admin.deleteNavigationItem(item.id);
      toast.success(res?.message || 'Deleted');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete item');
    } finally {
      setBusyId(null);
    }
  };

  const sorted = [...items].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Order and rename the public site menu. System items cannot be deleted — hide them instead.</p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add item
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : sorted.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <List className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              No navigation items yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sorted.map((item) => (
                <div key={item.id} className={`flex items-center gap-4 p-4 hover:bg-gray-50 ${item.visibility ? '' : 'opacity-50'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{item.label}</h3>
                      {item.isSystem && <Badge className="bg-blue-50 text-blue-700">System</Badge>}
                      {!item.visibility && <Badge className="bg-gray-100 text-gray-500">Hidden</Badge>}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                      <Link2 className="h-3 w-3 shrink-0" /> {item.href}
                      {item.target === '_blank' ? ' · opens in new tab' : ''}
                      {item.position > 0 ? ` · position ${item.position}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {busyId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    ) : (
                      <Switch checked={item.visibility} onCheckedChange={() => toggleVisibility(item)} title="Show/hide in menu" />
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" disabled={item.isSystem}
                      onClick={() => remove(item)} title={item.isSystem ? 'System items cannot be deleted' : 'Delete'}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit navigation item' : 'Add navigation item'}</DialogTitle>
            <DialogDescription>Links can point to any page of this site or an external URL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label *</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Scholarships" />
            </div>
            <div>
              <Label>Link *</Label>
              <Input value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} placeholder="e.g. /admissions or https://example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Position</Label>
                <Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: parseInt(e.target.value || '0') })} />
              </div>
              <div>
                <Label>Open in</Label>
                <select
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="self">Same tab</option>
                  <option value="_blank">New tab</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
              <div>
                <Label className="text-sm font-medium">Visible in menu</Label>
                <p className="text-xs text-gray-400 mt-0.5">Hidden items stay accessible via direct links</p>
              </div>
              <Switch checked={form.visibility} onCheckedChange={(v) => setForm({ ...form, visibility: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
