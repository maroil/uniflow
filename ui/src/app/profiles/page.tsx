'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface Profile {
  pk: string;
  updatedAt?: string;
  traits?: Record<string, unknown>;
}

interface ProfileEvent {
  sk: string;
  type: string;
  event?: string;
  timestamp: string;
}

export default function ProfilesPage() {
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<ProfileEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';

  async function search() {
    if (!userId.trim()) return;
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`${apiBase}/api/profiles/${encodeURIComponent(userId.trim())}`);
      if (res.status === 404) {
        setNotFound(true);
        setProfile(null);
        setEvents([]);
        return;
      }
      const data = await res.json();
      setProfile(data.profile);
      setEvents(data.events ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Profile Explorer</h1>
      <p className="text-gray-500 text-sm mb-6">Look up unified customer profiles</p>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Enter user ID..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm"
        />
        <button
          onClick={search}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Search size={16} /> Search
        </button>
      </div>

      {loading && <div className="text-center py-12 text-gray-500">Loading...</div>}

      {notFound && (
        <div className="text-center py-12 text-gray-500">No profile found for "{userId}"</div>
      )}

      {profile && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold mb-3">Profile</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">User ID</div>
              <div className="font-mono">{profile.pk?.replace('PROFILE#', '')}</div>
              {profile.updatedAt && (
                <>
                  <div className="text-gray-500">Last Seen</div>
                  <div>{new Date(profile.updatedAt).toLocaleString()}</div>
                </>
              )}
            </div>
          </div>

          {events.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold mb-3">Recent Events ({events.length})</h2>
              <div className="space-y-2">
                {events.slice(0, 20).map((ev) => (
                  <div key={ev.sk} className="flex items-center gap-3 text-sm py-2 border-b border-gray-100 last:border-0">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">{ev.type}</span>
                    <span className="flex-1 text-gray-700">{ev.event ?? ev.type}</span>
                    <span className="text-gray-400 text-xs">{new Date(ev.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
