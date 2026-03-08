'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';

interface Segment {
  id: string;
  name: string;
  description?: string;
  rules: Array<{ field: string; operator: string; value?: unknown }>;
  createdAt: string;
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSegment, setNewSegment] = useState({ name: '', description: '' });

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';

  useEffect(() => {
    fetch(`${apiBase}/api/segments`)
      .then((r) => r.json())
      .then((d) => setSegments(d.items ?? []))
      .finally(() => setLoading(false));
  }, [apiBase]);

  async function createSegment() {
    const res = await fetch(`${apiBase}/api/segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newSegment, rules: [] }),
    });
    const data = await res.json();
    setSegments((prev) => [...prev, data]);
    setNewSegment({ name: '', description: '' });
    setShowCreate(false);
  }

  async function deleteSegment(id: string) {
    await fetch(`${apiBase}/api/segments/${id}`, { method: 'DELETE' });
    setSegments((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Segments</h1>
          <p className="text-gray-500 text-sm mt-1">Rule-based audience segments</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={16} /> New Segment
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h3 className="font-medium mb-3">Create Segment</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newSegment.name}
              onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
              placeholder="Segment name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={newSegment.description}
              onChange={(e) => setNewSegment({ ...newSegment, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={createSegment}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Create
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
      ) : segments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No segments yet.</div>
      ) : (
        <div className="space-y-3">
          {segments.map((seg) => (
            <div key={seg.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users size={18} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">{seg.name}</p>
                  <p className="text-xs text-gray-500">
                    {seg.rules.length} rule{seg.rules.length !== 1 ? 's' : ''} ·{' '}
                    {new Date(seg.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteSegment(seg.id)}
                className="p-2 text-gray-400 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
