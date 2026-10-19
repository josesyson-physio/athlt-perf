// People: coach and physio profiles, finding a pro to connect with, connection requests,
// pros approving each other, and one-to-one chat.
import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { go, toast } from '../ui.js';
import { XIcon, XField, XSeg, initial, ago, firstName } from '../xui.js';
import * as store from '../store.js';
import { me, myAthlete, updateMe, isCoachRole, ROLES } from '../session.js';
import { postsBy, resultsFor, reactionsOn } from '../social.js';
import { pros, prosOf, athletesOf, linkBetween, connect, accept, removeLink, requestsFor, pairsFor, pairActive, partnerOf, approvePair, removePair, chats, messagesIn, threadId, send, markRead, canChat } from '../connect.js';
import { EXERCISES, byKey as exercise } from '../library.js';
import { PostTile, proLine } from './feed.js';
import { MirrorBoard } from './parts.js';

const T = globalThis.MotionPlusTests;
const user = (id) => store.getState().users.find((u) => u.id === id) || null;

// ---------- profile ----------
function ConnectButton({ pro }) {
  const u = me();
  if (!u || u.role !== 'athlete') return null;
  const l = linkBetween(u.id, pro.id);
  if (l && l.status === 'active') return html`<div class="x-btns"><a class="x-btn" href=${'#/chat/' + pro.id}><${XIcon} name="chat" size=${20} />Message</a><button class="x-btn ghost" onClick=${async () => { if (confirm('Stop working with ' + pro.name + '?')) { await removeLink(l.id); toast('Removed.'); } }}>Connected</button></div>`;
  if (l) return html`<button class="x-btn ghost" disabled>Request sent · waiting for ${firstName(pro.name)}</button>`;
  return html`<button class="x-btn" onClick=${async () => { await connect(pro.id); toast('Request sent to ' + firstName(pro.name) + '.'); }}><${XIcon} name="userplus" size=${20} />Connect</button>`;
}

export function ProProfile({ id }) {
  const u = me();
  const p = user(id);
  if (!p || !isCoachRole(p.role)) return html`<div class="x-page"><div class="x-card"><b>Profile not found</b><a href="#/">Home</a></div></div>`;
  const posts = postsBy(p.id);
  const fans = posts.reduce((n, x) => n + reactionsOn(x.id).length, 0);
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="javascript:history.back()"><${XIcon} name="back" size=${20} />Back</a>${u.id === p.id ? html`<a class="x-link" href="#/me/edit">Edit</a>` : null}</div>
    <div class="x-profile">
      <div class="x-cover"></div>
      <span class="x-avatar xl">${initial(p.name)}</span>
      <h1 class="x-title md">${p.name}</h1>
      <p class="x-muted">${proLine(p)}${p.place ? html` · <${XIcon} name="pin" size=${13} /> ${p.place}` : null}</p>
      ${p.bio ? html`<p style="white-space:pre-line">${p.bio}</p>` : null}
      <div class="x-stats"><div><b>${posts.length}</b>posts</div><div><b>${athletesOf(p.id).length}</b>athletes</div><div><b>${fans}</b>reactions</div></div>
      <${ConnectButton} pro=${p} />
    </div>
    <div class="x-section">Posts</div>
    ${posts.length ? html`<div class="x-grid">${posts.map((x) => html`<${PostTile} key=${x.id} p=${x} />`)}</div>` : html`<div class="x-card"><span class="x-muted">No posts yet.</span></div>`}
  </div>`;
}

export function EditProfile() {
  const u = me();
  const [f, setF] = useState({ name: u.name, speciality: u.speciality || '', place: u.place || '', bio: u.bio || '' });
  const set = (k) => (v) => setF(Object.assign({}, f, { [k]: v }));
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="#/me"><${XIcon} name="back" size=${20} />Me</a></div>
    <h1 class="x-title md">Your profile</h1>
    <p class="x-sub" style="padding:0 4px">Athletes see this when they choose a ${ROLES[u.role].toLowerCase()}.</p>
    <div class="x-card" style="gap:14px">
      <${XField} label="Name" value=${f.name} onInput=${set('name')} />
      <${XField} label="Speciality" value=${f.speciality} onInput=${set('speciality')} placeholder="For example: sprints, knee injuries, strength" />
      <${XField} label="Place" value=${f.place} onInput=${set('place')} placeholder="Town or district" />
      <${XField} label="About you" type="textarea" rows=${4} value=${f.bio} onInput=${set('bio')} placeholder="Your experience and how you work with athletes" />
    </div>
    <button class="x-btn" onClick=${async () => { if (!f.name.trim()) return; await updateMe({ name: f.name.trim(), speciality: f.speciality.trim(), place: f.place.trim(), bio: f.bio.trim() }); toast('Profile saved.'); go('/pro/' + u.id); }}>Save</button>
  </div>`;
}

