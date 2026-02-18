import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={cn('w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent', props.className)} />; }
