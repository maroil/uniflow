'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database, Zap, Users, Radio, ArrowRight, Activity } from 'lucide-react';

interface Stats {
  sources: number;
  destinations: number;
  segments: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ sources: 0, destinations: 0, segments: 0 });
  const [loading, setLoading] = useState(true);
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase}/api/sources`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`${apiBase}/api/destinations`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`${apiBase}/api/segments`).then((r) => r.json()).catch(() => ({ items: [] })),
    ]).then(([s, d, seg]) => {
      setStats({
        sources: s.items?.length ?? 0,
        destinations: d.items?.length ?? 0,
        segments: seg.items?.length ?? 0,
      });
      setLoading(false);
    });
  }, [apiBase]);

  const cards = [
    { label: 'Sources', value: stats.sources, icon: Radio, href: '/sources', color: 'blue' },
    { label: 'Destinations', value: stats.destinations, icon: Zap, href: '/destinations', color: 'green' },
    { label: 'Segments', value: stats.segments, icon: Users, href: '/segments', color: 'purple' },
    { label: 'Profiles', value: '--', icon: Database, href: '/profiles', color: 'amber' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Uniflow CDP overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[card.color]}`}>
                <card.icon size={20} />
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '...' : card.value}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Getting Started</h2>
          </div>
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Create a <Link href="/sources" className="text-blue-600 hover:underline">Source</Link> and copy the write key</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Install <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">@uniflow/js</code> and start tracking events</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>Add a <Link href="/destinations" className="text-blue-600 hover:underline">Destination</Link> to forward events</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>Create a <Link href="/segments" className="text-blue-600 hover:underline">Segment</Link> to group users by behavior</span>
            </li>
          </ol>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Quick Integration</h2>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-100 overflow-x-auto">
            <pre>{`import { UnifowClient } from '@uniflow/js';

const analytics = new UnifowClient({
  writeKey: 'YOUR_WRITE_KEY',
  host: 'YOUR_INGEST_URL',
});

analytics.identify({
  userId: 'user_123',
  traits: { email: 'user@example.com' },
});

analytics.track({
  event: 'Button Clicked',
  properties: { button: 'signup' },
});`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
