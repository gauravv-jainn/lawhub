export async function sendReminderEmail(to: string, subject: string, body: string) {
  console.log('[DEV EMAIL]', { to, subject, body });
}
