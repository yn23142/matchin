// 데이터 저장소: Firebase(실서비스) 또는 이 브라우저 안의 체험 모드(localStorage)
import { firebaseConfig } from './firebase-config.js';

export const monthKey = (t = Date.now()) => { const d = new Date(t); return d.getUTCFullYear() * 100 + (d.getUTCMonth() + 1); };

async function firebaseBackend(cfg){
  const F = await import('./vendor/firebase.js');
  const app = F.initializeApp(cfg);
  const auth = F.getAuth(app);
  const db = F.getFirestore(app);
  await F.setPersistence(auth, F.browserLocalPersistence).catch(() => {});
  const toObj = s => ({ id: s.id, ...s.data() });
  const ts = v => (v && typeof v.toMillis === 'function') ? v.toMillis() : (v || Date.now());
  const norm = o => { if (o.createdAt !== undefined) o.createdAt = ts(o.createdAt); return o; };
  const watchCol = (path, cb, opts = {}) => {
    let q = F.collection(db, path);
    if (opts.order) q = F.query(q, F.orderBy(opts.order, opts.dir || 'asc'), F.limit(opts.limit || 500));
    return F.onSnapshot(q, s => cb(s.docs.map(d => norm(toObj(d)))), e => (opts.onError || console.warn)(e));
  };
  return {
    mode: 'firebase',
    onAuth: cb => F.onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, email: u.email || '', name: u.displayName || '', verified: !!u.emailVerified, provider: (u.providerData[0] || {}).providerId || '' } : null)),
    signInGoogle: async () => {
      const p = new F.GoogleAuthProvider();
      try { await F.signInWithPopup(auth, p); }
      catch (e) { if (String(e.code).includes('popup-blocked')) await F.signInWithRedirect(auth, p); else throw e; }
    },
    signUpEmail: async (e, pw) => { const c = await F.createUserWithEmailAndPassword(auth, e, pw); await F.sendEmailVerification(c.user).catch(() => {}); },
    resendVerify: () => F.sendEmailVerification(auth.currentUser),
    reloadUser: async () => { await auth.currentUser.reload(); return !!auth.currentUser.emailVerified; },
    signInEmail: (e, pw) => F.signInWithEmailAndPassword(auth, e, pw),
    resetPw: e => F.sendPasswordResetEmail(auth, e),
    logout: () => F.signOut(auth),
    watchProfile: (uid, cb) => F.onSnapshot(F.doc(db, 'users', uid), s => cb(s.exists() ? toObj(s) : null), () => cb(null)),
    watchUsers: cb => watchCol('users', cb),
    watchReviews: cb => watchCol('reviews', cb, { order: 'createdAt', dir: 'desc', limit: 1000 }),
    watchMeets: cb => watchCol('meets', cb, { order: 'startAt', dir: 'asc', limit: 300 }),
    watchRatings: cb => watchCol('ratings', cb),
    watchUsage: (uid, cb) => F.onSnapshot(F.doc(db, 'usage', `${uid}_${monthKey()}`), s => cb(s.exists() ? s.data().count : 0), () => cb(0)),
    watchMessages: (path, cb, onError) => watchCol(path, cb, { order: 'createdAt', dir: 'asc', limit: 200, onError }),
    saveProfile: (uid, data) => F.setDoc(F.doc(db, 'users', uid), { ...data, createdAt: F.serverTimestamp() }, { merge: true }),
    saveReview: r => F.setDoc(F.doc(db, 'reviews', `${r.st}_${r.uid}`), { ...r, createdAt: F.serverTimestamp() }),
    deleteReview: (st, uid) => F.deleteDoc(F.doc(db, 'reviews', `${st}_${uid}`)),
    createMeet: async (m, code) => {
      const ref = F.doc(F.collection(db, 'meets'));
      const b = F.writeBatch(db);
      b.set(ref, { ...m, createdAt: F.serverTimestamp() });
      b.set(F.doc(db, 'meets', ref.id, 'secret', 'code'), { code });
      await b.commit(); return ref.id;
    },
    joinMeet: async (meetId, uid, used) => {
      const b = F.writeBatch(db);
      b.update(F.doc(db, 'meets', meetId), { members: F.arrayUnion(uid) });
      b.set(F.doc(db, 'usage', `${uid}_${monthKey()}`), { uid, count: used + 1 });
      await b.commit();
    },
    leaveMeet: (meetId, uid) => F.updateDoc(F.doc(db, 'meets', meetId), { members: F.arrayRemove(uid) }),
    cancelMeet: meetId => F.updateDoc(F.doc(db, 'meets', meetId), { status: 'cancelled' }),
    getCode: async meetId => { const s = await F.getDoc(F.doc(db, 'meets', meetId, 'secret', 'code')); return s.exists() ? s.data().code : ''; },
    checkin: async (meetId, uid, code) => {
      const b = F.writeBatch(db);
      b.set(F.doc(db, 'meets', meetId, 'checkins', uid), { code, at: F.serverTimestamp() });
      b.update(F.doc(db, 'meets', meetId), { checkedIn: F.arrayUnion(uid) });
      await b.commit();
    },
    sendMessage: (path, msg) => F.addDoc(F.collection(db, path), { ...msg, createdAt: F.serverTimestamp() }),
    rate: (meet, rater, ratee, s) => F.setDoc(F.doc(db, 'ratings', `${meet}_${rater}_${ratee}`), { meet, rater, ratee, s, createdAt: F.serverTimestamp() }),
    report: r => F.addDoc(F.collection(db, 'reports'), { ...r, status: 'open', createdAt: F.serverTimestamp() }),
    // ---- 운영자 ----
    watchNotice: cb => F.onSnapshot(F.doc(db, 'notices', 'current'), s => cb(s.exists() ? s.data() : null), () => cb(null)),
    watchBans: cb => watchCol('bans', list => cb(list.map(b => ({ ...b, until: ts(b.until) })))),
    watchReports: (cb, onError) => watchCol('reports', cb, { order: 'createdAt', dir: 'desc', limit: 300, onError }),
    setReport: (id, status) => F.updateDoc(F.doc(db, 'reports', id), { status, handledAt: F.serverTimestamp() }),
    hideReview: (id, hidden, reason) => F.updateDoc(F.doc(db, 'reviews', id), { hidden, hiddenReason: reason || '' }),
    setMeetStatus: (id, status, reason) => F.updateDoc(F.doc(db, 'meets', id), { status, hiddenReason: reason || '' }),
    ban: (uid, days, reason, by) => F.setDoc(F.doc(db, 'bans', uid), { until: F.Timestamp.fromMillis(Date.now() + days * 864e5), reason, by, at: F.serverTimestamp() }),
    unban: uid => F.deleteDoc(F.doc(db, 'bans', uid)),
    setNotice: (text, by) => text ? F.setDoc(F.doc(db, 'notices', 'current'), { text, by, at: F.serverTimestamp() }) : F.deleteDoc(F.doc(db, 'notices', 'current')),
    // 회원 탈퇴: 내 후기·준 별점·이용 기록·프로필 삭제, 참여 모임 나가기(주최 모임은 취소), 로그인 계정 삭제
    deleteAccount: async uid => {
      const user = auth.currentUser;
      const del = async (col, field) => { const s = await F.getDocs(F.query(F.collection(db, col), F.where(field, '==', uid))); await Promise.all(s.docs.map(d => F.deleteDoc(d.ref))); };
      // 먼저 계정 재인증이 필요한지 확인(오래된 로그인 세션이면 삭제가 거부됨)
      if (user.metadata && Date.now() - Date.parse(user.metadata.lastSignInTime) > 4 * 60e3) {
        if ((user.providerData[0] || {}).providerId === 'google.com') await F.reauthenticateWithPopup(user, new F.GoogleAuthProvider());
        else { const e = new Error('requires-recent-login'); e.code = 'auth/requires-recent-login'; throw e; }
      }
      await del('reviews', 'uid'); await del('ratings', 'rater');
      const ms = await F.getDocs(F.query(F.collection(db, 'meets'), F.where('members', 'array-contains', uid)));
      for (const d of ms.docs) { const m = d.data(); if (m.host === uid) { if (m.status !== 'cancelled') await F.updateDoc(d.ref, { status: 'cancelled' }); } else await F.updateDoc(d.ref, { members: F.arrayRemove(uid) }); }
      const us = await F.getDocs(F.query(F.collection(db, 'usage'), F.where('uid', '==', uid)));
      await Promise.all(us.docs.map(d => F.deleteDoc(d.ref)));
      await F.deleteDoc(F.doc(db, 'users', uid));
      await F.deleteUser(user);
    }
  };
}