// ---------- find a pro (athletes) ----------
export function Find() {
  const u = me();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const list = pros().filter((p) => (!role || p.role === role) && (!q || [p.name, p.speciality, p.place].join(' ').toLowerCase().includes(q.toLowerCase())));
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="#/me"><${XIcon} name="back" size=${20} />Me</a></div>
    <div><div class="x-over">Your team</div><h1 class="x-title">Find a pro</h1></div>
    <p class="x-sub" style="padding:0 4px">Read their posts, then connect. You can have a coach, a trainer and a physio.</p>
    <input class="x-input" style="background:#fff" type="search" aria-label="Search" placeholder="Search by name, speciality or place" value=${q} onInput=${(e) => setQ(e.target.value)} />
    <${XSeg} label="Role" value=${role} onChange=${setRole} options=${[{ value: '', label: 'All' }, { value: 'coach', label: 'Coach' }, { value: 'trainer', label: 'Trainer' }, { value: 'physio', label: 'Physio' }]} />
    <div class="x-list">${list.length ? list.map((p) => {
      const l = linkBetween(u.id, p.id);
      return html`<a class="x-row" href=${'#/pro/' + p.id}><span class="x-avatar soft">${initial(p.name)}</span><div class="grow"><b>${p.name}</b><span class="x-small x-muted">${proLine(p)}${p.place ? ' · ' + p.place : ''} · ${postsBy(p.id).length} posts</span></div>${l ? html`<span class=${'x-chip ' + (l.status === 'active' ? 'tint' : '')}>${l.status === 'active' ? 'Connected' : 'Requested'}</span>` : html`<span class="x-chev"><${XIcon} name="next" size=${18} /></span>`}</a>`;
    }) : html`<div class="x-row"><span class="x-muted">No one matches.</span></div>`}</div>
  </div>`;
}

// ---------- my people ----------
// Athlete: the pros they work with and pending requests.
export function MyPros() {
  const u = me();
  const active = prosOf(u.id);
  const pending = store.getState().links.filter((l) => l.kind === 'athlete' && l.athleteUserId === u.id && l.status === 'pending');
  const pairs = store.getState().links.filter((l) => l.kind === 'pair' && l.athleteUserId === u.id);
  return html`<div class="x-list">
    ${active.map((p) => {
      const waiting = pairs.filter((x) => x.pros.includes(p.id) && !pairActive(x)).length;
      return html`<div class="x-row"><a class="x-avatar soft" href=${'#/pro/' + p.id}>${initial(p.name)}</a><a class="grow" href=${'#/pro/' + p.id} style="color:inherit"><b>${p.name}</b><span class="x-small x-muted">${proLine(p)}${waiting ? ' · approving each other' : ''}</span></a><a class="x-btn soft sm" href=${'#/chat/' + p.id} aria-label=${'Message ' + p.name}><${XIcon} name="chat" size=${18} /></a></div>`;
    })}
    ${pending.map((l) => { const p = user(l.proId); return p ? html`<a class="x-row" href=${'#/pro/' + p.id}><span class="x-avatar soft">${initial(p.name)}</span><div class="grow"><b>${p.name}</b><span class="x-small x-muted">${ROLES[p.role]} · request sent</span></div><span class="x-chip">Waiting</span></a>` : null; })}
    <a class="x-row" href="#/find"><span class="x-badge"><${XIcon} name="userplus" size=${18} /></span><div class="grow"><b>Find a coach or physio</b><span class="x-small x-muted">See their posts, then connect</span></div><span class="x-chev"><${XIcon} name="next" size=${18} /></span></a>
  </div>`;
}

// Pro: connection requests and approvals of other pros, shown on the Athletes tab.
export function Requests() {
  const u = me();
  const reqs = requestsFor(u.id);
  const pairs = pairsFor(u.id).filter((p) => !pairActive(p));
  if (!reqs.length && !pairs.length) return null;
  return html`<div class="x-section">Waiting for you</div><div class="x-list">
    ${reqs.map((l) => { const a = user(l.athleteUserId); return a ? html`<div class="x-row"><span class="x-avatar soft">${initial(a.name)}</span><div class="grow"><b>${a.name}</b><span class="x-small x-muted">Wants to work with you · ${ago(l.createdAt)}</span></div>
      <button class="x-btn sm" onClick=${async () => { await accept(l.id); toast('You are now connected with ' + firstName(a.name) + '.'); }}>Accept</button><button class="x-btn ghost sm" aria-label="Decline" onClick=${() => removeLink(l.id)}>✕</button></div>` : null; })}
    ${pairs.map((p) => {
      const other = partnerOf(p, u.id), a = user(p.athleteUserId);
      const mine = p.approved.includes(u.id);
      return other && a ? html`<div class="x-row"><span class="x-avatar soft">${initial(other.name)}</span><div class="grow"><b>${other.name}</b><span class="x-small x-muted">${ROLES[other.role]} also works with ${firstName(a.name)}. ${mine ? 'Waiting for ' + firstName(other.name) + ' to approve you.' : 'Approve to work together?'}</span></div>
        ${mine ? html`<span class="x-chip">Approved</span>` : html`<button class="x-btn sm" onClick=${async () => { await approvePair(p.id); toast('Approved ' + firstName(other.name) + '.'); }}>Approve</button><button class="x-btn ghost sm" aria-label="Refuse" onClick=${() => removePair(p.id)}>✕</button>`}</div>` : null;
    })}
  </div>`;
}

// ---------- chat ----------
export function ChatList() {
  const u = me();
  const list = chats(u);
  return html`<div class="x-page">
    <div class="x-head"><div><div class="x-over">${u.role === 'athlete' ? 'Your coaches and physios' : 'Your athletes and team'}</div><h1 class="x-title">Chat</h1></div></div>
    ${!list.length ? html`<div class="x-card" style="align-items:center;text-align:center;padding:36px 18px"><span class="x-badge"><${XIcon} name="chat" /></span><b>No one to chat with yet</b><p class="x-muted x-small">${u.role === 'athlete' ? 'Connect with a coach or physio first.' : 'When athletes connect with you, they show up here.'}</p>${u.role === 'athlete' ? html`<a class="x-btn soft sm" href="#/find">Find a pro</a>` : null}</div>`
      : html`<div class="x-list">${list.map((c) => html`<a class="x-row" href=${'#/chat/' + c.other.id}><span class="x-avatar soft">${initial(c.other.name)}</span><div class="grow"><b>${c.other.name}</b><span class="x-small x-muted" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.last ? (c.last.fromId === u.id ? 'You: ' : '') + (c.last.text || (c.last.attach && c.last.attach.type === 'mirror' ? 'Sent a Mirror' : 'Sent an exercise')) : ROLES[c.other.role] + ' · say hello'}</span></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${c.last ? html`<span class="x-small x-dim">${ago(c.last.createdAt)}</span>` : null}${c.unread ? html`<span class="x-count">${c.unread}</span>` : null}</div></a>`)}</div>`}
  </div>`;
}

function Attachment({ a, mineSide }) {
  if (!a) return null;
  if (a.type === 'mirror') return html`<div class="x-attach"><span class="x-small" style="font-weight:700">Mirror · ${ago(a.at)}</span><${MirrorBoard} rows=${a.rows} compact=${true} /></div>`;
  const x = exercise(a.key);
  return x ? html`<a class=${'x-attach ex' + (mineSide ? ' mine' : '')} href=${'#/library/' + x.key}><b>${x.name}</b><span class="x-small">${a.dose || x.dose} · ${x.equipment}</span></a>` : null;
}

export function ChatThread({ otherId }) {
  const u = me();
  const o = user(otherId);
  const [text, setText] = useState('');
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const end = useRef(null);
  const ms = o ? messagesIn(threadId(u.id, o.id)) : [];
  useEffect(() => { if (o) markRead(o.id); if (end.current) end.current.scrollIntoView({ block: 'end' }); }, [ms.length]);
  if (!o) return html`<div class="x-page"><div class="x-card"><b>Chat not found</b><a href="#/chat">All chats</a></div></div>`;
  const allowed = canChat(u.id, o.id);
  const doSend = async (attach) => { try { await send(o.id, attach ? '' : text, attach); if (!attach) setText(''); setPicking(false); } catch (e) { toast(e.message); } };
  const sendMirror = () => { const a = myAthlete(); if (!a) return; const rows = T.mirror(resultsFor(a.id)); if (!rows.some((r) => r.tested)) { toast('Do a test first.'); return; } doSend({ type: 'mirror', rows, at: new Date().toISOString() }); };
  let lastDay = '';
  return html`<div class="x-chat">
    <div class="x-chat-head"><a class="x-link" href="#/chat" aria-label="All chats"><${XIcon} name="back" size=${22} /></a><span class="x-avatar soft">${initial(o.name)}</span><div style="flex:1;min-width:0"><b>${o.name}</b><div class="x-small x-muted">${o.role === 'athlete' ? 'Athlete' : proLine(o)}</div></div>${isCoachRole(o.role) ? html`<a class="x-link" href=${'#/pro/' + o.id}>Profile</a>` : null}</div>
    <div class="x-msgs">${ms.length ? ms.map((m) => {
      const day = m.createdAt.slice(0, 10);
      const sep = day !== lastDay ? html`<div class="x-day">${new Date(m.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</div>` : null;
      lastDay = day;
      const mine = m.fromId === u.id;
      return html`${sep}<div class=${'x-msg' + (mine ? ' mine' : '')}>${m.text ? html`<span>${m.text}</span>` : null}<${Attachment} a=${m.attach} mineSide=${mine} /><i>${new Date(m.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</i></div>`;
    }) : html`<div class="x-day">Say hello to ${firstName(o.name)}. ${u.role === 'athlete' ? 'Ask about your training or a doubt.' : 'Ask how training is going.'}</div>`}<div ref=${end}></div></div>
    ${picking ? html`<div class="x-picker"><input class="x-input" type="search" aria-label="Search exercises" placeholder="Search exercises" value=${q} onInput=${(e) => setQ(e.target.value)} />
      <div class="x-list" style="max-height:220px;overflow:auto">${EXERCISES.filter((x) => !q || x.name.toLowerCase().includes(q.toLowerCase())).map((x) => html`<button class="x-row" type="button" onClick=${() => doSend({ type: 'exercise', key: x.key, dose: x.dose })}><div class="grow"><b>${x.name}</b><span class="x-small x-muted">${x.dose}</span></div><${XIcon} name="send" size=${18} /></button>`)}</div></div>` : null}
    ${allowed ? html`<form class="x-compose" onSubmit=${(e) => { e.preventDefault(); doSend(); }}>
      ${u.role === 'athlete' ? html`<button type="button" class="x-iconbtn" aria-label="Send my Mirror" onClick=${sendMirror}><${XIcon} name="mirror" size=${22} /></button>`
        : html`<button type="button" class="x-iconbtn" aria-pressed=${String(picking)} aria-label="Send an exercise" onClick=${() => setPicking(!picking)}><${XIcon} name="library" size=${22} /></button>`}
      <input class="x-input" aria-label="Message" placeholder="Message" value=${text} onInput=${(e) => setText(e.target.value)} />
      <button type="submit" class="x-iconbtn send" aria-label="Send" disabled=${!text.trim()}><${XIcon} name="send" size=${20} /></button></form>`
      : html`<div class="x-compose"><span class="x-small x-muted" style="padding:8px">You can chat once you are connected.</span></div>`}
  </div>`;
}
