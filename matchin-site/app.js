import { ICONS } from './vendor/icons.js';
import { GRADES, VER, MONTHLY_FREE, divIndex, divWeight, CRIT, LV3, VISIT, REVISIT, STORES0, CATS, NEAR, STATIONS } from './data.js';
import { makeBackend, monthKey } from './backend.js';
import { toString as qrSvg } from './vendor/qrcode.js';

/* ---------- 기본 도구 ---------- */
const $app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
const f2 = n => (Math.round(n * 100) / 100).toFixed(2);
const I = (n, s = 22, v = 'r', st = '') => { const x = ICONS[n]; const body = x ? (x[v] || x.r) : ''; return `<svg class="ph" width="${s}" height="${s}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"${st ? ` style="${st}"` : ''}>${body}</svg>`; };
const STAR = 'M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z';
const stars = (n, s = 14) => `<span class="stars" aria-label="별 ${n}개">${[1,2,3,4,5].map(i => `<svg width="${s}" height="${s}" viewBox="0 0 256 256" aria-hidden="true"><path d="${STAR}" fill="${i <= n ? '#FFB800' : '#E5E8EB'}"/></svg>`).join('')}</span>`;
const AVC = [['#FFE3D8','#C2410C'],['#E3ECFF','#1D4ED8'],['#FFF0C7','#A16207'],['#DDF4E8','#047857'],['#F1E3FA','#7E22CE'],['#DDEFF5','#0E7490']];
const nick = uid => (S.users[uid] && S.users[uid].nickname) || '탈퇴한 회원';
const av = (uid, cls = '') => { const n = nick(uid); const c = AVC[(n.charCodeAt(0) || 0) % AVC.length]; return `<span class="av ${cls}" style="background:${c[0]};color:${c[1]}">${esc(n.slice(0, 1))}</span>`; };
const GUESS = [['국밥',/순대|국밥|감자탕|뼈다귀|해장|칼국수|국수|면옥|곰탕/],['곱창',/곱창|막창|대창/],['회',/수산|회|스시|초밥|연어|사시미|Sushi/],['고기',/갈비|고기|화로|구이|족발|보쌈|삼겹|생갈비/],['분식',/떡볶이|김밥|분식|덮다|카츠/],['중식',/반점|마라|양꼬치|짜장|짬뽕|중화|사이공|계림원/]];
const STORES = STORES0.concat(NEAR.map(([name, lat, lng], i) => ({ id: 'n' + i, name, lat, lng, area: '주변 매장', menu: [], rsv: {}, cat: (GUESS.find(([, re]) => re.test(name)) || ['한식'])[0] })));
CATS['한식'] = CATS['한식'] || ['#FFE9DA', '#E8762E', 'bowl-food'];
const ST = id => STORES.find(s => s.id === id);
const catOf = st => CATS[st.cat] || CATS['한식'];
const thumb = (st, s = 56, r = 14) => { if (st.img) return `<span class="thumb photo" style="width:${s}px;height:${s}px;border-radius:${r}px;background:#eee url(${st.img}) center/cover"></span>`; const [bg, fg, i] = catOf(st); return `<span class="thumb" style="width:${s}px;height:${s}px;border-radius:${r}px;background:linear-gradient(145deg,${bg},#fff 140%);color:${fg}">${I(i, Math.round(s * .52), 'd')}</span>`; };
const hero = (st, label = '') => { if (st.img) return `<div class="hero photo" style="background:#ddd url(${st.img}) center 55%/cover"><span class="aib">AI 생성 이미지 · 실제 매장 사진 아님</span><span class="lbl">${label ? esc(label) + ' · ' : ''}대표 메뉴 ${esc(st.imgMenu)}</span></div>`; const [bg, fg, i] = catOf(st); return `<div class="hero" style="background:linear-gradient(160deg,${bg} 0%,#fff 130%);color:${fg}"><span style="position:relative">${I(i, 110, 'd')}</span>${label ? `<span class="lbl">${esc(label)}</span>` : ''}</div>`; };
const gb = g => `<span class="gb g${g + 1}">${g === 4 ? I('crown', 11, 'f') + ' ' : ''}${GRADES[g]}</span>`;
const vb = v => `<span class="vb ${v}">${I(v === 'dine' ? 'seal-check' : 'info', 13, v === 'dine' ? 'f' : 'r')}${VER[v] ? VER[v][0] : '미인증'}</span>`;
const DAYS = ['일','월','화','수','목','금','토'];
const when = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}(${DAYS[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const ago = t => { const m = Math.floor((Date.now() - t) / 60000); if (m < 1) return '방금'; if (m < 60) return `${m}분 전`; const h = Math.floor(m / 60); if (h < 24) return `${h}시간 전`; const d = Math.floor(h / 24); return d < 30 ? `${d}일 전` : new Date(t).toLocaleDateString('ko-KR'); };
const errText = e => { const c = String((e && e.code) || e); if (c === 'not-verified') return '아직 인증되지 않았어요. 메일의 링크를 누른 뒤 다시 확인해 주세요.'; if (c === 'bad-code') return '코드가 맞지 않아요. 주최자에게 다시 확인해 주세요.'; if (c.includes('permission')) return '권한이 없어요. 조건을 확인해 주세요.'; if (c.includes('email-already')) return '이미 가입된 이메일이에요. 로그인해 주세요.'; if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return '이메일이나 비밀번호가 맞지 않아요.'; if (c.includes('weak-password')) return '비밀번호는 6자 이상이어야 해요.'; if (c.includes('invalid-email')) return '이메일 형식을 확인해 주세요.'; if (c.includes('popup-closed')) return '로그인 창이 닫혔어요.'; if (c.includes('network')) return '네트워크를 확인해 주세요.'; if (c.includes('requires-recent-login')) return '보안을 위해 다시 로그인한 뒤 탈퇴해 주세요. (로그아웃 → 로그인 → 탈퇴)'; if (c.includes('unauthorized-domain')) return '이 주소가 Firebase 승인된 도메인에 없어요. 배포 가이드 4단계를 확인해 주세요.'; return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.'; };

/* ---------- 상태 ---------- */
let B = null;
const S = {
  authUser: null, me: null, ready: false, users: {}, reviews: [], meets: [], ratings: [], used: 0,
  tab: 'home', stack: [{ s: 'home' }], sheet: null, err: '', draft: null, form: {}, feedF: 'all', meetF: 'all', mapMode: 'score', mapSel: null,
  auth: { mode: 'login', email: '', busy: false }, allReviews: [], allMeets: [], bans: [], reports: [], notice: null, adminF: 'open', msgs: {}, chatDraft: '', code: {}, qr: {}, storeQ: '', meetsLoaded: false
};
const COMMS = [
  { id: 'heukseok', title: '흑석·상도 동네 미식', sub: '중앙대·흑석·상도 주민', icon: 'house', c: ['#FFF1EC', '#FF5B35'] },
  { id: 'freshmen', title: '신입생·복학생 밥친구', sub: '처음 왔거나 오랜만에 돌아온 사람들', icon: 'hand-waving', c: ['#EAF2FF', '#2F6FEB'] },
  { id: 'gopchang', title: '곱창·내장 러버스', sub: '곱창 모임 공지·후기 공유', icon: 'pepper', c: ['#FDE0E6', '#D2335B'] }
];
const POLICY_DATE = '2026-11-24';
const ADMIN_EMAILS = ['lovesick2154@gmail.com'];
const isAdmin = () => !!(S.authUser && ADMIN_EMAILS.includes(S.authUser.email) && S.authUser.verified);
const myBan = () => { const b = S.bans.find(x => x.id === me()); return b && b.until > Date.now() ? b : null; };
const banned = () => { const b = myBan(); if (b) { toast(`이용이 정지된 상태예요 (${new Date(b.until).toLocaleDateString('ko-KR')}까지)`, true); return true; } return false; };
const REPORT_REASONS = ['광고·협찬 의심', '허위·조작 후기', '욕설·비방·혐오', '개인정보 노출', '노쇼·불쾌한 행동', '기타'];
const TAGS = ['신입생 환영', '복학생 환영', '혼밥러 환영', '첫 모임', '저녁', '점심'];

/* ---------- 계산 ---------- */
const histOf = uid => S.reviews.filter(r => r.uid === uid).map(r => r.s);
function trustOf(uid){ const rs = S.ratings.filter(r => r.ratee === uid); return { avg: rs.length ? rs.reduce((a, r) => a + r.s, 0) / rs.length : 0, n: rs.length }; }
function statsOf(uid){
  const n = S.reviews.filter(r => r.uid === uid).length;
  const attended = S.meets.filter(m => (m.checkedIn || []).includes(uid)).length;
  const hosted = S.meets.filter(m => m.host === uid && (m.checkedIn || []).length >= 2).length;
  const t = trustOf(uid);
  return { n, attended, hosted, trust: t.avg, trustN: t.n };
}
const COND = {
  1: s => [['후기', s.n, 5, '건', s.n >= 5]],
  2: s => [['후기', s.n, 15, '건', s.n >= 15], ['모임 참여(체크인)', s.attended, 3, '회', s.attended >= 3], ['받은 신뢰 별점 (5건 이상)', s.trust, 4.0, '', s.trust >= 4 && s.trustN >= 5]],
  3: s => [['후기', s.n, 40, '건', s.n >= 40], ['모임 주최', s.hosted, 3, '회', s.hosted >= 3], ['받은 신뢰 별점 (15건 이상)', s.trust, 4.5, '', s.trust >= 4.5 && s.trustN >= 15]],
  4: s => [['모임 주최', s.hosted, 10, '회', s.hosted >= 10], ['받은 신뢰 별점 (30건 이상)', s.trust, 4.8, '', s.trust >= 4.8 && s.trustN >= 30]]
};
function gradeOf(uid){ const s = statsOf(uid); let g = 0; for (let k = 1; k <= 4; k++) { if (COND[k](s).every(c => c[4])) g = k; else break; } return g; }
function scoreOf(stId){
  const rs = S.reviews.filter(r => r.st === stId);
  let sw = 0, sws = 0;
  const rows = rs.map(r => { const dw = divWeight(histOf(r.uid)), vw = (VER[r.v] || VER.none)[1], w = dw * vw; sw += w; sws += w * r.s; return { r, dw, vw, w }; });
  const avg = rs.length ? rs.reduce((a, r) => a + r.s, 0) / rs.length : 0;
  return { score: (15 + sws) / (5 + sw), sw, sws, rows, n: rs.length, avg, shown: sw >= 5 && rs.length >= 3 };
}
const ranked = () => STORES.map(st => ({ st, k: scoreOf(st.id) })).filter(x => x.st.img || x.k.n > 0).sort((a, b) => (b.k.shown - a.k.shown) || (b.k.score - a.k.score) || (b.k.n - a.k.n));
function agg(stId){
  const rs = S.reviews.filter(r => r.st === stId);
  const crit = {}; CRIT.forEach(c => { const v = rs.map(r => r.crit && r.crit[c.k]).filter(Boolean); crit[c.k] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; });
  const kw = {}; rs.forEach(r => (r.kw || []).forEach(k => kw[k] = (kw[k] || 0) + 1));
  const menu = {}; rs.forEach(r => Object.entries(r.menu || {}).forEach(([m, v]) => { menu[m] = menu[m] || [0, 0]; menu[m][v ? 0 : 1]++; }));
  const mode = f => { const c = {}; rs.forEach(r => { const v = r.visit && r.visit[f]; if (v) c[v] = (c[v] || 0) + 1; }); const e = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return e ? e[0] : '–'; };
  const rv = rs.filter(r => r.revisit).map(r => r.revisit);
  return { n: rs.length, crit, kw: Object.entries(kw).sort((a, b) => b[1] - a[1]), menu: Object.entries(menu).sort((a, b) => (b[1][0] - b[1][1]) - (a[1][0] - a[1][1])), wait: mode('wait'), spend: mode('spend'), with: mode('with'), when: mode('when'), revisit: rv.length ? Math.round(rv.filter(x => x === 3).length / rv.length * 100) : 0 };
}
const me = () => S.authUser && S.authUser.uid;
const M = id => S.meets.find(m => m.id === id);
const upcoming = () => S.meets.filter(m => m.status !== 'cancelled' && m.startAt > Date.now() - 6 * 3600e3);
const inWindow = m => Date.now() >= m.startAt - 30 * 60e3 && Date.now() <= m.startAt + 5 * 3600e3;
const roomsOf = () => COMMS.map(c => ({ ...c, type: 'comm', path: `communities/${c.id}/messages` })).concat(S.meets.filter(m => (m.members || []).includes(me()) && m.status !== 'cancelled').map(m => { const st = ST(m.store); return { id: m.id, type: 'meet', title: m.title, sub: `${when(m.startAt)} · ${st.name}`, icon: catOf(st)[2], c: [catOf(st)[0], catOf(st)[1]], path: `meets/${m.id}/messages` }; }));

/* ---------- QR 체크인 ---------- */
const ciUrl = (id, code) => { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('ci', `${id}.${code}`); if (B && B.mode === 'local') u.searchParams.set('local', ''); return u.toString().replace('local=', 'local'); };
function ensureQr(id){ const code = S.code[id]; if (!code || S.qr[id] !== undefined) return; S.qr[id] = ''; qrSvg(ciUrl(id, code), { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#191F28', light: '#FFFFFF' } }).then(svg => { S.qr[id] = svg; render(); }).catch(() => { delete S.qr[id]; }); }
(() => { const q = new URLSearchParams(location.search).get('ci'); if (q) { try { sessionStorage.setItem('matchin-ci', q); } catch (e) {} const u = new URL(location.href); u.searchParams.delete('ci'); history.replaceState(null, '', u.toString().replace('local=', 'local')); } })();
let ciBusy = false;
function processCi(){
  if (ciBusy || !S.authUser || !S.me || !S.meetsLoaded) return;
  let q = null; try { q = sessionStorage.getItem('matchin-ci'); } catch (e) {} if (!q) return;
  try { sessionStorage.removeItem('matchin-ci'); } catch (e) {}
  const [id, code] = q.split('.'); const m = M(id);
  if (!m) { toast('QR의 모임을 찾을 수 없어요', true); return; }
  S.tab = 'meets'; S.stack = [{ s: 'meets' }, { s: 'meet', id }];
  if ((m.checkedIn || []).includes(me())) { toast('이미 체크인했어요'); return render(true); }
  if (!(m.members || []).includes(me())) { S.err = '이 모임에 참여한 사람만 체크인할 수 있어요. 먼저 참여해 주세요.'; render(true); return toast(S.err, true); }
  ciBusy = true; run(async () => { try { await B.checkin(id, me(), code); } catch (e) { if (String(e.code || '').includes('permission')) throw { code: 'bad-code' }; throw e; } }, '동석 인증 완료').finally(() => { ciBusy = false; if (S.err) toast(S.err, true); });
}

/* ---------- 내비 ---------- */
const cur = () => S.stack[S.stack.length - 1];
function go(scr){ S.err = ''; S.stack.push(scr); render(true); }
function back(){ S.err = ''; if (S.stack.length > 1) S.stack.pop(); render(true); }
function tab(t){ S.err = ''; S.tab = t; S.stack = [{ s: t }]; render(true); }
let toastT;
let toastEl = null;
function toast(msg, bad){ if (toastEl) toastEl.remove(); const el = toastEl = document.createElement('div'); el.className = 'toast'; el.innerHTML = (bad ? I('warning-circle', 20, 'f', 'color:#FF8A7A') : I('check-circle', 20, 'f')) + '<span></span>'; el.querySelector('span').textContent = msg; $app.appendChild(el); clearTimeout(toastT); toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2600); }
const backBtn = () => `<button type="button" class="ib" data-act="back" aria-label="뒤로">${I('caret-left', 24)}</button>`;
const navBar = (title, right = '') => `<div class="nav">${S.stack.length > 1 ? backBtn() : '<span></span>'}<h2>${title}</h2><span>${right}</span></div>`;
const tabHead = (left, right = '') => `<div class="thead">${left}<span class="sp"></span>${right}</div>`;
const errBox = () => S.err ? `<div class="err">${I('warning-circle', 18, 'f')}${esc(S.err)}</div>` : '';
const cta = (inner, meta = '') => `<div class="cta">${meta ? `<div class="meta">${meta}</div>` : ''}${inner}</div>`;
function tabbar(){
  const T = [['home', '홈', 'house'], ['stores', '지도', 'map-trifold'], ['meets', '모임', 'users-three'], ['chat', '채팅', 'chat-circle-dots'], ['me', '마이', 'user-circle']];
  if (isAdmin()) { const n = S.reports.filter(r => r.status === 'open').length; T.push(['admin', n ? `운영 ${n}` : '운영', 'shield-check']); }
  return `<nav class="tabbar">${T.map(([k, n, i]) => `<button type="button" class="${S.tab === k ? 'on' : ''}" data-act="tab" data-t="${k}">${I(i, 26, S.tab === k ? 'f' : 'r')}${n}</button>`).join('')}</nav>`;
}
const STARTXT = ['', '별로예요', '아쉬워요', '괜찮아요', '좋아요', '최고예요'];
const starPick = (key, val, big = true) => `<div class="${big ? 'bigstars' : 'smstars'}" role="radiogroup">${[1,2,3,4,5].map(n => `<button type="button" class="${val >= n ? 'on' : ''}" data-act="pick" data-k="${key}" data-v="${n}" aria-label="${n}점"><svg width="${big ? 42 : 28}" height="${big ? 42 : 28}" viewBox="0 0 256 256" aria-hidden="true"><path d="${STAR}" fill="currentColor"/></svg></button>`).join('')}</div>`;
const empty = (icon, title, sub, btn = '') => `<div class="emptyst">${I(icon, 44, 'd')}<b>${title}</b><span>${sub}</span>${btn}</div>`;

/* ---------- 조각 ---------- */
function postCard(r, showStore = true){
  const st = ST(r.st); if (!st) return '';
  const kws = (r.kw || []).slice(0, 4).map(k => { const pos = CRIT.some(c => c.pos.includes(k)); return `<span class="kw ${pos ? 'pos' : 'neg'}">${pos ? I('thumbs-up', 12, 'f') : I('thumbs-down', 12, 'r')}${esc(k)}</span>`; }).join('');
  const menus = Object.entries(r.menu || {}).map(([m, v]) => `<span class="kw menu ${v ? '' : 'bad'}">${I('fork-knife', 12, 'f')}${esc(m)}</span>`).join('');
  const vi = r.visit || {}; const vm = [['clock', vi.when], ['users', vi.with], ['hourglass', vi.wait], ['wallet', vi.spend]].filter(x => x[1]).map(([i, t]) => `<span>${I(i, 13)}${esc(t)}</span>`).join('');
  const mine = r.uid === me();
  return `<article class="post"><div class="ph">${av(r.uid)}<div style="flex:1;min-width:0"><div class="nm">${esc(nick(r.uid))} ${gb(gradeOf(r.uid))}</div><div class="cap2">${ago(r.createdAt)}</div></div>${vb(r.v)}</div>
    ${showStore ? `<button type="button" class="pstore" data-act="go" data-s="store" data-id="${r.st}">${thumb(st, 40, 10)}<span style="flex:1;min-width:0"><b>${esc(st.name)}</b><span class="cap2">${esc(st.cat)} · ${esc(st.area)}</span></span>${stars(r.s, 13)}<span style="color:var(--g400)">${I('caret-right', 16)}</span></button>` : `<div style="margin:10px 0 8px">${stars(r.s, 15)}</div>`}
    ${r.t ? `<p>${esc(r.t)}</p>` : ''}${kws || menus ? `<div class="kws">${kws}${menus}</div>` : ''}${vm ? `<div class="vmeta">${vm}</div>` : ''}
    <div style="margin-top:10px">${mine ? `<button type="button" class="toggle" data-act="delReview" data-st="${r.st}">내 후기 삭제</button>` : `<button type="button" class="toggle mute" data-act="reportOpen" data-type="review" data-id="${esc(r.id || r.st + '_' + r.uid)}">신고</button>`}</div></article>`;
}
function meetCard(m){
  const st = ST(m.store), n = (m.members || []).length, joined = (m.members || []).includes(me());
  const full = n >= m.cap, past = m.startAt < Date.now() - 6 * 3600e3;
  const label = m.status === 'cancelled' ? '취소됨' : past ? '지난 모임' : joined ? (m.host === me() ? '내가 주최' : '참여 중') : full ? '마감' : (m.cap - n <= 2 ? `${m.cap - n}자리 남음` : '');
  return `<button type="button" class="meet" data-act="go" data-s="meet" data-id="${m.id}">
    <span class="mt">${thumb(st, 84, 16)}<span class="dt">${when(m.startAt).split(' ')[0]}</span></span>
    <span class="in"><span class="row" style="gap:5px">${label ? `<span class="chip ${joined ? 'dark' : 'acc'}">${label}</span>` : ''}${(m.tags || []).slice(0, 2).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</span>
      <span class="t" style="display:block">${esc(m.title)}</span>
      <span class="cap" style="display:block">${when(m.startAt)} · ${esc(st.name)}</span>
      <span class="row" style="margin-top:8px;gap:6px">${av(m.host, 'sm')}<span style="font-size:13px;font-weight:600">${esc(nick(m.host))}</span>${gb(gradeOf(m.host))}<span class="sp"></span><span class="cap2" style="font-weight:600;color:var(--g700)">${n}/${m.cap}</span><span class="seat"><b style="width:${n / m.cap * 100}%"></b></span></span></span></button>`;
}

/* ---------- 클릭형 후기 폼 ---------- */
const newDraft = (st, meet = null) => ({ st, meet, s: 0, crit: {}, kw: [], menu: {}, visit: meet ? { with: 'MATCHIN 모임' } : {}, revisit: 0, t: '', menuSkip: false, menuNew: '' });
const rfProgress = d => [!!(d.visit.when && d.visit.with), Object.keys(d.menu).length > 0 || d.menuSkip, CRIT.every(x => d.crit[x.k]), !!(d.s && d.revisit)];
function autoSum(d){
  const parts = CRIT.filter(c => d.crit[c.k]).map(c => `${c.n} <b>${LV3[d.crit[c.k] - 1]}</b>`);
  const good = Object.entries(d.menu).filter(([, v]) => v === 1).map(([m]) => m), bad = Object.entries(d.menu).filter(([, v]) => v === 0).map(([m]) => m);
  let s = parts.join(' · ');
  if (d.kw.length) s += `<br>${d.kw.slice(0, 4).map(esc).join(', ')}`;
  if (good.length) s += `<br>추천 메뉴: <b>${good.map(esc).join(', ')}</b>`; if (bad.length) s += ` · 아쉬운 메뉴: ${bad.map(esc).join(', ')}`;
  if (d.revisit) s += `<br>재방문: <b>${REVISIT[d.revisit - 1]}</b>`;
  return s || '항목을 누르면 후기 문장이 자동으로 만들어져요.';
}
function reviewForm(d, fixed){
  const st = ST(d.st), P = rfProgress(d), done = P.filter(Boolean).length;
  const sec = (i, t, sub, body) => `<div class="wsec"><h4><span class="n ${P[i] ? 'ok' : ''}">${P[i] ? '✓' : i + 1}</span>${t}</h4>${sub ? `<p class="sub">${sub}</p>` : ''}${body}</div>`;
  const pills = (f, o) => `<div class="pills">${o.map(v => `<button type="button" class="${d.visit[f] === v ? 'on' : ''}" data-act="visit" data-f="${f}" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>`;
  const q = S.storeQ.trim(), cand = STORES.filter(s => !q || s.name.includes(q)).slice(0, q ? 20 : 8);
  const menus = [...new Set((st.menu || []).concat(Object.keys(d.menu)))];
  return `<div class="wprog"><div class="row" style="font-size:13px;font-weight:600;color:var(--g600)"><span>${done}/4 완료</span><span class="sp"></span><span>클릭만으로 작성돼요</span></div><div class="bar"><b style="width:${done / 4 * 100}%"></b></div></div>
    ${fixed ? '' : `<div class="wsec" style="padding-bottom:0"><h4>어디를 다녀왔나요?</h4><input class="inp" id="store-q" placeholder="매장 이름 검색 (흑석·상도·노량진 ${STORES.length}곳)" value="${esc(S.storeQ)}" style="margin-top:10px"><div class="pills" style="margin-top:10px">${cand.map(s => `<button type="button" class="${d.st === s.id ? 'on' : ''}" data-act="wst" data-v="${s.id}">${esc(s.name)}</button>`).join('')}${!cand.some(s => s.id === d.st) ? `<button type="button" class="on" data-act="wst" data-v="${d.st}">${esc(st.name)}</button>` : ''}</div></div>`}
    ${sec(0, '방문 정보', '언제, 누구와, 얼마나 기다렸는지', Object.entries(VISIT).map(([f, v]) => `<div class="qlab row" style="gap:5px">${I(v.ic, 16, 'd')}${v.n}</div>${pills(f, v.o)}`).join(''))}
    ${sec(1, '메뉴', '한 번 누르면 추천, 두 번 누르면 아쉬움', `<div class="pills">${menus.map(m => { const v = d.menu[m]; return `<button type="button" class="${v === 1 ? 'mup' : v === 0 ? 'mdn' : ''}" data-act="menuT" data-v="${esc(m)}">${v === 1 ? I('thumbs-up', 14, 'f') : v === 0 ? I('thumbs-down', 14, 'f') : I('plus', 14)}${esc(m)}</button>`; }).join('')}</div>
      <div class="row" style="margin-top:10px;gap:8px"><input class="inp" id="menu-new" placeholder="메뉴 직접 추가" maxlength="20" value="${esc(d.menuNew)}" style="flex:1"><button type="button" class="toggle" data-act="menuAdd">추가</button><button type="button" class="toggle" data-act="menuSkip">${d.menuSkip ? '✓ ' : ''}기억 안 나요</button></div>`)}
    ${sec(2, '평가 기준', '항목마다 한 번씩만 눌러 주세요', CRIT.map(c => `<div class="critc ${d.crit[c.k] ? 'done' : ''}"><div class="hd"><span class="ico">${I(c.ic, 18, 'd')}</span>${c.n}<span class="sp"></span>${d.crit[c.k] ? `<span class="cap2" style="color:var(--acc);font-weight:700">${LV3[d.crit[c.k] - 1]}</span>` : ''}</div>
        <div class="face3">${[['smiley-sad', 1], ['smiley-meh', 2], ['smiley', 3]].map(([ic, v]) => `<button type="button" class="${d.crit[c.k] === v ? 'on' : ''}" data-act="crit" data-k="${c.k}" data-v="${v}">${I(ic, 22, d.crit[c.k] === v ? 'f' : 'r')}${LV3[v - 1]}</button>`).join('')}</div>
        ${d.crit[c.k] ? `<div class="pills kwl">${(d.crit[c.k] >= 2 ? c.pos : []).concat(d.crit[c.k] <= 2 ? c.neg : []).map(k => `<button type="button" class="${c.neg.includes(k) ? 'neg' : ''} ${d.kw.includes(k) ? 'on' : ''}" data-act="kwT" data-v="${esc(k)}">${c.neg.includes(k) ? '' : '+ '}${esc(k)}</button>`).join('')}</div>` : ''}</div>`).join(''))}
    ${sec(3, '총평', '1~5점, 늘 같은 점수보다 가려 주는 별점이 매장 점수에 더 크게 반영돼요', `${starPick('draft', d.s)}<div class="starlab">${STARTXT[d.s] || '&nbsp;'}</div><div class="qlab">다시 올 건가요?</div><div class="pills">${REVISIT.map((v, i) => `<button type="button" class="${d.revisit === i + 1 ? 'on' : ''}" data-act="revisit" data-v="${i + 1}">${v}</button>`).join('')}</div>`)}
    <div class="autosum"><div class="cap2" style="margin-bottom:4px;font-weight:700">${I('sparkle', 13, 'f')} 자동 요약</div>${autoSum(d)}</div>
    <div class="wsec"><div class="qlab" style="margin-top:0">덧붙일 말 <span class="cap2">선택 · 500자</span></div><textarea id="d-t" data-d="t" maxlength="500" placeholder="예: 볶음밥은 꼭 시키세요" style="min-height:76px">${esc(d.t)}</textarea>
    <p class="hint">${d.meet ? '이 모임에 체크인했기 때문에 <b>동석 인증 ×1.5</b>로 반영돼요.' : '일반 후기는 미인증(×0.5)으로 반영돼요. 모임에서 체크인 후 쓰면 동석 인증(×1.5)이 돼요.'} 한 매장에 한 사람 한 건만 남고, 다시 쓰면 바뀌어요.</p>${errBox()}</div>`;
}
const validDraft = d => { if (!d.s) return '총평 별점을 골라 주세요.'; const miss = CRIT.filter(c => !d.crit[c.k]); if (miss.length) return `평가 기준 중 ${miss.map(c => c.n).join(', ')}을(를) 눌러 주세요.`; return ''; };

/* ---------- 동의 ---------- */
const CONSENTS = [
  ['age14', '만 14세 이상이에요', ''],
  ['terms', '이용약관 동의', 'terms.html'],
  ['privacy', '개인정보 수집·이용 동의', 'privacy.html#collect'],
  ['overseas', '개인정보 국외 이전 동의 (Google·GitHub 미국 서버)', 'privacy.html#overseas']
];
function consentBlock(f){
  f.c ??= {}; const all = CONSENTS.every(([k]) => f.c[k]);
  return `<div class="consent"><button type="button" class="call ${all ? 'on' : ''}" data-act="cAll"><span class="ck ${all ? 'on' : ''}">${all ? '✓' : ''}</span>모두 동의 <span class="cap2" style="margin-left:auto">모두 필수</span></button>
    ${CONSENTS.map(([k, n, href]) => `<div class="cline"><button type="button" data-act="cOne" data-k="${k}"><span class="ck sm ${f.c[k] ? 'on' : ''}">${f.c[k] ? '✓' : ''}</span>[필수] ${n}</button>${href ? `<a href="${href}" target="_blank" rel="noopener">보기</a>` : ''}</div>`).join('')}
    <p class="hint" style="margin:8px 2px 0">수집 항목: Google 계정(로그인용, 비공개), 닉네임, 선택 프로필, 후기·모임·채팅 기록. 탈퇴하면 바로 삭제돼요. 동의하지 않으면 가입할 수 없어요. 마케팅 문자·메일은 보내지 않아요.</p></div>`;
}

/* ---------- 화면 ---------- */
const screens = {
  login(){
    const a = S.auth, local = B && B.mode === 'local';
    return `<div class="scroll" style="padding-bottom:40px"><div class="pad" style="padding-top:56px">
      <div class="wm" style="font-size:30px"><i style="width:34px;height:34px;border-radius:10px">${I('fork-knife', 20, 'f')}</i>MATCHIN</div>
      <div style="font-size:24px;font-weight:700;letter-spacing:-.03em;line-height:1.35;margin-top:22px">믿을 수 있는 후기,<br>같이 먹으며 쌓는다</div>
      <p class="cap" style="line-height:1.6;margin:10px 0 0">광고 없는 솔직 후기와 맛집 모임. 모든 기능 무료,<br>모임은 한 달 ${MONTHLY_FREE}회까지 참여할 수 있어요.</p>
      ${local ? `<div class="box" style="margin-top:18px;font-size:13px;line-height:1.55;color:var(--g700)">${I('info', 16, 'f', 'color:var(--acc);vertical-align:-3px')} <b>체험 모드</b> · 서버가 아직 연결되지 않아 이 브라우저에만 저장돼요. 다른 사람과 공유되지 않아요.</div>` : ''}
      <button type="button" class="btn line" data-act="google" style="margin-top:34px;display:flex;align-items:center;justify-content:center;gap:10px;padding:17px" ${a.busy ? 'disabled' : ''}><span style="width:22px;height:22px;border-radius:50%;background:conic-gradient(#EA4335 0 25%,#FBBC05 0 50%,#34A853 0 75%,#4285F4 0);display:inline-block"></span>${a.busy ? '잠시만요…' : 'Google로 간편 시작'}</button>
      ${errBox()}
      <div class="box" style="margin-top:18px;font-size:13.5px;line-height:1.6;color:var(--g700)"><b style="color:var(--ink)">앱 안에서는 닉네임만 보여요.</b><br>Google 이름·사진·이메일은 다른 회원에게 공개되지 않고, 로그인 확인에만 쓰여요. 비밀번호를 만들 필요도 없어요.</div>
      <p class="hint" style="margin-top:22px">처음 한 번 닉네임만 정하면 끝이에요. 실명·전화번호는 받지 않아요. 만 14세 이상만 가입할 수 있어요.</p>
      <p class="cap2" style="margin-top:14px"><a href="terms.html" target="_blank" rel="noopener" style="color:var(--g600)">이용약관</a> · <a href="privacy.html" target="_blank" rel="noopener" style="color:var(--g600);font-weight:700">개인정보 처리방침</a></p></div></div>`;
  },
  onboard(){
    const f = S.form; f.nickname ??= ''; f.status ??= ''; f.school ??= ''; f.area ??= ''; f.cats ??= []; f.pledge ??= false;
    const pills = (k, o, multi) => `<div class="pills">${o.map(v => { const on = multi ? f[k].includes(v) : f[k] === v; return `<button type="button" class="${on ? 'on' : ''}" data-act="ob" data-k="${k}" data-v="${esc(v)}" data-m="${multi ? 1 : ''}">${esc(v)}</button>`; }).join('')}</div>`;
    return `${navBar('간편 가입')}<div class="scroll"><div class="pad">
      <div style="font-size:22px;font-weight:700;letter-spacing:-.03em;line-height:1.35;margin-top:4px">반가워요!<br>닉네임을 정해 주세요</div>
      <div class="field"><label for="ob-nick">닉네임 <span class="cap2">2~12자 · 모든 활동에 이 이름만 보여요</span></label><input id="ob-nick" class="inp" data-f="nickname" maxlength="12" value="${esc(f.nickname)}" placeholder="예: 흑석곱창러"></div>
      <div class="field"><span class="lb">지금 나는 <span class="cap2">선택 · 신입생·복학생 모임 찾기에 쓰여요</span></span>${pills('status', ['신입생', '재학생', '복학생', '휴학생', '졸업생·직장인', '동네 주민'])}</div>
      <div class="field"><label for="ob-school">학교 <span class="cap2">선택</span></label><input id="ob-school" class="inp" data-f="school" maxlength="20" value="${esc(f.school)}" placeholder="예: 중앙대"></div>
      <div class="field"><span class="lb">주로 먹는 동네 <span class="cap2">선택</span></span>${pills('area', ['흑석', '상도', '노량진', '그 외'])}</div>
      <div class="field"><span class="lb">좋아하는 음식 <span class="cap2">여러 개</span></span>${pills('cats', ['국밥', '곱창', '고기', '회', '중식', '분식', '카페'], true)}</div>
      <button type="button" class="opt ${f.pledge ? 'on' : ''}" data-act="obPledge" style="margin-top:20px"><span class="ck ${f.pledge ? 'on' : ''}">${f.pledge ? '✓' : ''}</span><span><b>광고·협찬 후기를 쓰지 않을게요</b><span class="cap2">매장에서 대가를 받은 후기가 확인되면 이용이 제한돼요</span></span></button>
      ${S.me ? '' : consentBlock(f)}
      ${errBox()}</div></div>${cta(`<button type="button" class="btn pri" data-act="obSave">${S.me ? '저장' : '동의하고 시작하기'}</button>`)}`;
  },
  home(){
    const list = S.reviews.filter(r => S.feedF === 'all' || r.v === S.feedF);
    const F = [['all', '전체'], ['dine', '동석 인증'], ['none', '미인증']];
    const next = upcoming().filter(m => (m.members || []).includes(me()))[0];
    return `${tabHead(`<span class="wm"><i>${I('fork-knife', 15, 'f')}</i>MATCHIN</span><span class="chip acc" style="margin-left:6px">무료 베타</span>`, '')}
    <div class="scroll">${S.notice ? `<div class="notice">${I('megaphone', 18, 'f')}<span>${esc(S.notice.text)}</span></div>` : ''}${myBan() ? `<div class="err" style="margin:4px 20px 10px">${I('warning-circle', 18, 'f')}이용이 정지된 상태예요 (${new Date(myBan().until).toLocaleDateString('ko-KR')}까지). 사유: ${esc(myBan().reason)}</div>` : ''}${next ? `<button type="button" class="alert" data-act="go" data-s="meet" data-id="${next.id}"><span class="ic">${I('calendar-check', 24, 'f')}</span><span style="flex:1;min-width:0"><b>${esc(next.title)}</b><span class="s"><span class="live"></span>${when(next.startAt)} · ${esc(ST(next.store).name)}</span></span><span style="color:#6B7684">${I('caret-right', 18)}</span></button>` : ''}
      <div class="trust"><span class="ico">${I('shield-check', 18, 'f')}</span><span><b>광고·협찬 없는</b> 솔직 후기만. 모임에서 같이 먹고 쓴 후기는 <b>동석 인증</b>으로 표시돼요.</span></div>
      <div class="filters" style="margin-top:10px">${F.map(([k, n]) => `<button type="button" class="${S.feedF === k ? 'on' : ''}" data-act="feedF" data-v="${k}">${n}</button>`).join('')}</div>
      ${list.map(r => postCard(r)).join('') || empty('note-pencil', '아직 후기가 없어요', '첫 후기를 남겨 동네 맛집 지도를 함께 만들어요', `<button type="button" class="btn pri" style="width:auto;padding:12px 22px" data-act="go" data-s="write">첫 후기 쓰기</button>`)}
    </div><button type="button" class="fab" data-act="go" data-s="write">${I('pencil-simple', 18, 'f')}후기 쓰기</button>${tabbar()}`;
  },
  write(){ return `${navBar('후기 쓰기')}<div class="scroll" style="padding-bottom:120px">${reviewForm(S.draft, false)}</div>${cta(`<button type="button" class="btn pri" data-act="postReview">올리기</button>`)}`; },
  stores(){
    const R = ranked(), mode = S.mapMode, sel = S.mapSel || (R[0] && R[0].st.id);
    const chips = [['score', 'MATCHIN 점수', 'star'], ['heat', '누적 후기', 'fire'], ['meet', '모임', 'users-three']];
    const ms = upcoming();
    const cards = mode === 'meet'
      ? (ms.map(m => { const st = ST(m.store); return `<button type="button" class="mcard" data-act="go" data-s="meet" data-id="${m.id}">${thumb(st, 60, 14)}<span class="in"><span class="chip" style="background:#EFEAFF;color:#6D4AFF">${when(m.startAt)}</span><b style="margin-top:4px">${esc(m.title)}</b><span class="cap2">${esc(st.name)} · ${(m.members || []).length}/${m.cap}명 · 무료</span></span>${I('caret-right', 18)}</button>`; }).join('') || `<div class="mcard" style="justify-content:center"><span class="cap">예정된 모임이 없어요 · 모임 탭에서 열어 보세요</span></div>`)
      : R.map(({ st, k }) => { const a = agg(st.id); return `<button type="button" class="mcard ${sel === st.id ? 'sel' : ''}" data-act="go" data-s="store" data-id="${st.id}">${thumb(st, 64, 16)}<span class="in"><b>${esc(st.name)}</b><span class="cap2">${esc(st.cat)} · ${esc(st.area)}</span><span class="kw" style="display:flex;background:none;padding:0;margin-top:6px;gap:4px">${a.kw.slice(0, 2).map(([w]) => `<span class="kw pos">${esc(w)}</span>`).join('') || `<span class="cap2">후기 ${k.n}개</span>`}</span></span>${k.shown ? `<span class="scbox"><div class="v">${f2(k.score)}</div><div class="l">후기 ${k.n}</div></span>` : `<span class="pend">수집 중</span>`}</button>`; }).join('');
    const legend = mode === 'heat' ? `<div class="mlegend"><b>누적 후기 밀도</b><br><i style="background:#FFD166"></i>적음 <i style="background:#FF8A3D"></i>보통 <i style="background:#E5262B"></i>많음</div>` : mode === 'score' ? `<div class="mlegend"><i style="background:var(--acc)"></i>점수 공개 <i style="background:#fff;box-shadow:inset 0 0 0 1px #B0B8C1"></i>평가 수집 중</div>` : `<div class="mlegend"><i style="background:#6D4AFF"></i>예정된 모임</div>`;
    return `<div class="mapwrap"><div id="mapSlot"></div>
      <div class="mtop"><div class="mchips">${chips.map(([k, n, i]) => `<button type="button" class="${mode === k ? 'on' : ''}" data-act="mapMode" data-v="${k}">${I(i, 15, mode === k ? 'f' : 'r')}${n}</button>`).join('')}<button type="button" data-act="go" data-s="rank">${I('list', 15)}순위 목록</button></div></div>
      ${legend}<button type="button" class="mloc" data-act="mapHome" aria-label="처음 위치">${I('crosshair', 22)}</button>
      <div class="mcards" id="mcards">${cards}</div></div>${tabbar()}`;
  },
  rank(){
    const R = STORES.map(st => ({ st, k: scoreOf(st.id) })).sort((a, b) => (b.k.shown - a.k.shown) || (b.k.score - a.k.score) || (b.k.n - a.k.n));
    return `${navBar('MATCHIN 점수 순위')}<div class="scroll">
      <div class="pad" style="margin:4px 0 6px"><span class="cap2">광고 순위 없음 · 가중치 합 5 이상·작성자 3명 이상이면 점수 공개</span></div>
      ${R.map(({ st, k }, i) => `<button type="button" class="store" data-act="go" data-s="store" data-id="${st.id}"><span class="rk ${k.shown && i < 3 ? 't' : ''}">${k.shown ? i + 1 : '–'}</span>${thumb(st, 56, 14)}<span class="in"><b>${esc(st.name)}</b><span class="cap">${esc(st.cat)} · ${esc(st.area)} · 후기 ${k.n}</span></span>${k.shown ? `<span class="scbox"><div class="v">${f2(k.score)}</div><div class="l">MATCHIN</div></span>` : `<span class="pend">${k.n ? '수집 중' : '후기 없음'}</span>`}</button>`).join('')}</div>`;
  },
  store({ id }){
    const st = ST(id), k = scoreOf(id), a = agg(id), maxW = Math.max(1, ...k.rows.map(x => x.w)), maxK = Math.max(1, ...a.kw.map(x => x[1]));
    const rv = S.reviews.filter(r => r.st === id);
    return `<div class="scroll" style="padding-bottom:40px">${hero(st, st.cat)}<button type="button" class="ib float" data-act="back" aria-label="뒤로">${I('caret-left', 22)}</button>
      <div class="pad"><div class="ttl">${esc(st.name)}</div><div class="cap row" style="gap:4px">${I('map-pin', 15, 'f')}${esc(st.area)} · 후기 ${a.n}개${a.n ? ` · 재방문 의향 ${a.revisit}%` : ''}</div>
      ${k.shown ? `<div class="score"><div><div class="big">${f2(k.score)}</div><div class="lab">MATCHIN 점수</div></div><div class="cmp"><div class="cap2">단순 평균이었다면</div><div class="o">${f2(k.avg)}</div></div></div>`
        : `<div class="score" style="align-items:center"><div><div style="font-size:20px;font-weight:700">평가 수집 중</div><div class="lab">믿을 만한 별점이 아직 부족해요</div></div><div class="cmp"><div class="cap2">가중치 ${f1(k.sw)} / 5</div><div class="cap2">작성자 ${k.n} / 3명</div></div></div>`}
      <div class="acts" style="grid-template-columns:repeat(3,1fr)"><button type="button" class="pri" data-act="rsvOpen" data-id="${id}">${I('calendar-check', 22, 'f')}예약·웨이팅</button><button type="button" data-act="writeHere" data-id="${id}">${I('pencil-simple', 22, 'd')}후기 쓰기</button><button type="button" data-act="shareOpen" data-id="${id}">${I('share-network', 22, 'd')}채팅 공유</button></div></div>
      ${a.n ? `<div class="div"></div>
      <div class="pad"><div class="sec">평가 기준 <small>후기 ${a.n}건 집계</small></div>
        <div class="cbars">${CRIT.map(c => `<div class="cb"><span class="row" style="gap:6px">${I(c.ic, 16, 'd', 'color:var(--acc)')}${c.n}</span><span class="tr"><b style="width:${a.crit[c.k] ? (a.crit[c.k] - 1) / 2 * 100 : 0}%"></b></span><span class="v">${a.crit[c.k] ? LV3[Math.round(a.crit[c.k]) - 1] : '–'}</span></div>`).join('')}</div></div>
      ${a.kw.length ? `<div class="pad" style="margin-top:22px"><div class="sec">자주 고른 키워드</div><div class="kwtop">${a.kw.slice(0, 5).map(([w, c]) => { const pos = CRIT.some(x => x.pos.includes(w)); return `<div class="r"><span class="bg"><i style="width:${c / maxK * 100}%;background:${pos ? '#FFE9DF' : '#EEF1F6'}"></i><span>${pos ? '' : '(아쉬움) '}${esc(w)}</span></span><b>${c}</b></div>`; }).join('')}</div></div>` : ''}
      ${a.menu.length ? `<div class="pad" style="margin-top:22px"><div class="sec">메뉴 반응</div><div class="pills">${a.menu.map(([m, [u, dn]]) => `<span class="kw menu" style="font-size:13px;padding:6px 10px">${esc(m)} <b style="margin-left:4px">${I('thumbs-up', 12, 'f')} ${u}</b>${dn ? `<span style="color:var(--g500);margin-left:4px">${I('thumbs-down', 12)} ${dn}</span>` : ''}</span>`).join('')}</div></div>` : ''}
      <div class="pad" style="margin-top:22px"><div class="sec">방문 정보</div><div class="vinfo"><div><span class="l">${I('hourglass', 14)}웨이팅</span><b>${esc(a.wait)}</b></div><div><span class="l">${I('wallet', 14)}1인 지출</span><b>${esc(a.spend)}</b></div><div><span class="l">${I('users', 14)}주로 누구와</span><b>${esc(a.with)}</b></div><div><span class="l">${I('clock', 14)}주로 언제</span><b>${esc(a.when)}</b></div></div></div>
      <div class="div"></div>
      <div class="pad"><div class="sec">누구의 별점이 얼마나 반영됐나</div>
        <div class="wlist">${k.rows.slice().sort((x, y) => y.w - x.w).map(({ r, dw, vw, w }) => `<div class="wr">${av(r.uid)}<div style="min-width:0"><div class="row" style="gap:6px;font-size:14.5px;font-weight:600">${esc(nick(r.uid))} ${stars(r.s, 12)}</div><div class="cap2" style="margin-top:2px">변별력 ×${dw.toFixed(1)} · ${(VER[r.v] || VER.none)[0]} ×${vw.toFixed(1)}</div><div class="wbar"><b style="width:${w / maxW * 100}%"></b></div></div><div class="wv">${f2(w)}</div></div>`).join('')}</div>
        <div class="formula">(3.0 × 5 + Σ가중치×별점) ÷ (5 + Σ가중치)<br>= (15 + ${f1(k.sws)}) ÷ (5 + ${f2(k.sw)}) = <b>${f2(k.score)}</b></div>
        <p class="hint">변별력 = 별점을 얼마나 고르게 주는가(후기 5개 이상부터). 늘 5점이면 ×0.3, 1~5점을 고르게 쓰면 ×1.5.</p></div>
      <div class="div"></div><div class="pad"><div class="sec">이 매장 후기 <small>${rv.length}</small></div></div>${rv.map(r => postCard(r, false)).join('')}`
      : `<div class="pad" style="margin-top:24px">${empty('note-pencil', '아직 후기가 없어요', '이 매장의 첫 후기를 남겨 주세요')}</div>`}</div>`;
  },
  meets(){
    const used = S.used, ms = upcoming().filter(m => S.meetF === 'all' || (S.meetF === 'mine' ? (m.members || []).includes(me()) : (m.tags || []).includes(S.meetF)));
    const F = [['all', '전체'], ['mine', '내 모임'], ['신입생 환영', '신입생 환영'], ['복학생 환영', '복학생 환영']];
    return `${tabHead('<h1>모임</h1>', `<button type="button" class="ib" data-act="go" data-s="create" aria-label="모임 열기">${I('plus', 24)}</button>`)}<div class="scroll">
      <div class="pass"><div class="row"><span class="k">${I('ticket', 15, 'f')} 이번 달 무료 참여</span></div>
        <div class="n">${Math.max(0, MONTHLY_FREE - used)}회 <small>/ ${MONTHLY_FREE}회 남음</small></div><div class="dots">${Array.from({ length: MONTHLY_FREE }, (_, i) => `<i class="${i < MONTHLY_FREE - used ? 'on' : ''}"></i>`).join('')}</div><div class="ft">결제 없음 · 매달 1일 초기화 · 모임 열기는 횟수 제한 없음</div></div>
      <div class="filters" style="margin-top:18px">${F.map(([k, n]) => `<button type="button" class="${S.meetF === k ? 'on' : ''}" data-act="meetF" data-v="${esc(k)}">${n}</button>`).join('')}</div>
      ${ms.map(meetCard).join('') || `<div class="pad" style="margin-top:20px">${empty('users-three', '예정된 모임이 없어요', '가고 싶은 맛집이 있다면 직접 열어 보세요. 신입생·복학생 환영 모임도 좋아요.', `<button type="button" class="btn pri" style="width:auto;padding:12px 22px" data-act="go" data-s="create">모임 열기</button>`)}</div>`}
      <div class="pad" style="margin-top:14px"><button type="button" class="opt" data-act="go" data-s="create" style="background:var(--g50);border-color:var(--g50)"><span class="thumb" style="width:40px;height:40px;border-radius:12px;background:var(--accs);color:var(--acc)">${I('chef-hat', 22, 'd')}</span><span style="flex:1"><b>나도 모임 열기</b><span class="cap2">미식 소개서만 쓰면 누구나 · 무료</span></span>${I('caret-right', 18)}</button></div>
    </div>${tabbar()}`;
  },
  meet({ id }){
    const m = M(id); if (!m) return `${navBar('모임')}<div class="scroll">${empty('info', '모임을 찾을 수 없어요', '취소되었거나 삭제된 모임이에요')}</div>`;
    const st = ST(m.store), mem = m.members || [], chk = m.checkedIn || [], n = mem.length, joined = mem.includes(me()), host = m.host === me(), checked = chk.includes(me());
    const started = Date.now() >= m.startAt, past = Date.now() > m.startAt + 5 * 3600e3, cancelled = m.status === 'cancelled';
    const myDine = S.reviews.find(r => r.uid === me() && r.st === m.store && r.v === 'dine' && r.meet === id);
    const toRate = chk.filter(u => u !== me() && !S.ratings.some(r => r.meet === id && r.rater === me() && r.ratee === u));
    let btn, meta = '';
    if (cancelled) btn = `<button type="button" class="btn" disabled>취소된 모임이에요</button>`;
    else if (checked && started && !myDine) btn = `<button type="button" class="btn pri" data-act="go" data-s="dineReview" data-id="${id}">동석 후기 쓰기</button>`;
    else if (checked && started && toRate.length) btn = `<button type="button" class="btn pri" data-act="go" data-s="rate" data-id="${id}">신뢰 별점 남기기 (${toRate.length}명)</button>`;
    else if (joined && !checked && inWindow(m)) btn = `<button type="button" class="btn pri" data-act="go" data-s="checkin" data-id="${id}">현장 체크인</button>`;
    else if (joined) btn = `<button type="button" class="btn soft" data-act="go" data-s="room" data-id="${id}">모임 대화방 열기</button>`;
    else if (past) btn = `<button type="button" class="btn" disabled>지난 모임이에요</button>`;
    else if (n >= m.cap) btn = `<button type="button" class="btn" disabled>마감됐어요</button>`;
    else if (S.used >= MONTHLY_FREE) btn = `<button type="button" class="btn" disabled>이번 달 무료 참여 ${MONTHLY_FREE}회를 모두 썼어요</button>`;
    else { btn = `<button type="button" class="btn pri" data-act="join" data-id="${id}">무료로 참여하기</button>`; meta = `<span class="cap2">이번 달</span><b>${MONTHLY_FREE - S.used}회 남음</b>`; }
    const code = S.code[id];
    return `<div class="scroll">${hero(st, when(m.startAt))}<button type="button" class="ib float" data-act="back" aria-label="뒤로">${I('caret-left', 22)}</button>
      <div class="pad"><div class="row" style="gap:5px;margin-top:16px;flex-wrap:wrap"><span class="chip acc">무료</span><span class="chip">${esc(st.cat)}</span>${(m.tags || []).map(t => `<span class="chip">${esc(t)}</span>`).join('')}${joined ? `<span class="chip dark">${host ? '내가 주최' : '참여 중'}</span>` : ''}</div>
        <div class="ttl" style="margin-top:10px">${esc(m.title)}</div>
        <div class="info"><div>${I('calendar-blank', 20, 'd')}${when(m.startAt)}</div><button type="button" data-act="go" data-s="store" data-id="${st.id}" style="border:0;background:none;padding:0;display:flex;gap:10px;align-items:center;font-size:15px;color:var(--g700);text-align:left">${I('map-pin', 20, 'd', 'color:var(--g400)')}${esc(st.name)} · ${esc(st.area)} ${I('caret-right', 14)}</button><div>${I('users-three', 20, 'd')}${n} / ${m.cap}명 · 체크인 ${chk.length}명 · 식비는 현장에서 각자</div><div>${I('calendar-check', 20, 'd')}좌석: ${esc(m.rsvBy)}</div></div>
        ${host && !cancelled ? `<div class="box" style="margin-top:14px"><div class="row"><b>체크인 QR · 코드</b><span class="sp"></span>${code ? `<span style="font-size:26px;font-weight:800;letter-spacing:.2em;color:var(--acc)">${esc(code)}</span>` : `<button type="button" class="toggle" data-act="showCode" data-id="${id}">QR·코드 보기</button>`}</div>${code ? `<div class="qrbox">${S.qr[id] || '<span class="cap2">QR 만드는 중…</span>'}</div>` : ''}<p class="hint" style="margin-top:6px">현장에서 참가자가 휴대폰 카메라로 QR을 비추면 바로 체크인돼요. QR이 안 되면 4자리 코드를 불러 주세요. 단톡방 등에 올리지 마세요. 주최자도 체크인해야 동석 후기를 쓸 수 있어요.</p>${!checked && inWindow(m) ? `<button type="button" class="btn line" style="margin-top:10px" data-act="hostCheckin" data-id="${id}">나도 체크인</button>` : ''}</div>` : ''}
        ${joined ? `<button type="button" class="opt" data-act="go" data-s="room" data-id="${id}" style="margin-top:14px"><span class="thumb" style="width:40px;height:40px;border-radius:12px;background:#EFEAFF;color:#6D4AFF">${I('chats-circle', 22, 'd')}</span><span style="flex:1"><b>모임 대화방</b><span class="cap2">참여자끼리만 보여요</span></span>${I('caret-right', 18)}</button>` : `<div class="box" style="margin-top:14px;display:flex;gap:10px;align-items:center">${I('lock-simple', 20, 'd', 'color:var(--g500)')}<span class="cap" style="font-size:13.5px">참여하면 모임 대화방이 열려요</span></div>`}</div>
      <div class="div"></div>
      <div class="pad"><div class="sec">주최자</div><div class="host">${av(m.host, 'lg')}<div style="flex:1"><div class="row" style="gap:6px"><b style="font-size:16px">${esc(nick(m.host))}</b>${gb(gradeOf(m.host))}</div><div class="cap" style="margin-top:3px">${(() => { const t = trustOf(m.host); const u = S.users[m.host] || {}; return `${esc(u.status || '')}${u.school ? ' · ' + esc(u.school) : ''}${t.n >= 3 ? ` · 신뢰 별점 ★${f1(t.avg)} (${t.n})` : ' · 신규 주최자'}`; })()}</div></div></div></div>
      <div class="div"></div>
      <div class="pad"><div class="sec">미식 소개서</div><dl class="dl"><dt>최근</dt><dd>${esc(m.intro && m.intro.recent)}</dd><dt>좋아하는 것</dt><dd>${esc(m.intro && m.intro.fav)}</dd><dt>꼭 먹을 것</dt><dd>${esc(m.intro && m.intro.must)}</dd></dl>
        <div class="pledge">${I('shield-check', 18, 'f')}주최자 서약 · 매장에서 대가를 받지 않았어요</div></div>
      <div class="div"></div>
      <div class="pad"><div class="sec">함께 먹는 사람 <small>${n}/${m.cap}</small></div>
        ${mem.map(x => `<div class="mem">${av(x)}<b>${esc(nick(x))}</b>${gb(gradeOf(x))}${x === m.host ? '<span class="cap2">주최</span>' : ''}${chk.includes(x) ? '<span class="vb dine" style="margin-left:auto">체크인</span>' : ''}</div>`).join('')}
        <p class="hint">무료 참여는 한 달 ${MONTHLY_FREE}회, 참여를 취소해도 횟수는 돌아오지 않아요. 노쇼는 신뢰 별점에 반영돼요.</p>
        ${joined && !host && !started && !cancelled ? `<button type="button" class="toggle" data-act="leave" data-id="${id}">참여 취소</button>` : ''}
        ${host && !started && !cancelled ? `<button type="button" class="toggle" data-act="cancelMeet" data-id="${id}">모임 취소</button>` : ''}
        ${!host ? `<button type="button" class="toggle mute" data-act="reportOpen" data-type="meet" data-id="${id}">이 모임 신고</button>` : ''}
        ${errBox()}</div>
    </div>${cta(btn, meta)}`;
  },
  checkin({ id }){
    const m = M(id), st = ST(m.store);
    return `${navBar('현장 체크인')}<div class="scroll"><div class="pad">
      <div class="row" style="gap:12px;margin-top:4px">${thumb(st, 48, 12)}<div><b style="font-size:16px">${esc(m.title)}</b><div class="cap">${esc(st.name)} · ${when(m.startAt)}</div></div></div>
      <div class="box" style="margin-top:22px;display:flex;gap:12px;align-items:center">${I('qr-code', 34, 'd', 'color:var(--acc);flex:none')}<span style="font-size:14px;line-height:1.55"><b>가장 빠른 방법</b><br>휴대폰 기본 카메라로 주최자 화면의 QR을 비추고, 뜨는 링크를 누르세요.</span></div>
      <div style="font-size:18px;font-weight:700;margin-top:26px">QR이 안 되면 4자리 코드</div>
      <input id="ck-code" class="inp" inputmode="numeric" maxlength="4" autocomplete="one-time-code" style="font-size:32px;font-weight:800;letter-spacing:.4em;text-align:center;margin-top:12px" placeholder="····">
      <p class="hint">같은 자리에 있었다는 증거예요. 체크인하면 이 모임에서 쓰는 후기가 <b>동석 인증 ×1.5</b>로 반영돼요. 모임 30분 전부터 5시간 뒤까지 가능해요.</p>${errBox()}
    </div></div>${cta(`<button type="button" class="btn pri" data-act="checkin" data-id="${id}">체크인</button>`)}`;
  },
  dineReview({ id }){
    const m = M(id), st = ST(m.store);
    return `${navBar('동석 후기')}<div class="scroll" style="padding-bottom:120px"><div class="pad row" style="gap:12px;margin:4px 0 6px">${thumb(st, 48, 12)}<div style="flex:1"><b style="font-size:16px">${esc(st.name)}</b><div class="cap">${esc(m.title)}</div></div>${vb('dine')}</div>${reviewForm(S.draft, true)}</div>${cta(`<button type="button" class="btn pri" data-act="dinePost" data-id="${id}">올리기</button>`)}`;
  },
  rate({ id }){
    const m = M(id), chk = (m.checkedIn || []).filter(u => u !== me()), F = S.form;
    return `${navBar('신뢰 별점')}<div class="scroll"><div class="pad">
      <div style="font-size:22px;font-weight:700;letter-spacing:-.03em;line-height:1.35;margin-top:4px">오늘 같이 먹은 사람은<br>어땠나요?</div>
      <p class="cap" style="margin:8px 0 10px;line-height:1.55">체크인한 사람끼리만 남길 수 있고, 한 번 남기면 바꿀 수 없어요. 화면에는 평균만 보여요.</p>
      ${chk.map(x => { const done = S.ratings.find(r => r.meet === id && r.rater === me() && r.ratee === x); return `<div class="row" style="padding:14px 0;border-bottom:1px solid var(--g100)">${av(x)}<div style="flex:1"><div class="row" style="gap:5px"><b>${esc(nick(x))}</b>${gb(gradeOf(x))}</div>${x === m.host ? '<div class="cap2">주최자</div>' : ''}</div>${done ? `<span class="cap2">★${done.s} 완료</span>` : starPick('rate:' + x, (F.rate || {})[x] || 0, false)}</div>`; }).join('') || '<p class="cap">아직 체크인한 다른 사람이 없어요.</p>'}
      ${errBox()}</div></div>${cta(`<button type="button" class="btn pri" data-act="finishRate" data-id="${id}">보내기</button>`)}`;
  },
  chat(){
    const rooms = roomsOf(), meetsR = rooms.filter(r => r.type === 'meet'), comm = rooms.filter(r => r.type === 'comm');
    const row = r => `<button type="button" class="room" data-act="go" data-s="room" data-id="${r.id}"><span class="ri" style="background:${r.c[0]};color:${r.c[1]}">${I(r.icon, 28, 'd')}</span><span class="in"><b>${esc(r.title)}</b><div class="p">${esc(r.sub)}</div></span>${I('caret-right', 18, 'r', 'color:var(--g400)')}</button>`;
    return `${tabHead('<h1>채팅</h1>')}<div class="scroll">
      <div class="pad row" style="margin:6px 0 2px"><span class="sec" style="margin:0;font-size:15px">모임 대화방</span><span class="sp"></span><span class="cap2">참여한 모임만</span></div>
      ${meetsR.map(row).join('') || `<div class="pad"><div class="box cap" style="font-size:13.5px;display:flex;gap:8px;align-items:center">${I('lock-simple', 18, 'd')}모임에 참여하면 대화방이 생겨요</div></div>`}
      <div class="div" style="margin:16px 0 10px"></div>
      <div class="pad row" style="margin:0 0 2px"><span class="sec" style="margin:0;font-size:15px">커뮤니티</span><span class="sp"></span><span class="cap2">광고 금지</span></div>
      ${comm.map(row).join('')}</div>${tabbar()}`;
  },
  room({ id }){
    const r = roomsOf().find(x => x.id === id); if (!r) return `${navBar('대화방')}<div class="scroll">${empty('lock-simple', '들어갈 수 없는 대화방이에요', '모임에 참여한 사람만 볼 수 있어요')}</div>`;
    const msgs = S.msgs[r.path];
    const body = msgs === undefined ? '<div class="sysm"><span>불러오는 중…</span></div>' : msgs === null ? '<div class="sysm"><span>메시지를 불러오지 못했어요</span></div>' : (msgs.map(x => {
      const mine = x.uid === me(); let inner;
      if (x.card && ST(x.card)) { const st = ST(x.card), k = scoreOf(x.card); inner = `<button type="button" class="scard" data-act="go" data-s="store" data-id="${x.card}">${thumb(st, 44, 12)}<span style="flex:1;min-width:0"><b>${esc(st.name)}</b><span class="cap2">${esc(st.cat)} · ${k.shown ? 'MATCHIN ' + f2(k.score) : '평가 수집 중'}</span></span>${I('caret-right', 16)}</button>`; }
      else inner = `<div class="bb"></div>`;
      return `<div class="msg ${mine ? 'me' : ''}" data-mid="${esc(x.id)}">${mine ? '' : av(x.uid, 'sm')}<div class="bx">${mine ? '' : `<div class="who">${esc(nick(x.uid))} ${gb(gradeOf(x.uid))}</div>`}${inner}</div><span class="tm">${ago(x.createdAt)}</span></div>`;
    }).join('') || '<div class="sysm"><span>첫 메시지를 남겨 보세요</span></div>');
    return `${navBar(esc(r.title), r.type === 'meet' ? `<button type="button" class="ib" data-act="go" data-s="meet" data-id="${id}" aria-label="모임 정보">${I('info', 22)}</button>` : '')}
      <div class="chat" id="chatBox"><div class="sysm"><span>${esc(r.sub)}</span></div>${body}</div>
      <div class="cinput"><button type="button" class="pb" data-act="pickCard" aria-label="매장 공유">${I('plus', 24)}</button><input id="chat-in" placeholder="메시지 보내기" maxlength="500" value="${esc(S.chatDraft)}" autocomplete="off"><button type="button" class="sb" data-act="send" aria-label="보내기">${I('paper-plane-tilt', 20, 'f')}</button></div>`;
  },
  me(){
    const uid = me(), u = S.me || {}, s = statsOf(uid), g = gradeOf(uid), hist = histOf(uid), d = divIndex(hist), dw = divWeight(hist);
    const cnt = [1,2,3,4,5].map(n => hist.filter(x => x === n).length), mx = Math.max(1, ...cnt);
    const C = COND[Math.min(g + 1, 4)](s), mine = S.reviews.filter(r => r.uid === uid);
    const needVerify = S.authUser.provider === 'password' && !S.authUser.verified && B.mode !== 'local';
    return `${tabHead('<h1>마이</h1>')}<div class="scroll">
      ${needVerify ? `<div class="box" style="margin:4px 20px 6px;font-size:13.5px;line-height:1.55">${I('envelope-simple', 16, 'f', 'color:var(--acc);vertical-align:-3px')} <b>이메일 인증이 아직이에요.</b> ${esc(S.authUser.email)}로 보낸 링크를 눌러 주세요.<div class="row" style="gap:8px;margin-top:8px"><button type="button" class="toggle" data-act="resendVerify">메일 다시 보내기</button><button type="button" class="toggle" data-act="checkVerify">인증했어요</button></div></div>` : ''}
      <div class="prof">${av(uid, 'lg')}<div style="flex:1"><div class="row" style="gap:6px"><b style="font-size:20px">${esc(u.nickname)}</b>${gb(g)}</div><div class="cap" style="margin-top:3px">${esc(u.status || '')}${u.school ? ' · ' + esc(u.school) : ''}${u.area ? ' · ' + esc(u.area) : ''}</div></div><button type="button" class="toggle" data-act="editProfile">수정</button></div>
      <div class="stats"><div><b>${s.trustN ? '★' + f1(s.trust) : '–'}</b><span>신뢰 별점 ${s.trustN}건</span></div><div><b>${s.attended}회</b><span>모임 참여</span></div><div><b>${MONTHLY_FREE - S.used}회</b><span>이번 달 남은 참여</span></div></div>
      <div class="div"></div>
      <div class="pad"><div class="sec">등급</div>
        <div class="ladder"><span class="fill" style="width:calc((100% - 28px) * ${g / 4})"></span>${GRADES.map((x, i) => `<span class="lv ${i < g ? 'done' : i === g ? 'cur' : ''}"><i>${i < g ? '✓' : ''}</i>${x}</span>`).join('')}</div>
        <div class="box" style="margin-top:20px"><div style="font-size:15px;font-weight:700;margin-bottom:2px">${g >= 4 ? '최고 등급' : `${GRADES[g + 1]}까지`}</div>
          ${C.map(([n, v, goal, unit, ok]) => `<div class="cond"><div class="row">${n}<span class="v" style="color:${ok ? 'var(--ok)' : 'var(--ink)'}">${unit === '' ? f1(v) : v}${unit} <span class="cap2">/ ${goal}${unit}</span></span></div><div class="pbar"><b class="${ok ? 'ok' : ''}" style="width:${Math.min(100, v / goal * 100)}%"></b></div></div>`).join('')}</div></div>
      <div class="div"></div>
      <div class="pad"><div class="sec">내 별점 변별력</div>
        <div class="hist">${cnt.map((c, i) => `<div><div class="bar" style="height:${Math.max(4, c / mx * 64)}px;opacity:${.45 + c / mx * .55}"></div><div class="cap2">${i + 1}점</div></div>`).join('')}</div>
        <div class="box" style="margin-top:14px"><div class="kv"><span>변별력 지수 (0~1)</span><b>${d === null ? `후기 ${5 - hist.length}개 더 필요` : f2(d)}</b></div><div class="kv"><span>내 별점의 가중치</span><b style="color:var(--acc)">×${dw.toFixed(1)}</b></div></div></div>
      <div class="div"></div>
      <div class="pad"><div class="sec">내 후기 <small>${mine.length}</small></div></div>${mine.map(r => postCard(r)).join('') || '<p class="cap pad">아직 없어요</p>'}
      <div class="div"></div>
      <div class="pad" style="padding-bottom:20px"><div class="cap2" style="line-height:1.7">${B.mode === 'local' ? '체험 모드: 이 브라우저에만 저장돼요.' : `로그인: ${esc(S.authUser.email || 'Google 계정')}`}</div><button type="button" class="btn line" style="margin-top:12px" data-act="logout">로그아웃</button>
        <div class="row" style="gap:14px;margin-top:18px;font-size:13px"><a href="terms.html" target="_blank" rel="noopener" style="color:var(--g600)">이용약관</a><a href="privacy.html" target="_blank" rel="noopener" style="color:var(--g600);font-weight:700">개인정보 처리방침</a><span class="sp"></span><button type="button" class="toggle mute" data-act="go" data-s="withdraw">회원 탈퇴</button></div></div>
    </div>${tabbar()}`;
  },
  admin(){
    if (!isAdmin()) return `${tabHead('<h1>운영</h1>')}<div class="scroll">${empty('lock-simple', '운영자만 볼 수 있어요', '')}</div>${tabbar()}`;
    const users = Object.values(S.users), F = S.adminF, now = Date.now();
    const open = S.reports.filter(r => r.status === 'open');
    const month = monthKey();
    const stat = [['회원', users.length], ['후기', S.allReviews.length], ['모임', S.allMeets.length], ['이번 달 모임', S.allMeets.filter(m => monthKey(m.startAt) === month).length]];
    const tabs = [['open', `신고 ${open.length}`], ['hidden', '숨김'], ['users', '회원'], ['notice', '공지']];
    const target = r => {
      if (r.type === 'review') { const v = S.allReviews.find(x => x.id === r.target); if (!v) return `<div class="cap2">삭제된 후기</div>`; const st = ST(v.st); return `<div class="atgt"><b>${esc(nick(v.uid))}</b>의 후기 · ${esc(st ? st.name : '')} ${stars(v.s, 11)}${v.hidden ? ' <span class="chip">숨김</span>' : ''}<div class="cap2" style="margin-top:3px">${esc(v.t || '(내용 없음)')}</div></div>`; }
      if (r.type === 'meet') { const m = S.allMeets.find(x => x.id === r.target); if (!m) return `<div class="cap2">삭제된 모임</div>`; return `<div class="atgt"><b>${esc(m.title)}</b> · 주최 ${esc(nick(m.host))}${m.status === 'hidden' ? ' <span class="chip">숨김</span>' : ''}<div class="cap2" style="margin-top:3px">${esc(m.intro && m.intro.must || '')}</div></div>`; }
      return '';
    };
    const ownerOf = r => r.type === 'review' ? (S.allReviews.find(x => x.id === r.target) || {}).uid : (S.allMeets.find(x => x.id === r.target) || {}).host;
    let body = '';
    if (F === 'open') body = open.map(r => `<div class="acard"><div class="row" style="gap:6px"><span class="chip acc">${esc(r.reason)}</span><span class="chip">${r.type === 'review' ? '후기' : '모임'}</span><span class="sp"></span><span class="cap2">${ago(r.createdAt)} · 신고 ${esc(nick(r.by))}</span></div>${r.memo ? `<p class="cap" style="margin:8px 0 0">"${esc(r.memo)}"</p>` : ''}${target(r)}
        <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap"><button type="button" class="toggle" data-act="aHide" data-rep="${esc(r.id)}">숨기고 처리</button><button type="button" class="toggle" data-act="aBan" data-uid="${esc(ownerOf(r) || '')}" data-rep="${esc(r.id)}">작성자 7일 정지</button><button type="button" class="toggle mute" data-act="aReject" data-rep="${esc(r.id)}">문제없음(기각)</button></div></div>`).join('') || empty('check-circle', '처리할 신고가 없어요', '새 신고가 들어오면 운영 탭에 숫자가 떠요');
    if (F === 'hidden') { const hr = S.allReviews.filter(r => r.hidden), hm = S.allMeets.filter(m => m.status === 'hidden');
      body = hr.map(v => `<div class="acard"><div class="row"><span><b>${esc(nick(v.uid))}</b>의 후기 · ${esc((ST(v.st) || {}).name || '')}</span><span class="sp"></span><button type="button" class="toggle" data-act="aUnhideR" data-id="${esc(v.id)}">되돌리기</button></div><div class="cap2" style="margin-top:4px">${esc(v.t || '')}${v.hiddenReason ? ` · 사유: ${esc(v.hiddenReason)}` : ''}</div></div>`).join('')
        + hm.map(m => `<div class="acard"><div class="row"><span>모임 <b>${esc(m.title)}</b></span><span class="sp"></span><button type="button" class="toggle" data-act="aUnhideM" data-id="${esc(m.id)}">되돌리기</button></div><div class="cap2" style="margin-top:4px">주최 ${esc(nick(m.host))}${m.hiddenReason ? ` · 사유: ${esc(m.hiddenReason)}` : ''}</div></div>`).join('') || empty('lock-simple', '숨긴 항목이 없어요', ''); }
    if (F === 'users') body = users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(u => { const b = S.bans.find(x => x.id === u.id && x.until > now); const n = S.allReviews.filter(r => r.uid === u.id).length;
      return `<div class="acard row" style="gap:10px">${av(u.id)}<div style="flex:1;min-width:0"><b>${esc(u.nickname)}</b> ${gb(gradeOf(u.id))}<div class="cap2">${esc(u.status || '-')} · 후기 ${n} · 신고받음 ${S.reports.filter(r => ownerOf(r) === u.id).length}${b ? ` · <b style="color:#D92D20">정지 ~${new Date(b.until).toLocaleDateString('ko-KR')}</b>` : ''}</div></div>${u.id === me() ? '<span class="cap2">나</span>' : b ? `<button type="button" class="toggle" data-act="aUnban" data-uid="${esc(u.id)}">정지 해제</button>` : `<button type="button" class="toggle mute" data-act="aBan" data-uid="${esc(u.id)}">7일 정지</button>`}</div>`; }).join('');
    if (F === 'notice') body = `<div class="pad"><p class="cap" style="margin:4px 0 10px">홈 화면 맨 위에 모든 회원에게 보여요. 비우고 저장하면 내려가요.</p><textarea id="a-notice" maxlength="200" placeholder="예: 12/9(화) 흑석시장 신입생 환영 모임 열려요!" style="min-height:80px">${esc(S.notice ? S.notice.text : '')}</textarea><button type="button" class="btn pri" data-act="aNotice" style="margin-top:12px">공지 저장</button></div>`;
    return `${tabHead('<h1>운영</h1>', '<span class="chip dark">운영자</span>')}<div class="scroll">
      <div class="stats" style="grid-template-columns:repeat(4,1fr)">${stat.map(([n, v]) => `<div><b>${v}</b><span>${n}</span></div>`).join('')}</div>
      <div class="filters" style="margin-top:10px">${tabs.map(([k, n]) => `<button type="button" class="${F === k ? 'on' : ''}" data-act="adminF" data-v="${k}">${n}</button>`).join('')}</div>
      <div style="padding:0 16px">${body}</div>${errBox()}
      <p class="hint pad" style="margin-top:16px">운영 권한은 서버 보안 규칙에서 이 계정만 허용돼요. 숨김은 삭제가 아니라 되돌릴 수 있어요.</p></div>${tabbar()}`;
  },
  withdraw(){
    const mine = S.reviews.filter(r => r.uid === me()).length, hosting = upcoming().filter(m => m.host === me() && m.status !== 'cancelled').length;
    return `${navBar('회원 탈퇴')}<div class="scroll"><div class="pad">
      <div style="font-size:22px;font-weight:700;letter-spacing:-.03em;line-height:1.35;margin-top:4px">탈퇴하면 이렇게 처리돼요</div>
      <div class="box" style="margin-top:16px"><div class="kv"><span>내 프로필·로그인 계정</span><b>즉시 삭제</b></div><div class="kv"><span>내 후기 ${mine}건</span><b>즉시 삭제</b></div><div class="kv"><span>내가 남긴 신뢰 별점</span><b>즉시 삭제</b></div><div class="kv"><span>참여 중인 모임</span><b>자동으로 나감</b></div><div class="kv"><span>내가 연 예정 모임 ${hosting}개</span><b>취소됨</b></div><div class="kv"><span>대화방 메시지</span><b>'탈퇴한 회원'으로 표시</b></div></div>
      <p class="hint">대화 흐름을 위해 메시지 내용은 남고 작성자 정보는 지워져요. 메시지까지 지우길 원하면 처리방침의 연락처로 요청해 주세요. 삭제한 정보는 되돌릴 수 없어요.</p>
      <div class="field"><label for="wd-confirm">확인을 위해 <b>탈퇴</b>라고 적어 주세요</label><input id="wd-confirm" class="inp" autocomplete="off"></div>${errBox()}
    </div></div>${cta(`<button type="button" class="btn" style="background:#D92D20" data-act="withdraw" ${S.busy ? 'disabled' : ''}>탈퇴하기</button>`)}`;
  },
  create(){
    const f = S.form; f.store ??= 's3'; f.cap ??= 4; f.title ??= ''; f.recent ??= ''; f.fav ??= ''; f.must ??= ''; f.pledge ??= false; f.rsv ??= ''; f.tags ??= []; f.when ??= '';
    const st = ST(f.store), R = st.rsv || {};
    const RS = [['캐치테이블', R.catch], ['테이블링', R.tabling], ['네이버 예약', R.naver], ['전화·현장 대기', '가능']];
    const q = S.storeQ.trim(), cand = STORES.filter(s => !q || s.name.includes(q)).slice(0, q ? 20 : 8);
    return `${navBar('모임 열기')}<div class="scroll"><div class="pad">
      <div class="box" style="display:flex;gap:10px;margin-top:4px"><span style="color:var(--acc);flex:none">${I('chef-hat', 20, 'd')}</span><span style="font-size:13.5px;line-height:1.55;color:var(--g700)">누구나 무료로 열 수 있어요. <b style="color:var(--ink)">미식 소개서</b>가 참가자에게 그대로 보여요.</span></div>
      <div class="field"><label for="c-title">모임 이름</label><input id="c-title" class="inp" data-f="title" maxlength="40" value="${esc(f.title)}" placeholder="예: 신입생 환영 흑석시장 순댓국"></div>
      <div class="field"><label for="c-when">날짜·시간</label><input id="c-when" class="inp" type="datetime-local" data-f="when" value="${esc(f.when)}"></div>
      <div class="field"><span class="lb">매장</span><input class="inp" id="store-q" placeholder="매장 이름 검색" value="${esc(S.storeQ)}"><div class="pills" style="margin-top:10px">${cand.map(s => `<button type="button" class="${f.store === s.id ? 'on' : ''}" data-act="cstore" data-v="${s.id}">${esc(s.name)}</button>`).join('')}${!cand.some(s => s.id === f.store) ? `<button type="button" class="on">${esc(st.name)}</button>` : ''}</div></div>
      <div class="field"><span class="lb">좌석 예약 방법</span><div class="pills">${RS.map(([n, v]) => `<button type="button" class="${f.rsv === n ? 'on' : ''}" data-act="crsv" data-v="${n}">${n}</button>`).join('')}</div><p class="hint">예약은 주최자가 해당 앱에서 직접 해 주세요. MATCHIN은 예약을 대신하지 않아요.</p></div>
      <div class="field"><span class="lb">인원 (나 포함)</span><div class="seg">${[3, 4, 5, 6].map(n => `<button type="button" class="${f.cap === n ? 'on' : ''}" data-act="ccap" data-v="${n}">${n}명</button>`).join('')}</div></div>
      <div class="field"><span class="lb">이런 분 환영 <span class="cap2">선택</span></span><div class="pills">${TAGS.map(t => `<button type="button" class="${f.tags.includes(t) ? 'on' : ''}" data-act="ctag" data-v="${t}">${t}</button>`).join('')}</div></div>
      <div class="div" style="margin:28px -20px 6px"></div>
      <div class="sec" style="margin-top:20px">미식 소개서 <small>참가자가 모임을 고르는 근거</small></div>
      <div class="field" style="margin-top:10px"><label for="c-recent">최근 다녀온 곳</label><input id="c-recent" class="inp" data-f="recent" maxlength="80" value="${esc(f.recent)}" placeholder="예: 신림 순대타운, 흑석시장"></div>
      <div class="field"><label for="c-fav">좋아하는 음식</label><input id="c-fav" class="inp" data-f="fav" maxlength="40" value="${esc(f.fav)}" placeholder="예: 국밥, 노포"></div>
      <div class="field"><label for="c-must">꼭 먹을 메뉴와 이유 <span class="cap2">20자 이상</span></label><textarea id="c-must" data-f="must" maxlength="300" placeholder="왜 이 집, 이 메뉴인지">${esc(f.must)}</textarea></div>
      <button type="button" class="opt ${f.pledge ? 'on' : ''}" data-act="pledge" style="margin-top:16px"><span class="ck ${f.pledge ? 'on' : ''}">${f.pledge ? '✓' : ''}</span><span><b>매장에서 대가를 받지 않았어요</b><span class="cap2">위반이 확인되면 주최가 제한돼요</span></span></button>
      ${errBox()}</div></div>${cta(`<button type="button" class="btn pri" data-act="publish">모임 열기</button>`)}`;
  }
};

/* ---------- 지도 ---------- */
let MAP = null, mapHost = null, PINS = null;
function initMap(){
  mapHost = document.createElement('div'); mapHost.className = 'mapHost';
  document.getElementById('mapSlot').appendChild(mapHost);
  MAP = L.map(mapHost, { zoomControl: false, minZoom: 13, maxZoom: 19 });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(MAP);
  MAP.attributionControl.setPrefix(false);
  STATIONS.forEach(([n, la, lo, ln]) => L.marker([la, lo], { interactive: false, icon: L.divIcon({ className: '', html: `<div class="stn">${ln.map(([t, c]) => `<i style="background:${c}">${t}</i>`).join('')}${n}</div>`, iconSize: [0, 0] }) }).addTo(MAP));
  PINS = L.layerGroup().addTo(MAP); mapHome();
}
function mapHome(){ MAP && MAP.fitBounds(L.latLngBounds(STORES0.map(x => [x.lat, x.lng])), { paddingTopLeft: [20, 80], paddingBottomRight: [20, 150] }); }
function refreshPins(){
  PINS.clearLayers(); const mode = S.mapMode, R = ranked(), sel = S.mapSel || (R[0] && R[0].st.id);
  if (mode === 'heat') {
    STORES.forEach(s => { const c = S.reviews.filter(r => r.st === s.id).length; if (!c) return; const col = c >= 8 ? '#E5262B' : c >= 3 ? '#FF8A3D' : '#FFD166';
      [[2.2, .12], [1.5, .18], [.9, .3]].forEach(([k, o]) => L.circle([s.lat, s.lng], { radius: (25 + c * 8) * k, stroke: false, fillColor: col, fillOpacity: o, interactive: false }).addTo(PINS));
      L.circleMarker([s.lat, s.lng], { radius: 5, color: '#fff', weight: 1.5, fillColor: col, fillOpacity: 1 }).bindTooltip(`${esc(s.name)} · 후기 ${c}건`, { direction: 'top' }).addTo(PINS); });
    return;
  }
  if (mode === 'meet') {
    upcoming().forEach(m => { const st = ST(m.store); const mk = L.marker([st.lat, st.lng], { icon: L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="pin mpin"><div class="bd"><span class="ci" style="background:rgba(255,255,255,.25)">${I('users-three', 14, 'f')}</span>${when(m.startAt).split(' ')[0]}</div><div class="tl"></div><div class="nm">${esc(m.title)}</div></div>` }) }).addTo(PINS);
      mk.on('click', () => go({ s: 'meet', id: m.id })); });
    return;
  }
  R.forEach(({ st, k }) => { const [, fg, ic] = catOf(st);
    const ci = st.img ? `<span class="ci" style="background:url(${st.img}) center/cover;box-shadow:0 0 0 1.5px #fff"></span>` : `<span class="ci" style="background:${k.shown || sel === st.id ? 'rgba(255,255,255,.25)' : fg}">${I(ic, 14, 'f')}</span>`;
    const mk = L.marker([st.lat, st.lng], { zIndexOffset: sel === st.id ? 1000 : k.shown ? 100 : 0, icon: L.divIcon({ className: '', iconSize: [0, 0], html: `<div class="pin ${k.shown ? 'shown' : 'pend'} ${sel === st.id ? 'sel' : ''}"><div class="bd">${ci}${k.shown ? f2(k.score) : k.n ? '수집 중' : '후기 0'}</div><div class="tl"></div><div class="nm">${esc(st.name)}</div></div>` }) }).addTo(PINS);
    mk.on('click', () => { S.mapSel = st.id; render(); const c = document.querySelector(`.mcard[data-id="${st.id}"]`); if (c) c.scrollIntoView({ inline: 'center', block: 'nearest' }); }); });
}
function attachMap(){
  const slot = document.getElementById('mapSlot'); if (!slot || !window.L) return;
  if (!MAP) initMap(); else slot.appendChild(mapHost);
  MAP.invalidateSize(); refreshPins();
  const mc = document.getElementById('mcards');
  if (mc && !mc.dataset.bound) { mc.dataset.bound = 1; let t; mc.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => { if (S.mapMode !== 'score') return; const cards = [...mc.children]; const mid = mc.scrollLeft + mc.clientWidth / 2; let best = null, bd = 1e9; cards.forEach(c => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = c; } }); if (best && best.dataset.id && best.dataset.id !== S.mapSel) { S.mapSel = best.dataset.id; cards.forEach(c => c.classList.toggle('sel', c === best)); refreshPins(); const st = ST(best.dataset.id); MAP.panTo([st.lat, st.lng]); } }, 140); }); }
}

/* ---------- 시트 ---------- */
const PLAT = { catch: ['캐치테이블', '#FF5A1F', 'CT'], tabling: ['테이블링', '#2F6FEB', 'TB'], naver: ['네이버 지도', '#03A94D', 'N'], kakao: ['카카오맵', '#FFCD00', 'K'] };
function sheetHTML(){
  const sh = S.sheet; if (!sh) return '';
  const wrap = (t, inner) => `<div class="scrim" data-act="closeSheet"><div class="sheet" role="dialog" aria-label="${t}" data-stop="1"><div class="grab"></div>${inner}</div></div>`;
  if (sh.type === 'rsv') {
    const st = ST(sh.id), q = encodeURIComponent(st.name + ' 흑석');
    const rows = [['naver', `https://map.naver.com/p/search/${q}`], ['kakao', `https://map.kakao.com/?q=${q}`], ['catch', 'https://app.catchtable.co.kr/'], ['tabling', 'https://www.tabling.co.kr/']];
    return wrap('예약', `<h3>예약·웨이팅</h3><div class="row" style="gap:10px;margin:10px 0 4px">${thumb(st, 40, 12)}<div><b>${esc(st.name)}</b><div class="cap2">${esc(st.area)}</div></div></div>
      ${rows.map(([k, u]) => `<div class="rsv"><span class="lg" style="background:${PLAT[k][1]};${k === 'kakao' ? 'color:#3A1D1D' : ''}">${PLAT[k][2]}</span><div style="flex:1"><b style="font-size:15px">${PLAT[k][0]}</b><div class="st" style="color:var(--g500)">${k === 'naver' || k === 'kakao' ? '이 매장 검색 결과로 열기' : '앱에서 매장 이름으로 검색'}</div></div><a href="${u}" target="_blank" rel="noopener">열기 ↗</a></div>`).join('')}
      <p class="hint">MATCHIN은 예약을 직접 받지 않고 매장이 쓰는 앱으로 연결만 해요.</p>`);
  }
  if (sh.type === 'share' || sh.type === 'pick') {
    if (sh.type === 'pick') return wrap('매장 카드 보내기', `<h3>매장 카드 보내기</h3><input class="inp" id="store-q" placeholder="매장 이름 검색" value="${esc(S.storeQ)}" style="margin:10px 0">${STORES.filter(s => !S.storeQ || s.name.includes(S.storeQ.trim())).slice(0, 12).map(s => `<button type="button" class="room" style="padding:8px 0" data-act="shareTo" data-id="${sh.room}" data-st="${s.id}">${thumb(s, 40, 12)}<span class="in"><b>${esc(s.name)}</b><div class="p">${esc(s.cat)} · ${esc(s.area)}</div></span></button>`).join('')}`);
    const st = ST(sh.id);
    return wrap('공유', `<h3>어느 대화방에 공유할까요?</h3><div class="row" style="gap:10px;margin:10px 0 6px">${thumb(st, 40, 12)}<b>${esc(st.name)}</b></div>${roomsOf().map(r => `<button type="button" class="room" style="padding:10px 0" data-act="shareTo" data-id="${r.id}" data-st="${sh.id}"><span class="ri" style="width:44px;height:44px;border-radius:14px;background:${r.c[0]};color:${r.c[1]}">${I(r.icon, 24, 'd')}</span><span class="in"><b>${esc(r.title)}</b></span>${I('paper-plane-tilt', 20, 'd', 'color:var(--acc)')}</button>`).join('')}`);
  }
  if (sh.type === 'report') {
    return wrap('신고', `<h3>신고하기</h3><p class="cap" style="margin:6px 0 4px">운영자가 확인 후 조치해요. 신고한 사람은 공개되지 않아요.</p>
      <div class="pills" style="margin-top:10px">${REPORT_REASONS.map(x => `<button type="button" class="${sh.reason === x ? 'on' : ''}" data-act="repReason" data-v="${x}">${x}</button>`).join('')}</div>
      <textarea id="rep-memo" maxlength="300" placeholder="내용 (선택)" style="min-height:70px;margin-top:12px">${esc(sh.memo || '')}</textarea>${errBox()}
      <button type="button" class="btn pri" data-act="repSend" style="margin-top:14px">신고 보내기</button>`);
  }
  if (sh.type === 'join') {
    const m = M(sh.id), st = ST(m.store);
    return wrap('참여', `<h3>참여할까요?</h3><div class="row" style="gap:10px;margin:12px 0 6px">${thumb(st, 44, 12)}<div><b>${esc(m.title)}</b><div class="cap2">${when(m.startAt)} · ${esc(st.name)}</div></div></div>
      <div class="box" style="margin-top:10px"><div class="kv"><span>참가비</span><b>무료</b></div><div class="kv"><span>이번 달 무료 참여</span><b>${MONTHLY_FREE - S.used}회 → ${MONTHLY_FREE - S.used - 1}회</b></div><div class="kv"><span>식비</span><b>현장에서 각자</b></div></div>
      <p class="hint">참여를 취소해도 횟수는 돌아오지 않아요. 참여하면 모임 대화방이 열려요.</p>${errBox()}
      <button type="button" class="btn pri" data-act="confirmJoin" style="margin-top:16px" ${S.busy ? 'disabled' : ''}>참여하기</button>`);
  }
  return '';
}

/* ---------- 액션 ---------- */
const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };
async function run(fn, okMsg){ S.err = ''; S.busy = true; try { await fn(); if (okMsg) toast(okMsg); } catch (e) { console.warn(e); S.err = errText(e); } S.busy = false; render(); }
const A = {
  back, tab: d => tab(d.t),
  go: d => { S.storeQ = ''; if (d.s === 'write') S.draft = newDraft('s3'); if (d.s === 'dineReview') S.draft = newDraft(M(d.id).store, d.id); if (d.s === 'create' || d.s === 'rate') S.form = {}; go({ s: d.s, id: d.id }); },
  writeHere: d => { S.storeQ = ''; S.draft = newDraft(d.id); go({ s: 'write' }); },
  feedF: d => { S.feedF = d.v; render(); }, meetF: d => { S.meetF = d.v; render(); },
  mapMode: d => { S.mapMode = d.v; render(); }, mapHome: () => mapHome(),
  authMode: d => { S.auth.mode = d.v; S.err = ''; render(); },
  google: () => { S.auth.busy = true; render(); B.signInGoogle().catch(e => { S.err = errText(e); }).finally(() => { S.auth.busy = false; render(); }); },
  resetPw: () => { const e = val('a-email').trim(); if (!e) { S.err = '이메일을 먼저 적어 주세요.'; return render(); } B.resetPw(e).then(() => toast('비밀번호 재설정 메일을 보냈어요')).catch(x => { S.err = errText(x); render(); }); },
  ob: d => { const f = S.form; if (d.m) { const i = f[d.k].indexOf(d.v); if (i >= 0) f[d.k].splice(i, 1); else f[d.k].push(d.v); } else f[d.k] = f[d.k] === d.v ? '' : d.v; render(); },
  obPledge: () => { S.form.pledge = !S.form.pledge; render(); },
  cAll: () => { S.err = ''; const f = S.form; f.c ??= {}; const all = CONSENTS.every(([k]) => f.c[k]); CONSENTS.forEach(([k]) => f.c[k] = !all); render(); },
  cOne: d => { S.err = ''; const f = S.form; f.c ??= {}; f.c[d.k] = !f.c[d.k]; render(); },
  obSave: () => { const f = S.form, n = (f.nickname || '').trim(); if (n.length < 2 || n.length > 12) { S.err = '닉네임은 2~12자로 적어 주세요.'; return render(); } if (Object.values(S.users).some(u => u.id !== me() && u.nickname === n)) { S.err = '이미 쓰는 닉네임이에요.'; return render(); } if (!f.pledge) { S.err = '광고·협찬 후기 금지 서약에 체크해 주세요.'; return render(); }
    const isNew = !S.me; if (isNew && !CONSENTS.every(([k]) => f.c && f.c[k])) { S.err = '필수 항목에 모두 동의해 주세요. 만 14세 미만은 가입할 수 없어요.'; return render(); }
    const data = { nickname: n, status: f.status, school: (f.school || '').trim().slice(0, 20), area: f.area, cats: f.cats, pledge: true };
    if (isNew) data.consents = { age14: true, terms: POLICY_DATE, privacy: POLICY_DATE, overseas: POLICY_DATE, at: Date.now() };
    run(() => B.saveProfile(me(), data).then(() => { S.form = {}; S.stack = [{ s: 'home' }]; S.tab = 'home'; }), isNew ? '가입 완료! 환영해요' : '저장했어요'); },
  editProfile: () => { const u = S.me || {}; S.form = { nickname: u.nickname, status: u.status, school: u.school, area: u.area, cats: (u.cats || []).slice(), pledge: true }; go({ s: 'onboard' }); },
  logout: () => B.logout(),
  pick: d => { if (d.k === 'draft') S.draft.s = +d.v; else if (d.k.startsWith('rate:')) { S.form.rate = S.form.rate || {}; S.form.rate[d.k.slice(5)] = +d.v; } render(); },
  wst: d => { const t = S.draft.t; S.draft = newDraft(d.v); S.draft.t = t; render(); },
  visit: d => { S.draft.visit[d.f] = S.draft.visit[d.f] === d.v ? '' : d.v; render(); },
  menuT: d => { const v = S.draft.menu[d.v]; if (v === undefined) S.draft.menu[d.v] = 1; else if (v === 1) S.draft.menu[d.v] = 0; else delete S.draft.menu[d.v]; render(); },
  menuAdd: () => { const m = val('menu-new').trim().slice(0, 20); if (m) { S.draft.menu[m] = 1; S.draft.menuNew = ''; } render(); },
  menuSkip: () => { S.draft.menuSkip = !S.draft.menuSkip; render(); },
  crit: d => { S.draft.crit[d.k] = +d.v; const c = CRIT.find(x => x.k === d.k); S.draft.kw = S.draft.kw.filter(k => !(c.pos.includes(k) && +d.v === 1) && !(c.neg.includes(k) && +d.v === 3)); render(); },
  kwT: d => { const i = S.draft.kw.indexOf(d.v); if (i >= 0) S.draft.kw.splice(i, 1); else S.draft.kw.push(d.v); render(); },
  revisit: d => { S.draft.revisit = +d.v; render(); },
  postReview: () => { if (!banned()) saveDraft(false); },
  dinePost: () => { if (!banned()) saveDraft(true); },
  delReview: d => { if (!window.confirm || window.confirm('이 후기를 삭제할까요?')) run(() => B.deleteReview(d.st, me()), '삭제했어요'); },
  join: d => { S.err = ''; S.sheet = { type: 'join', id: d.id }; render(); },
  closeSheet: () => { S.sheet = null; S.err = ''; render(); },
  confirmJoin: () => { if (banned()) return; const id = S.sheet.id, m = M(id); if (S.used >= MONTHLY_FREE) { S.err = `이번 달 무료 참여 ${MONTHLY_FREE}회를 모두 썼어요.`; return render(); } if ((m.members || []).length >= m.cap) { S.err = '마감됐어요.'; return render(); }
    run(async () => { await B.joinMeet(id, me(), S.used); S.sheet = null; await B.sendMessage(`meets/${id}/messages`, { uid: me(), t: '참여했어요! 반가워요 🙌' }); }, '참여 완료 · 대화방이 열렸어요'); },
  leave: d => run(() => B.leaveMeet(d.id, me()), '참여를 취소했어요'),
  cancelMeet: d => { if (!window.confirm || window.confirm('모임을 취소할까요?')) run(() => B.cancelMeet(d.id), '모임을 취소했어요'); },
  showCode: d => run(async () => { S.code[d.id] = await B.getCode(d.id); }),
  hostCheckin: d => run(async () => { const c = S.code[d.id] || await B.getCode(d.id); S.code[d.id] = c; await B.checkin(d.id, me(), c); }, '체크인 완료'),
  checkin: d => { const c = val('ck-code').replace(/\D/g, ''); if (c.length !== 4) { S.err = '4자리 숫자를 입력해 주세요.'; return render(); }
    run(async () => { try { await B.checkin(d.id, me(), c); } catch (e) { if (String(e.code || '').includes('permission')) throw { code: 'bad-code' }; throw e; } if (cur().s === 'checkin') S.stack.pop(); }, '동석 인증 완료');
  },
  finishRate: d => { const R = S.form.rate || {}; const ids = Object.keys(R); if (!ids.length) { S.err = '별점을 하나 이상 골라 주세요.'; return render(); } run(async () => { for (const u of ids) await B.rate(d.id, me(), u, R[u]); S.form = {}; back(); }, '신뢰 별점을 보냈어요'); },
  ccap: d => { S.form.cap = +d.v; render(); },
  cstore: d => { S.form.store = d.v; render(); },
  crsv: d => { S.form.rsv = d.v; render(); },
  ctag: d => { const t = S.form.tags, i = t.indexOf(d.v); if (i >= 0) t.splice(i, 1); else t.push(d.v); render(); },
  pledge: () => { S.form.pledge = !S.form.pledge; render(); },
  publish: () => {
    if (banned()) return;
    const f = S.form, t = Date.parse(f.when);
    if (!f.title.trim()) { S.err = '모임 이름을 적어 주세요.'; return render(); }
    if (!t || t < Date.now() + 30 * 60e3) { S.err = '날짜·시간은 지금부터 30분 이후로 골라 주세요.'; return render(); }
    if (!f.rsv) { S.err = '좌석 예약 방법을 골라 주세요.'; return render(); }
    if (!f.recent.trim() || !f.fav.trim()) { S.err = '미식 소개서를 채워 주세요.'; return render(); }
    if (f.must.trim().length < 20) { S.err = '꼭 먹을 메뉴와 이유를 20자 이상 적어 주세요.'; return render(); }
    if (!f.pledge) { S.err = '서약에 체크해 주세요.'; return render(); }
    const code = String(Math.floor(1000 + Math.random() * 9000));
    run(async () => { const id = await B.createMeet({ host: me(), store: f.store, title: f.title.trim(), startAt: t, cap: f.cap, rsvBy: f.rsv, tags: f.tags, intro: { recent: f.recent.trim(), fav: f.fav.trim(), must: f.must.trim() }, members: [me()], checkedIn: [], status: 'open' }, code); S.code[id] = code; S.form = {}; S.tab = 'meets'; S.stack = [{ s: 'meets' }, { s: 'meet', id }]; }, '모임을 열었어요');
  },
  reportOpen: d => { S.err = ''; S.sheet = { type: 'report', target: d.id, kind: d.type, reason: '' }; render(); },
  repReason: d => { S.sheet.reason = d.v; S.sheet.memo = val('rep-memo'); render(); },
  repSend: () => { const sh = S.sheet; if (!sh.reason) { S.err = '사유를 골라 주세요.'; return render(); } run(async () => { await B.report({ by: me(), type: sh.kind, target: sh.target, reason: sh.reason, memo: val('rep-memo').trim().slice(0, 300) }); S.sheet = null; }, '신고를 접수했어요'); },
  resendVerify: () => run(() => B.resendVerify(), '인증 메일을 다시 보냈어요'),
  checkVerify: () => run(async () => { const ok = await B.reloadUser(); if (ok) { S.authUser = { ...S.authUser, verified: true }; } else throw { code: 'not-verified' }; }, '이메일 인증 완료'),
  withdraw: () => { const t = val('wd-confirm').trim(); if (t !== '탈퇴') { S.err = "확인란에 '탈퇴'라고 적어 주세요."; return render(); } run(async () => { await B.deleteAccount(me()); S.form = {}; }, '탈퇴했어요. 그동안 고마웠어요'); },
  adminF: d => { S.adminF = d.v; render(); },
  aHide: d => { const r = S.reports.find(x => x.id === d.rep); if (!r) return; run(async () => { if (r.type === 'review') await B.hideReview(r.target, true, r.reason); else await B.setMeetStatus(r.target, 'hidden', r.reason); await B.setReport(r.id, 'done'); }, '숨기고 처리했어요'); },
  aReject: d => run(() => B.setReport(d.rep, 'rejected'), '기각했어요'),
  aBan: d => { if (!d.uid) { S.err = '작성자를 찾을 수 없어요.'; return render(); } if (d.uid === me()) return; const r = d.rep ? S.reports.find(x => x.id === d.rep) : null; run(async () => { await B.ban(d.uid, 7, r ? r.reason : '운영 정책 위반', me()); if (r) { if (r.type === 'review') await B.hideReview(r.target, true, r.reason); else await B.setMeetStatus(r.target, 'hidden', r.reason); await B.setReport(r.id, 'done'); } }, '7일 정지했어요'); },
  aUnban: d => run(() => B.unban(d.uid), '정지를 해제했어요'),
  aUnhideR: d => run(() => B.hideReview(d.id, false, ''), '되돌렸어요'),
  aUnhideM: d => run(() => B.setMeetStatus(d.id, 'open', ''), '되돌렸어요'),
  aNotice: () => run(() => B.setNotice(val('a-notice').trim().slice(0, 200), me()), '공지를 저장했어요'),
  rsvOpen: d => { S.sheet = { type: 'rsv', id: d.id }; render(); },
  shareOpen: d => { S.sheet = { type: 'share', id: d.id }; render(); },
  pickCard: () => { S.storeQ = ''; S.sheet = { type: 'pick', room: cur().id }; render(); },
  shareTo: d => { const r = roomsOf().find(x => x.id === d.id); S.sheet = null; run(async () => { await B.sendMessage(r.path, { uid: me(), card: d.st }); if (cur().s !== 'room') go({ s: 'room', id: d.id }); }); },
  send: () => sendMsg(val('chat-in'))
};
async function saveDraft(dine){
  const d = S.draft, e = validDraft(d); if (e) { S.err = e; return render(); }
  const r = { uid: me(), st: d.st, s: d.s, v: dine ? 'dine' : 'none', meet: dine ? d.meet : null, crit: { ...d.crit }, kw: [...d.kw], menu: { ...d.menu }, visit: Object.fromEntries(Object.entries(d.visit).filter(([, v]) => v)), revisit: d.revisit, t: (d.t || '').trim().slice(0, 500) };
  const existing = S.reviews.find(x => x.uid === me() && x.st === d.st);
  if (!dine && existing && existing.v === 'dine') { S.err = '이 매장에는 이미 동석 인증 후기가 있어요. 일반 후기로 덮어쓸 수 없어요.'; return render(); }
  await run(async () => { await B.saveReview(r); S.draft = null; if (dine) { if (cur().s === 'dineReview') S.stack.pop(); } else { S.tab = 'home'; S.stack = [{ s: 'home' }]; } }, existing ? '후기를 고쳤어요' : '후기를 올렸어요');
}
function sendMsg(t){ t = (t || '').trim().slice(0, 500); if (!t || banned()) return; const r = roomsOf().find(x => x.id === cur().id); if (!r) return; S.chatDraft = ''; B.sendMessage(r.path, { uid: me(), t }).catch(e => { S.err = errText(e); toast(S.err); }); }

/* ---------- 렌더 ---------- */
let msgUnsub = null, msgPath = null, lastKey = '';
function ensureMessages(){
  const c = cur(); const r = c.s === 'room' ? roomsOf().find(x => x.id === c.id) : null; const p = r ? r.path : null;
  if (p === msgPath) return; if (msgUnsub) { msgUnsub(); msgUnsub = null; } msgPath = p;
  if (p) msgUnsub = B.watchMessages(p, list => { S.msgs[p] = list; if (cur().s === 'room') render(); }, () => { S.msgs[p] = null; render(); });
}
function render(resetScroll){
  if (!B) return;
  const sc = $app.querySelector('.scroll'), y = sc ? sc.scrollTop : 0;
  const focusId = document.activeElement && document.activeElement.id, selStart = focusId && document.activeElement.selectionStart;
  let c = cur();
  if (!S.ready) { $app.innerHTML = `<div class="emptyst" style="height:100%">${I('fork-knife', 40, 'd')}<b>불러오는 중…</b></div>`; return; }
  if (!S.authUser) c = { s: 'login' };
  else if (!S.me && c.s !== 'onboard') c = { s: 'onboard' };
  const key = c.s + ':' + (c.id || ''); if (key !== lastKey) { resetScroll = true; lastKey = key; }
  $app.innerHTML = (screens[c.s] ? screens[c.s](c) : screens.home()) + sheetHTML();
  if (toastEl) $app.appendChild(toastEl);
  const ns = $app.querySelector('.scroll'); if (ns && !resetScroll) ns.scrollTop = y;
  if (focusId) { const el = document.getElementById(focusId); if (el && el.tagName === 'INPUT') { el.focus(); try { el.setSelectionRange(selStart, selStart); } catch (e) {} } }
  if (c.s === 'stores') attachMap();
  if (c.s === 'meet' && M(c.id) && M(c.id).host === me()) ensureQr(c.id);
  setTimeout(processCi, 0);
  if (c.s === 'room') { $app.querySelectorAll('.msg[data-mid]').forEach(el => { const m = (S.msgs[msgPath] || []).find(x => x.id === el.dataset.mid); const bb = el.querySelector('.bb'); if (m && bb) bb.textContent = m.t || ''; }); const cb = document.getElementById('chatBox'); if (cb) cb.scrollTop = cb.scrollHeight; }
  ensureMessages();
}
$app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || !$app.contains(el)) return;
  if (el.dataset.act === 'closeSheet' && e.target.closest('[data-stop]')) return;
  const f = A[el.dataset.act]; if (f) { e.preventDefault(); f(el.dataset); }
});
$app.addEventListener('submit', e => {
  if (e.target.id !== 'emailForm') return; e.preventDefault();
  const em = val('a-email').trim(), pw = val('a-pw'); S.auth.email = em; S.err = ''; S.auth.busy = true; render();
  (S.auth.mode === 'signup' ? B.signUpEmail(em, pw) : B.signInEmail(em, pw)).catch(x => { S.err = errText(x); }).finally(() => { S.auth.busy = false; render(); });
});
$app.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.f) S.form[t.dataset.f] = t.value;
  if (t.dataset.d && S.draft) S.draft[t.dataset.d] = t.value;
  if (t.id === 'chat-in') S.chatDraft = t.value;
  if (t.id === 'menu-new' && S.draft) S.draft.menuNew = t.value;
  if (t.id === 'store-q') { S.storeQ = t.value; if (!e.isComposing) render(); }
});
$app.addEventListener('compositionend', e => { if (e.target.id === 'store-q') { S.storeQ = e.target.value; render(); } });
$app.addEventListener('keydown', e => { if (e.target.id === 'chat-in' && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); sendMsg(e.target.value); } if (e.target.id === 'menu-new' && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); A.menuAdd(); } });
const _errText = errText;

