// The feed: a full-screen swipe feed ("For you"), professional insight cards ("Insights") and
// saved posts. Posts can be text, comic-style stories, slide decks, videos, photos, training
// sessions or documents. Only athletes star or react.
import { html, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { toast } from '../ui.js';
import { XIcon, initial, ago } from '../xui.js';
import * as store from '../store.js';
import { me, ROLES } from '../session.js';
import { feedFor, toggleReaction, myReaction, reactionsOn, REACTIONS, POST_TYPES, starred } from '../social.js';
import { connect, linkBetween } from '../connect.js';
import { ExerciseRows } from './parts.js';
import { today } from '../monitor.js';

// Dr. Jose's built-in posts load with the feed, in their own small file.
let AUTO = null;
let autoLoading = null;
function useAuto() {
  const [m, setM] = useState(AUTO);
  useEffect(() => {
    if (m) return;
    autoLoading = autoLoading || import('./autoview.js').then((x) => { AUTO = x; return x; });
    autoLoading.then(setM).catch(() => {});
  }, []);
  return m;
}
const allPosts = (u, auto) => {
  const own = feedFor(u);
  if (!auto) return own;
  return own.concat(auto.dailyPosts(today())).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
};
const authorHref = (p) => (p.auto ? null : '#/pro/' + p.authorId);

const POST_LABEL = Object.assign({ meme: 'Meme', chart: 'Exercise chart' }, POST_TYPES);
const TYPE_ICON = { meme: 'image', chart: 'train', insight: 'bulb', story: 'comic', slides: 'slides', video: 'play', photo: 'image', document: 'file', training: 'run' };
const user = (id) => store.getState().users.find((u) => u.id === id) || null;
export const proLine = (u, fallbackRole) => [ROLES[(u && u.role) || fallbackRole] || 'Coach', u && u.speciality].filter(Boolean).join(' · ');

// ---------- media ----------
function useBlobUrl(p) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!p.file) return undefined;
    const u = URL.createObjectURL(p.file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [p.id]);
  return url;
}

function FileView({ p }) {
  const url = useBlobUrl(p);
  if (!p.file) return p.fileName ? html`<span class="x-small x-dim">${p.fileName} (not on this phone)</span>` : null;
  if (!url) return null;
  if ((p.fileType || '').startsWith('image/')) return html`<img class="x-media" src=${url} alt=${p.title} />`;
  return html`<a class="x-row" style="background:var(--x-bg);border-radius:14px" href=${url} target="_blank" rel="noopener" download=${p.fileName}><span class="x-badge"><${XIcon} name="file" size=${18} /></span><div class="grow"><b>${p.fileName}</b><span class="x-small x-muted">Open document</span></div></a>`;
}

// Plays only while on screen, muted until tapped.
function Video({ p, fill }) {
  const url = useBlobUrl(p);
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    const v = ref.current;
    if (!v || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && e.intersectionRatio > 0.6) v.play().catch(() => {}); else v.pause(); }, { threshold: [0, 0.6, 1] });
    io.observe(v);
    return () => io.disconnect();
  }, [url]);
  if (!p.file) return html`<div class=${'x-textpost t-' + (p.theme || 'ink')}><${XIcon} name="play" size=${40} /><span class="x-small">Video not on this phone</span></div>`;
  return html`<div class=${'x-video' + (fill ? ' fill' : '')}><video ref=${ref} src=${url} muted=${muted} loop playsinline preload="metadata" aria-label=${p.title} onClick=${() => setMuted(!muted)}></video>
    <button type="button" class="x-mute" aria-label=${muted ? 'Sound on' : 'Sound off'} onClick=${() => setMuted(!muted)}><${XIcon} name=${muted ? 'mute' : 'sound'} size=${18} /></button></div>`;
}

// A comic strip: each panel has a scene, a speaker and a speech bubble (or a caption box).
export const SCENES = { run: '🏃', jump: '🦘', sleep: '😴', food: '🥗', strong: '💪', think: '🧠', clock: '⏱️', fire: '🔥', pain: '🤕', win: '🏆' };
export function Comic({ p }) {
  const panels = p.panels || [];
  return html`<div class=${'x-comic t-' + (p.theme || 'violet')}>
    ${panels.map((x, i) => html`<div class=${'x-panel' + (panels.length % 2 && i === panels.length - 1 ? ' wide' : '')}>
      <span class="x-scene" aria-hidden="true">${SCENES[x.scene] || ''}</span>
      ${x.who === 'narrator' ? html`<div class="x-caption">${x.text}</div>` : html`<div class=${'x-bubble ' + (x.who === 'athlete' ? 'right' : '')}><b>${x.who === 'athlete' ? 'Athlete' : 'Coach'}</b>${x.text}</div>`}
      <span class="x-panel-n">${i + 1}</span>
    </div>`)}
  </div>`;
}

