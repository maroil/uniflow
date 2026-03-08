'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';

interface Source {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  writeKey?: string;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';

  useEffect(() => {
    fetch(`${apiBase}/api/sources`)
      .then((r) => r.json())
      .then((d) => setSources(d.items ?? []))
      .finally(() => setLoading(false));
  }, [apiBase]);

  async function createSource() {
    const res = await fetch(`${apiBase}/api/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    setSources((prev) => [...prev, data]);
    setNewName('');
    setShowCreate(false);
  }

  async function deleteSource(id: string) {
    await fetch(`${apiBase}/api/sources/${id}`, { method: 'DELETE' });
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sources</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your event sources and write keys</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={16} /> New Source
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h3 className="font-medium mb-3">Create Source</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Source name (e.g. Production Web)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={createSource}
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
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : sources.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No sources yet. Create one to start tracking events.
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div key={source.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{source.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  ID: {source.id} · Created {new Date(source.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(source.id)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Copy ID"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => deleteSource(source.id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
