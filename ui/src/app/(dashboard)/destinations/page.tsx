'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';

interface Destination {
  id: string;
  name: string;
  type: 'webhook' | 's3-export';
  enabled: boolean;
  createdAt: string;
}

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'webhook' as const, webhookUrl: '' });

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';

  useEffect(() => {
    fetch(`${apiBase}/api/destinations`)
      .then((r) => r.json())
      .then((d) => setDestinations(d.items ?? []))
      .finally(() => setLoading(false));
  }, [apiBase]);

  async function createDestination() {
    const config = form.type === 'webhook' ? { url: form.webhookUrl } : {};
    const res = await fetch(`${apiBase}/api/destinations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, type: form.type, config, enabled: true }),
    });
    const data = await res.json();
    setDestinations((prev) => [...prev, data]);
    setForm({ name: '', type: 'webhook', webhookUrl: '' });
    setShowCreate(false);
  }

  async function deleteDestination(id: string) {
    await fetch(`${apiBase}/api/destinations/${id}`, { method: 'DELETE' });
    setDestinations((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Destinations</h1>
          <p className="text-gray-500 text-sm mt-1">Configure event connectors</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={16} /> Add Destination
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h3 className="font-medium mb-3">Add Destination</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Destination name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="webhook">Webhook</option>
              <option value="s3-export">S3 Export</option>
            </select>
            {form.type === 'webhook' && (
              <input
                type="url"
                value={form.webhookUrl}
                onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                placeholder="https://example.com/webhook"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={createDestination}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : destinations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No destinations yet.</div>
      ) : (
        <div className="space-y-3">
          {destinations.map((dest) => (
            <div key={dest.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Zap size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="font-medium">{dest.name}</p>
                  <p className="text-xs text-gray-500">{dest.type} · {dest.enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
              <button onClick={() => deleteDestination(dest.id)} className="p-2 text-gray-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