// ---------- 체험 모드: 이 브라우저에만 저장 ----------
function localBackend(){
  const KEY = 'matchin-site-local';
  let D; try { D = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  D = D || { auth: null, users: {}, reviews: {}, meets: {}, secret: {}, ratings: {}, usage: {}, msgs: {} };
  const subs = new Set();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} subs.forEach(f => f()); };
  const sub = f => { subs.add(f); setTimeout(f, 0); return () => subs.delete(f); };
  const list = o => Object.entries(o).map(([id, v]) => ({ id, ...v }));
  const id = () => Math.random().toString(36).slice(2, 10);
  const fail = m => { const e = new Error(m); e.code = m; throw e; };
  let authCb = null;
  return {
    mode: 'local',
    onAuth: cb => { authCb = cb; setTimeout(() => cb(D.auth), 0); return () => {}; },
    signInGoogle: async () => { D.auth = { uid: 'local-google', email: 'demo@local', name: '', verified: true, provider: 'google.com' }; save(); authCb && authCb(D.auth); },
    signUpEmail: async (e) => { D.auth = { uid: 'local-' + e.replace(/[^a-z0-9]/gi, '_'), email: e, name: '', verified: true, provider: 'password' }; save(); authCb && authCb(D.auth); },
    signInEmail: async (e) => { D.auth = { uid: 'local-' + e.replace(/[^a-z0-9]/gi, '_'), email: e, name: '', verified: true, provider: 'password' }; save(); authCb && authCb(D.auth); },
    resetPw: async () => {},
    logout: async () => { D.auth = null; save(); authCb && authCb(null); },
    watchProfile: (uid, cb) => sub(() => cb(D.users[uid] ? { id: uid, ...D.users[uid] } : null)),
    watchUsers: cb => sub(() => cb(list(D.users))),
    watchReviews: cb => sub(() => cb(list(D.reviews).sort((a, b) => b.createdAt - a.createdAt))),
    watchMeets: cb => sub(() => cb(list(D.meets).sort((a, b) => a.startAt - b.startAt))),
    watchRatings: cb => sub(() => cb(list(D.ratings))),
    watchUsage: (uid, cb) => sub(() => cb((D.usage[`${uid}_${monthKey()}`] || {}).count || 0)),
    watchMessages: (path, cb) => sub(() => cb((D.msgs[path] || []).slice())),
    saveProfile: async (uid, data) => { D.users[uid] = { ...(D.users[uid] || {}), ...data, createdAt: Date.now() }; save(); },
    saveReview: async r => { if (r.v === 'dine') { const m = D.meets[r.meet]; if (!m || !m.checkedIn.includes(r.uid) || m.store !== r.st) fail('permission-denied'); } D.reviews[`${r.st}_${r.uid}`] = { ...r, createdAt: Date.now() }; save(); },
    deleteReview: async (st, uid) => { delete D.reviews[`${st}_${uid}`]; save(); },
    createMeet: async (m, code) => { const k = id(); D.meets[k] = { ...m, createdAt: Date.now() }; D.secret[k] = code; save(); return k; },
    joinMeet: async (meetId, uid, used) => { const m = D.meets[meetId]; if (used >= 4 || m.members.length >= m.cap) fail('permission-denied'); if (!m.members.includes(uid)) m.members.push(uid); D.usage[`${uid}_${monthKey()}`] = { uid, count: used + 1 }; save(); },
    leaveMeet: async (meetId, uid) => { const m = D.meets[meetId]; m.members = m.members.filter(x => x !== uid); save(); },
    cancelMeet: async meetId => { D.meets[meetId].status = 'cancelled'; save(); },
    getCode: async meetId => D.secret[meetId] || '',
    checkin: async (meetId, uid, code) => { const m = D.meets[meetId]; if (code !== D.secret[meetId] || !m.members.includes(uid)) fail('permission-denied'); if (!m.checkedIn.includes(uid)) m.checkedIn.push(uid); save(); },
    sendMessage: async (path, msg) => { (D.msgs[path] ||= []).push({ id: id(), ...msg, createdAt: Date.now() }); save(); },
    rate: async (meet, rater, ratee, s) => { D.ratings[`${meet}_${rater}_${ratee}`] = { meet, rater, ratee, s, createdAt: Date.now() }; save(); },
    report: async r => { (D.reports ||= {})[id()] = { ...r, status: 'open', createdAt: Date.now() }; save(); },
    watchNotice: cb => sub(() => cb(D.notice || null)),
    watchBans: cb => sub(() => cb(list(D.bans || {}))),
    watchReports: cb => sub(() => cb(list(D.reports || {}).sort((a, b) => b.createdAt - a.createdAt))),
    setReport: async (rid, status) => { D.reports[rid].status = status; save(); },
    hideReview: async (rid, hidden, reason) => { Object.assign(D.reviews[rid], { hidden, hiddenReason: reason || '' }); save(); },
    setMeetStatus: async (mid, status, reason) => { Object.assign(D.meets[mid], { status, hiddenReason: reason || '' }); save(); },
    ban: async (uid, days, reason, by) => { (D.bans ||= {})[uid] = { until: Date.now() + days * 864e5, reason, by, at: Date.now() }; save(); },
    unban: async uid => { delete D.bans[uid]; save(); },
    setNotice: async (text, by) => { D.notice = text ? { text, by, at: Date.now() } : null; save(); },
    resendVerify: async () => {}, reloadUser: async () => true,
    deleteAccount: async uid => {
      Object.keys(D.reviews).forEach(k => { if (D.reviews[k].uid === uid) delete D.reviews[k]; });
      Object.keys(D.ratings).forEach(k => { if (D.ratings[k].rater === uid) delete D.ratings[k]; });
      Object.values(D.meets).forEach(m => { if (m.host === uid) m.status = 'cancelled'; else m.members = m.members.filter(x => x !== uid); });
      Object.keys(D.usage).forEach(k => { if (k.startsWith(uid + '_')) delete D.usage[k]; });
      delete D.users[uid]; D.auth = null; save(); authCb && authCb(null);
    }
  };
}

export async function makeBackend(){
  const forceLocal = new URLSearchParams(location.search).has('local');
  if (firebaseConfig && firebaseConfig.apiKey && !forceLocal) return firebaseBackend(firebaseConfig);
  return localBackend();
}
