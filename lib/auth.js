import { cookies, headers } from 'next/headers';
import crypto from 'crypto';
import { sql } from './db';
export const sha = s => crypto.createHash('sha256').update(s).digest('hex');
export async function ip() { return ((await headers()).get('x-forwarded-for') || 'x').split(',')[0].trim(); }
export async function limit(key, max, sec) {
  const r = await sql`insert into rate(key,n,ts) values(${key},1,now()) on conflict(key) do update set
    n=case when rate.ts < now()-make_interval(secs=>${sec}) then 1 else rate.n+1 end,
    ts=case when rate.ts < now()-make_interval(secs=>${sec}) then now() else rate.ts end returning n`;
  return r[0].n <= max;
}
export async function startSession(userId) {
  const t = crypto.randomBytes(32).toString('hex');
  await sql`insert into sessions values(${sha(t)},${userId}, now()+interval '7 days')`;
  (await cookies()).set('sid', t, { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 604800 });
}
export async function currentUser() {
  const t = (await cookies()).get('sid')?.value; if (!t) return null;
  const r = await sql`select u.id,u.username from sessions s join users u on u.id=s.user_id where s.token_hash=${sha(t)} and s.expires_at>now()`;
  return r[0] || null;
}
export async function endSession() {
  const ck = await cookies(), t = ck.get('sid')?.value;
  if (t) await sql`delete from sessions where token_hash=${sha(t)}`; ck.delete('sid');
}
export function recoveryCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = crypto.randomBytes(20);
  const s = [...b].map(x => A[x % 32]).join('');
  return 'REC-' + s.match(/.{5}/g).join('-');
}
