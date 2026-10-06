'use client';
import { useState, useEffect, useRef } from 'react';
const ga = (e) => window.gtag && window.gtag('event', e);
const api = async (a, b = {}) => { const r = await fetch('/api/' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); const d = await r.json(); if (!r.ok) throw Object.assign(new Error(d.error), { s: r.status }); return d; };
const sz = n => n > 1e9 ? (n / 1e9).toFixed(2) + ' GB' : (n / 1e6).toFixed(1) + ' MB';

export default function Home() {
  const [v, setV] = useState('boot'), [u, setU] = useState(''), [p, setP] = useState(''), [p2, setP2] = useState(''), [code, setCode] = useState(''), [err, setErr] = useState(''), [rc, setRc] = useState('');
  const go = async (fn) => { setErr(''); try { await fn(); } catch (e) { setErr(e.message); } };
  useEffect(() => { api('list').then(() => setV('gal')).catch(() => setV('home')); }, []);
  if (v === 'boot') return null;
  if (v === 'gal') return <Gallery out={() => { setV('home'); setP(''); }} />;
  return (<main><div className="c">
    <h1>🔒 Vault</h1><p className="m">Your Private Gallery</p>
    {v === 'home' && <form onSubmit={e => { e.preventDefault(); setV('pw'); }}>
      <label htmlFor="u">Enter your username</label><input id="u" autoFocus value={u} onChange={e => setU(e.target.value)} autoCapitalize="none" required />
      <button>Continue</button><p className="m">Don't remember your username?</p>
      <button type="button" className="g" onClick={() => setV('rec')}>Use Recovery Code</button>
      <button type="button" className="l" onClick={() => setV('reg')}>Create account</button></form>}
    {v === 'pw' && <form onSubmit={e => { e.preventDefault(); ga('login_attempt'); go(async () => { await api('login', { u, p }); ga('login_success'); setV('gal'); }); }}>
      <p>Account: <b>{u}</b></p><label htmlFor="p">Password</label><input id="p" type="password" autoFocus value={p} onChange={e => setP(e.target.value)} required />
      <p className="err" role="alert">{err}</p><button>Log in</button><button type="button" className="l" onClick={() => { setV('home'); setErr(''); }}>Back</button></form>}
    {v === 'rec' && <form onSubmit={e => { e.preventDefault(); go(async () => { const d = await api('lookup', { code }); setU(d.username); setV('pw'); }); }}>
      <label htmlFor="rc">Recovery code</label><input id="rc" placeholder="REC-XXXXX-..." value={code} onChange={e => setCode(e.target.value)} required />
      <p className="err" role="alert">{err}</p><button>Find my account</button><button type="button" className="l" onClick={() => setV('home')}>Back</button></form>}
    {v === 'reg' && <form onSubmit={e => { e.preventDefault(); if (p !== p2) return setErr('Passwords do not match.'); go(async () => { const d = await api('register', { u, p }); setRc(d.code); setV('code'); }); }}>
      <input aria-label="Username" placeholder="Username" value={u} onChange={e => setU(e.target.value)} required />
      <input aria-label="Password" type="password" placeholder="Password (min 8)" value={p} onChange={e => setP(e.target.value)} required />
      <input aria-label="Confirm password" type="password" placeholder="Confirm password" value={p2} onChange={e => setP2(e.target.value)} required />
      <p className="err" role="alert">{err}</p><button>Create account</button><button type="button" className="l" onClick={() => setV('home')}>Back</button></form>}
    {v === 'code' && <div><p>Save this recovery code. It may be the only way to find your account if you forget your username.</p>
      <h2 style={{ fontFamily: 'monospace', fontSize: '1rem', wordBreak: 'break-all' }}>{rc}</h2>
      <button className="g" onClick={() => navigator.clipboard.writeText(rc)}>Copy</button><button onClick={() => { setRc(''); setV('gal'); }}>I saved it — continue</button></div>}
    <footer><a href="#">Privacy</a><a href="#">Terms</a><a href="#">How It Works</a></footer>
  </div></main>);
}

