import { redirect } from 'next/navigation';

// Legacy route — redirect to the renamed proposals page
export default function LegacyBidsPage() {
  redirect('/lawyer/proposals');
}