// A slide deck you swipe sideways.
export function Deck({ p }) {
  const [i, setI] = useState(0);
  const slides = p.slides || [];
  const onScroll = (e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); };
  return html`<div class="x-deckwrap"><div class="x-deck" onScroll=${onScroll}>${slides.map((s, n) => html`<section class=${'x-slide t-' + (p.theme || 'violet')} aria-label=${'Slide ' + (n + 1) + ' of ' + slides.length}>
      <span class="x-slide-n">${n + 1} / ${slides.length}</span><h4>${s.title}</h4>${s.text ? html`<p>${s.text}</p>` : null}</section>`)}</div>
    <div class="x-dots" aria-hidden="true">${slides.map((_, n) => html`<i class=${n === i ? 'on' : ''}></i>`)}</div></div>`;
}

function TextPost({ p }) {
  return html`<div class=${'x-textpost t-' + (p.theme || 'violet')}><span class="x-kick"><${XIcon} name="bulb" size=${16} />Insight</span><h4>${p.title}</h4>${p.body ? html`<p>${p.body}</p>` : null}</div>`;
}

export function PostBody({ p, reel }) {
  if (p.auto && AUTO && (p.type === 'video' || p.type === 'meme' || p.type === 'chart')) return html`<${AUTO.AutoBody} p=${p} reel=${reel} />`;
  if (p.type === 'story') return html`<${Comic} p=${p} />`;
  if (p.type === 'slides') return p.slides && p.slides.length ? html`<${Deck} p=${p} />` : html`<${FileView} p=${p} />`;
  if (p.type === 'video') return html`<${Video} p=${p} fill=${reel} />`;
  if (reel && p.type === 'insight') return html`<${TextPost} p=${p} />`;
  if (p.type === 'photo' || p.type === 'document') return html`<${FileView} p=${p} />`;
  if (p.type === 'training') return html`<${ExerciseRows} keys=${p.exercises} bg="var(--x-bg)" />`;
  return null;
}

// ---------- reactions ----------
function Reactions({ p, canReact, onDelete }) {
  const rs = reactionsOn(p.id);
  return html`<div class="x-react">${REACTIONS.map((rx) => {
    const n = rs.filter((x) => x.kind === rx.key).length;
    return canReact ? html`<button type="button" aria-pressed=${String(myReaction(p.id, rx.key))} aria-label=${rx.label} onClick=${() => toggleReaction(p.id, rx.key)}><${XIcon} name=${rx.key} size=${18} fill=${myReaction(p.id, rx.key)} />${n || ''}</button>`
      : html`<span title=${rx.label}><${XIcon} name=${rx.key} size=${18} />${n}</span>`;
  })}${onDelete ? html`<button type="button" style="margin-left:auto" aria-label="Delete post" onClick=${onDelete}><${XIcon} name="trash" size=${18} /></button>` : null}</div>`;
}

function ConnectChip({ proId, dark }) {
  const u = me();
  if (!u || u.role !== 'athlete') return null;
  const l = linkBetween(u.id, proId);
  if (l && l.status === 'active') return null;
  return html`<button type="button" class=${'x-connect' + (dark ? ' dark' : '')} disabled=${!!l} onClick=${async (e) => { e.preventDefault(); await connect(proId); toast('Request sent.'); }}>${l ? 'Requested' : 'Connect'}</button>`;
}

// Dr. Jose gets the app logo colours and an "auto" mark, so nobody takes him for a real person.
function Avatar({ p, soft }) {
  if (p.auto) return html`<span class="x-avatar dj-avatar" title="Automated coach">DJ<i aria-hidden="true">auto</i></span>`;
  return html`<a class=${'x-avatar' + (soft ? ' soft' : '')} href=${'#/pro/' + p.authorId}>${initial(p.authorName)}</a>`;
}

// LinkedIn-style card for the Insights tab, profiles and the pro's own posts.
export function PostCard({ p, canReact, onDelete }) {
  const a = user(p.authorId);
  const text = p.type !== 'story' && p.type !== 'slides';
  const href = authorHref(p);
  return html`<article class="x-post">
    <div class="x-post-head"><${Avatar} p=${p} soft=${true} /><div class="grow">${href ? html`<a href=${href} style="color:inherit"><b>${p.authorName}</b></a>` : html`<b>${p.authorName}</b>`}<div class="x-small x-muted">${p.authorLine || proLine(a, p.authorRole)} · ${ago(p.createdAt)}</div></div>
      ${p.auto ? null : html`<${ConnectChip} proId=${p.authorId} />`}<span class="x-chip tint"><${XIcon} name=${TYPE_ICON[p.type] || 'bulb'} size=${14} />${POST_LABEL[p.type] || 'Post'}</span></div>
    <h3>${p.title}</h3>
    ${text && p.body ? html`<p>${p.body}</p>` : null}
    <${PostBody} p=${p} />
    ${!text && p.body ? html`<p>${p.body}</p>` : null}
    ${p.auto && AUTO ? html`<${AUTO.AutoFoot} p=${p} />` : null}
    <${Reactions} p=${p} canReact=${canReact} onDelete=${onDelete} />
  </article>`;
}

