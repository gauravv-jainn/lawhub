import { redirect } from 'next/navigation';

// NGO cases are now created through the brief system — redirect to post a brief
export default function NGOCaseNewRedirect() {
  redirect('/ngo/briefs/new');
}
