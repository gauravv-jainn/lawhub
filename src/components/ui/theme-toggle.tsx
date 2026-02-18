'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  async function updateTheme(next: 'light'|'dark') {
    setTheme(next);
    localStorage.setItem('theme', next);
    await fetch('/api/settings/theme', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ themePreference: next.toUpperCase() }) });
  }
  return (
    <button onClick={() => updateTheme(dark ? 'light' : 'dark')} className='rounded-xl border border-white/15 p-2 hover:scale-105 transition'>
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
