'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Radio, Zap, Users, Search, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-8 flex items-center h-14 gap-8">
        <Link href="/" className="font-bold text-lg text-gray-900 mr-4">
          Uniflow
        </Link>
        <div className="flex items-center gap-1 flex-1">
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
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:inline">{user.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1.5 rounded-md hover:bg-gray-50"
              title="Sign out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
