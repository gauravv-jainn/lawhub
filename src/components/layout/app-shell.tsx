'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { CommandPalette } from '@/components/ui/command-palette';

const nav = [
  ['Dashboard','/dashboard'],['Clients','/clients'],['Matters','/matters'],['Calendar','/calendar'],['Intake','/intake'],['Templates','/templates'],['Sync','/sync'],['Settings','/settings']
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className='min-h-screen grid md:grid-cols-[220px_1fr]'>
      <aside className='hidden md:block border-r border-white/10 p-4 sticky top-0 h-screen'>
        <h1 className='font-bold text-lg mb-6'>CivilCaseOS</h1>
        <nav className='space-y-1'>{nav.map(([label,href])=><Link key={href} href={href} className={`block rounded-lg px-3 py-2 text-sm ${path===href?'bg-accent text-white':'hover:bg-white/10'}`}>{label}</Link>)}</nav>
      </aside>
      <main>
        <header className='border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 bg-bg/90 backdrop-blur z-10'>
          <p className='text-sm opacity-70'>Civil Litigation Practice Management</p>
          <ThemeToggle />
        </header>
        <div className='p-4'>{children}</div>
      </main>
      <CommandPalette />
    </div>
  );
}