/* ---------- 시작 ---------- */
let unsubs = [];
(async () => {
  try { B = await makeBackend(); } catch (e) { $app.innerHTML = `<div class="emptyst" style="height:100%">${I('warning-circle', 40, 'd')}<b>서버에 연결하지 못했어요</b><span>firebase-config.js 설정을 확인해 주세요.</span></div>`; console.error(e); return; }
  if (B.mode === 'local') document.body.classList.add('local');
  B.onAuth(u => {
    unsubs.forEach(f => f && f()); unsubs = []; S.authUser = u; S.me = null; S.ready = !u;
    if (u) {
      let gotProfile = false;
      unsubs.push(B.watchProfile(u.uid, p => { S.me = p; if (!gotProfile) { gotProfile = true; S.ready = true; } render(); }));
      unsubs.push(B.watchUsers(list => { S.users = Object.fromEntries(list.map(x => [x.id, x])); render(); }));
      unsubs.push(B.watchReviews(list => { S.allReviews = list; S.reviews = list.filter(r => !r.hidden); render(); }));
      unsubs.push(B.watchMeets(list => { S.allMeets = list.map(m => ({ members: [], checkedIn: [], ...m })); S.meets = S.allMeets.filter(m => m.status !== 'hidden'); S.meetsLoaded = true; render(); }));
      unsubs.push(B.watchNotice(n => { S.notice = n; render(); }));
      unsubs.push(B.watchBans(list => { S.bans = list; render(); }));
      if (ADMIN_EMAILS.includes(u.email) && u.verified) unsubs.push(B.watchReports(list => { S.reports = list; render(); }, e => console.warn('reports', e)));
      unsubs.push(B.watchRatings(list => { S.ratings = list; render(); }));
      unsubs.push(B.watchUsage(u.uid, n => { S.used = n; render(); }));
    } else { S.tab = 'home'; S.stack = [{ s: 'home' }]; }
    render(true);
  });
})();
export { _errText };