function Gallery({ out }) {
  const [files, setF] = useState([]), [name, setName] = useState(''), [q, setQ] = useState(''), [sort, setSort] = useState('new'), [ups, setUps] = useState([]), [play, setPlay] = useState({}), [err, setErr] = useState('');
  const load = () => api('list', { q, sort }).then(d => { setF(d.files); setName(d.user); }).catch(e => e.s === 401 ? out() : setErr(e.message));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, sort]);
  const upload = async (file) => {
    const id = Math.random(), set = (x) => setUps(l => l.map(i => i.id === id ? { ...i, ...x } : i));
    setUps(l => [...l, { id, n: file.name, s: file.size, pct: 0, st: 'Uploading' }]); ga('upload_started');
    try {
      const d = await api('init', { name: file.name, size: file.size, type: file.type });
      await new Promise((ok, no) => { const x = new XMLHttpRequest(); set({ x });
        x.open('PUT', d.url); x.setRequestHeader('Content-Type', d.mime);
        x.upload.onprogress = e => set({ pct: e.loaded / e.total * 100 });
        x.onload = () => x.status < 300 ? ok() : no(new Error('File upload failed. Please try again.'));
        x.onerror = x.onabort = () => no(new Error('Upload failed or cancelled.')); x.send(file); });
      await api('done', { id: d.id }); set({ pct: 100, st: 'Done ✓' }); ga('upload_completed'); load();
    } catch (e) { set({ st: e.message }); }
  };
  const act = async (f, dl) => { try { const d = await api('url', { id: f.id, dl }); if (dl) { ga('download_click'); location.href = d.url; } else setPlay(p => ({ ...p, [f.id]: d.url })); } catch (e) { setErr(e.message); } };
  const del = async (f) => { if (confirm('Are you sure you want to delete this file?')) try { await api('del', { id: f.id }); load(); } catch (e) { setErr(e.message); } };
  const pick = useRef();
  return (<main>
    <div className="top"><h1>Welcome back, {name}</h1><button className="g" onClick={async () => { await api('logout'); ga('logout'); out(); }}>Logout</button></div>
    <input aria-label="Search your files" placeholder="Search your files…" value={q} onChange={e => setQ(e.target.value)} />
    <div className="row"><select aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}><option value="new">Newest first</option><option value="old">Oldest first</option><option value="name">Name</option><option value="size">File size</option></select>
      <button onClick={() => pick.current.click()}>Upload</button></div>
    <input ref={pick} type="file" hidden multiple accept="video/*,audio/*,.mkv,.m4a,.aac" onChange={e => { [...e.target.files].forEach(upload); e.target.value = ''; }} />
    <p className="err" role="alert">{err}</p>
    {ups.map(i => <div className="k" key={i.id} style={{ marginBottom: 8 }}><b>{i.n}</b> <span className="m">{sz(i.s)} · {i.st}</span>
      <div className="bar"><i style={{ width: i.pct + '%' }} /></div>{i.st === 'Uploading' && <button className="l" onClick={() => i.x?.abort()}>Cancel</button>}</div>)}
    <h2>Your Files</h2><div className="grid">{files.map(f => <div className="k" key={f.id}>
      <div className="ic">{f.mime.startsWith('video') ? '🎬' : '🎵'}</div><b>{f.name}</b>
      <p className="m">{f.mime} · {sz(f.size)} · {new Date(f.created_at).toLocaleDateString()}</p>
      {play[f.id] && (f.mime.startsWith('video') ? <video src={play[f.id]} controls autoPlay preload="metadata" /> : <audio src={play[f.id]} controls autoPlay />)}
      <div className="row"><button onClick={() => act(f)}>Play</button><button className="g" onClick={() => act(f, 1)}>Download</button><button className="g" onClick={() => del(f)}>Delete</button></div></div>)}</div>
    {!files.length && <p className="m">No files yet.</p>}
  </main>);
}
