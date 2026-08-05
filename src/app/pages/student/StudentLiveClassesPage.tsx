import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Loader2, Video, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';

export const StudentLiveClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.student.getLiveClasses().then((r) => { if (r.success) setClasses(r.data); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const live = classes.filter(c => c.status === 'live');
  const upcoming = classes.filter(c => c.status === 'scheduled');
  const past = classes.filter(c => c.status === 'completed' || c.status === 'cancelled');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Live Classes</h1>
        <p className="text-muted-foreground mt-2">Upcoming and current live teaching sessions</p>
      </div>

      {live.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Live Now</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {live.map((c) => (
              <Card key={c.id} className="border-red-200 bg-red-50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="h-5 w-5 text-red-600" />
                    <Badge className="bg-red-600">Live Now</Badge>
                  </div>
                  <h3 className="font-bold mb-1">{c.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    📅 {c.scheduledDate ? new Date(c.scheduledDate).toLocaleString() : '—'}
                    {c.duration ? ` • ⏱ ${c.duration} min` : ''}
                  </p>
                  {c.meetingLink && (
                    <a href={c.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-red-600 hover:bg-red-700">
                        <ExternalLink className="h-3 w-3 mr-1" /> Join Class
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Upcoming Classes</h2>
        {loading ? <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((c) => (
              <Card key={c.id} className="border-blue-200 bg-blue-50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="h-5 w-5 text-blue-600" />
                    <Badge className="bg-blue-600">{c.status}</Badge>
                  </div>
                  <h3 className="font-bold mb-1">{c.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">📅 {c.scheduledDate ? new Date(c.scheduledDate).toLocaleString() : '—'} • ⏱ {c.duration || 60} min</p>
                  {c.meetingLink && (
                    <a href={c.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <ExternalLink className="h-3 w-3 mr-1" /> Join Class
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
            {upcoming.length === 0 && <p className="text-muted-foreground col-span-2">No upcoming classes scheduled</p>}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Past Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {past.map((c) => (
              <Card key={c.id} className="opacity-75">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="h-5 w-5 text-gray-400" />
                    <Badge variant="secondary">{c.status}</Badge>
                  </div>
                  <h3 className="font-medium mb-1">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">📅 {c.scheduledDate ? new Date(c.scheduledDate).toLocaleString() : '—'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
