'use client';
import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function SettingsPage(){
  return <AppShell><div className='space-y-4'><Card><h1 className='font-semibold mb-2'>Settings</h1><div className='flex items-center gap-3'><span className='text-sm'>Theme preference</span><ThemeToggle /></div></Card><Card><h2 className='font-semibold'>Security</h2><ul className='text-sm opacity-80 list-disc pl-5'><li>Credentials auth with hashed passwords.</li><li>Role checks on server routes.</li><li>Audit logs for sensitive actions.</li></ul></Card></div></AppShell>
}
