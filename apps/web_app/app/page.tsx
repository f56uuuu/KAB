import { redirect } from 'next/navigation';

export default function RootPage() {
  // Middleware decides login vs home from here — this route is intentionally
  // never rendered itself.
  redirect('/home');
}
