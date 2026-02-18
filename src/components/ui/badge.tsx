import { cn } from '@/lib/utils';
export function Badge({children,className}:{children:React.ReactNode,className?:string}){return <span className={cn('px-2 py-1 rounded-full text-xs bg-accent/20 text-accent',className)}>{children}</span>}
