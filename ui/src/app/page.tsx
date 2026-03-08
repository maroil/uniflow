import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Uniflow CDP</h1>
        <p className="text-gray-500 mb-8">Open-source Customer Data Platform</p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { href: '/sources', label: 'Sources', desc: 'Manage data sources' },
            { href: '/destinations', label: 'Destinations', desc: 'Configure connectors' },
            { href: '/profiles', label: 'Profiles', desc: 'Explore customer profiles' },
            { href: '/segments', label: 'Segments', desc: 'Build audiences' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-sm transition-all"
            >
              <h2 className="text-lg font-semibold text-gray-800">{item.label}</h2>
              <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
