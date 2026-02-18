'use client';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';

export function KpiGrid({ items }: { items: { label: string; value: number | string; tone?: string }[] }) {
  return <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-4'>{items.map((k, i) => <motion.div key={k.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}><Card><p className='text-xs opacity-70'>{k.label}</p><p className={`text-2xl font-bold ${k.tone ?? ''}`}>{k.value}</p></Card></motion.div>)}</div>;
}
