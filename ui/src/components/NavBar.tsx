'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Radio, Zap, Users, Search, Settings } from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sources', label: 'Sources', icon: Radio },
  { href: '/destinations', label: 'Destinations', icon: Zap },
  { href: '/profiles', label: 'Profiles', icon: Search },
  { href: '/segments', label: 'Segments', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-8 flex items-center h-14 gap-8">
        <Link href="/" className="font-bold text-lg text-gray-900 mr-4">
          Uniflow
        </Link>
        <div className="flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <link.icon size={15} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
