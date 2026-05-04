import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default function Home() {
  const token = cookies().get('cp_token')?.value;
  redirect(token ? '/dashboard' : '/auth');
}
