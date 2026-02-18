import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn('rounded-xl px-4 py-2 text-sm font-medium bg-accent text-white hover:opacity-90 transition shadow-glow disabled:opacity-50', className)} {...props} />;
}