// ---------- the swipe feed ----------
function Reel({ p, canReact }) {
  const a = user(p.authorId);
  const rs = reactionsOn(p.id);
  return html`<section class=${'x-reel kind-' + p.type} aria-label=${p.title}>
    <div class="x-reel-media"><${PostBody} p=${p} reel=${true} /></div>
    <div class="x-reel-info">
      <div style="display:flex;align-items:center;gap:10px"><${Avatar} p=${p} /><div style="min-width:0">${authorHref(p) ? html`<a href=${authorHref(p)} style="color:#fff"><b>${p.authorName}</b></a>` : html`<b>${p.authorName}</b>`}<div class="x-small" style="opacity:.75">${p.authorLine || proLine(a, p.authorRole)}</div></div>${p.auto ? null : html`<${ConnectChip} proId=${p.authorId} dark=${true} />`}</div>
      ${p.type !== 'insight' ? html`<b class="x-reel-title">${p.title}</b>` : null}
      ${p.type !== 'insight' && p.body ? html`<p class="x-reel-body">${p.body}</p>` : null}
      ${p.auto && AUTO && p.link ? html`<a class="x-connect dark dj-reel-link" href=${p.link[0]}>${p.link[1]}</a>` : null}
    </div>
    <div class="x-rail">${REACTIONS.map((rx) => {
      const n = rs.filter((x) => x.kind === rx.key).length;
      const on = myReaction(p.id, rx.key);
      return html`<button type="button" disabled=${!canReact} aria-pressed=${String(on)} aria-label=${rx.label} onClick=${() => toggleReaction(p.id, rx.key)}><span><${XIcon} name=${rx.key} size=${26} fill=${on} /></span>${n || ''}</button>`;
    })}</div>
  </section>`;
}

export function Feed({ query }) {
  const u = me();
  const [tab, setTab] = useState(query.get('show') === 'starred' ? 'saved' : query.get('show') || 'foryou');
  const auto = useAuto();
  const posts = allPosts(u, auto);
  const canReact = u.role === 'athlete';
  const stars = new Set(starred(u));
  const top = html`<div class=${'x-feedtabs' + (tab === 'foryou' && posts.length ? ' over' : '')} role="tablist" aria-label="Feed">${[['foryou', 'For you'], ['insights', 'Insights'], ['saved', 'Saved']].filter((t) => canReact || t[0] !== 'saved').map(([k, l]) => html`<button type="button" role="tab" aria-selected=${String(tab === k)} onClick=${() => setTab(k)}>${l}</button>`)}</div>`;
  if (!posts.length && !auto) return html`<div class="x-page">${top}</div>`;
  if (!posts.length) return html`<div class="x-page">${top}<div class="x-card" style="align-items:center;text-align:center;padding:36px 18px"><span class="x-badge"><${XIcon} name="feed" /></span><b>Nothing posted yet</b><p class="x-muted x-small">Stories, videos, slides and insights from coaches and physios show up here.</p>${canReact ? html`<a class="x-btn soft sm" href="#/find">Find a coach or physio</a>` : html`<a class="x-btn soft sm" href="#/post">Write the first post</a>`}</div></div>`;
  if (tab === 'foryou') return html`<div class="x-reels-wrap">${top}<div class="x-reels">${posts.map((p) => html`<${Reel} key=${p.id} p=${p} canReact=${canReact} />`)}</div></div>`;
  const shown = tab === 'saved' ? posts.filter((p) => stars.has(p.id)) : posts;
  return html`<div class="x-page">${top}
    ${tab === 'insights' ? html`<p class="x-sub" style="padding:0 4px">From coaches, trainers and physios. Tap a name to see their profile and connect.</p>` : null}
    ${!shown.length ? html`<div class="x-card" style="align-items:center;text-align:center;padding:36px 18px"><span class="x-badge"><${XIcon} name="star" /></span><b>No saved posts yet</b><p class="x-muted x-small">Tap the star on a post to keep it here.</p></div>`
      : shown.map((p) => html`<${PostCard} key=${p.id} p=${p} canReact=${canReact} />`)}
  </div>`;
}

export function PostPage({ id }) {
  const u = me();
  const auto = useAuto();
  const p = store.getState().posts.find((x) => x.id === id) || (auto && auto.dailyPosts(today()).find((x) => x.id === id));
  if (!p && !auto && String(id).startsWith('DJ-')) return html`<div class="x-page"></div>`;
  return html`<div class="x-page">
    <div class="x-topbar"><a class="x-link" href="javascript:history.back()"><${XIcon} name="back" size=${20} />Back</a></div>
    ${p ? html`<${PostCard} p=${p} canReact=${u.role === 'athlete'} />` : html`<div class="x-card"><b>Post not found</b></div>`}
  </div>`;
}

// Small square for profile grids, like Instagram.
export function PostTile({ p }) {
  return html`<a class=${'x-tile t-' + (p.theme || 'violet')} href=${'#/p/' + p.id} aria-label=${p.title}><${XIcon} name=${TYPE_ICON[p.type] || 'bulb'} size=${18} /><b>${p.title}</b></a>`;
}

