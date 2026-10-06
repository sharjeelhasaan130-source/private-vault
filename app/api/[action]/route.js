import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { hash, verify } from '@node-rs/argon2';
import { sql } from '@/lib/db';
import { sha, ip, limit, startSession, currentUser, endSession, recoveryCode } from '@/lib/auth';
import { putUrl, getUrl, head, remove } from '@/lib/s3';

const json = (data, status = 200) => NextResponse.json(data, { status });

export async function POST(req, { params }) {
  const { action } = await params;

  try {
    const body = await req.json();

    if (action === 'register') {
      const u = String(body.u || '').trim().toLowerCase();
      const p = String(body.p || '');

      if (!/^[a-z0-9_]{3,24}$/.test(u))
        return json({ error: 'Username must be 3-24 characters using lowercase letters, numbers, or underscore.' }, 400);

      if (p.length < 8)
        return json({ error: 'Password must be at least 8 characters.' }, 400);

      if (!(await limit(`reg:${await ip()}`, 5, 3600)))
        return json({ error: 'Too many attempts. Please try again later.' }, 429);

      const exists = await sql`select id from users where username=${u}`;
      if (exists.length)
        return json({ error: 'Username already exists.' }, 409);

      const pw = await hash(p);
      const code = recoveryCode();

      const r = await sql`
        insert into users(username,pw_hash,recovery_hash)
        values(${u},${pw},${sha(code)})
        returning id
      `;

      await startSession(r[0].id);
      return json({ code });
    }

    if (action === 'login') {
      const u = String(body.u || '').trim().toLowerCase();
      const p = String(body.p || '');

      if (!(await limit(`login:${await ip()}`, 20, 900)))
        return json({ error: 'Too many login attempts. Please try again later.' }, 429);

      const r = await sql`
        select id,pw_hash from users where username=${u}
      `;

      if (!r.length || !(await verify(r[0].pw_hash, p)))
        return json({ error: 'Invalid username or password.' }, 401);

      await startSession(r[0].id);
      return json({ ok: true });
    }

    if (action === 'lookup') {
      const code = String(body.code || '').trim().toUpperCase();

      const r = await sql`
        select username from users where recovery_hash=${sha(code)}
      `;

      if (!r.length)
        return json({ error: 'Invalid recovery code.' }, 404);

      return json({ username: r[0].username });
    }

    if (action === 'logout') {
      await endSession();
      return json({ ok: true });
    }

    if (action === 'list') {
      const user = await currentUser();

      if (!user)
        return json({ error: 'Not logged in.' }, 401);

      const q = String(body.q || '').trim();
      const sort = String(body.sort || 'new');

      let order = 'created_at desc';
      if (sort === 'old') order = 'created_at asc';
      if (sort === 'name') order = 'name asc';
      if (sort === 'size') order = 'size desc';

      const files = q
        ? await sql`select id,name,mime,size,object_key,status,created_at from files where user_id=${user.id} and name ilike ${'%' + q + '%'} order by created_at desc`
        : await sql`select id,name,mime,size,object_key,status,created_at from files where user_id=${user.id} order by created_at desc`;

      return json({ files, user: user.username });
    }

    if (action === 'init') {
      const user = await currentUser();

      if (!user)
        return json({ error: 'Not logged in.' }, 401);

      const name = String(body.name || '');
      const size = Number(body.size || 0);
      const type = String(body.type || 'application/octet-stream');

      if (!name || size < 0)
        return json({ error: 'Invalid file.' }, 400);

      const id = crypto.randomUUID();
      const key = `${user.id}/${id}/${name}`;

      await sql`
        insert into files(id,user_id,name,mime,size,object_key,status)
        values(${id},${user.id},${name},${type},${size},${key},'pending')
      `;

      const url = await putUrl(key, type);

      return json({ id, url, mime: type });
    }

    if (action === 'done') {
      const user = await currentUser();

      if (!user)
        return json({ error: 'Not logged in.' }, 401);

      const id = String(body.id || '');

      const r = await sql`
        select object_key from files
        where id=${id} and user_id=${user.id}
      `;

      if (!r.length)
        return json({ error: 'File not found.' }, 404);

      try {
        await head(r[0].object_key);
      } catch {
        return json({ error: 'Uploaded file was not found.' }, 400);
      }

      await sql`
        update files set status='ready'
        where id=${id} and user_id=${user.id}
      `;

      return json({ ok: true });
    }

    if (action === 'url') {
      const user = await currentUser();

      if (!user)
        return json({ error: 'Not logged in.' }, 401);

      const id = String(body.id || '');
      const dl = !!body.dl;

      const r = await sql`
        select object_key,name from files
        where id=${id} and user_id=${user.id} and status='ready'
      `;

      if (!r.length)
        return json({ error: 'File not found.' }, 404);

      return json({ url: await getUrl(r[0].object_key, r[0].name, dl) });
    }

    if (action === 'del') {
      const user = await currentUser();

      if (!user)
        return json({ error: 'Not logged in.' }, 401);

      const id = String(body.id || '');

      const r = await sql`
        select object_key from files
        where id=${id} and user_id=${user.id}
      `;

      if (!r.length)
        return json({ error: 'File not found.' }, 404);

      await remove(r[0].object_key);
      await sql`delete from files where id=${id} and user_id=${user.id}`;

      return json({ ok: true });
    }

    return json({ error: 'Unknown action.' }, 404);

  } catch (e) {
    console.error(e);
    return json({ error: 'Server error.' }, 500);
  }
}
