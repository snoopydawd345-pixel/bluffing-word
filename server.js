const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const STATIC_ROOT = fs.existsSync(path.join(DIST, 'index.html')) ? DIST : ROOT;
const rooms = new Map();
const words = [
  { word: 'Petrichor', answer: 'The earthy smell after rain falls on dry ground.', clue: 'A scent you might notice outdoors after a summer storm.' },
  { word: 'Tittle', answer: 'A tiny dot or stroke in writing, such as the dot above an i.', clue: 'A very small part of a written letter.' },
  { word: 'Defenestration', answer: 'The act of throwing someone or something out of a window.', clue: 'A dramatic word for an even more dramatic exit.' },
  { word: 'Apricity', answer: 'The warmth of the sun in winter.', clue: 'A cozy feeling on a cold day.' },
  { word: 'Petrifaction', answer: 'The process of turning something into stone, or becoming motionless with fear.', clue: 'Something that can happen in a museum or during a jump scare.' },
  { word: 'Mumpsimus', answer: 'A person who stubbornly sticks to an incorrect idea or expression.', clue: 'A word for someone who refuses to admit a mistake.' },
  { word: 'Borborygmus', answer: 'A rumbling or gurgling noise made by the stomach or intestines.', clue: 'A sound your body might make at the quietest possible moment.' },
  { word: 'Callipygian', answer: 'Having well-shaped or attractive buttocks.', clue: 'An unexpectedly specific compliment about someone’s shape.' },
  { word: 'Ultracrepidarian', answer: 'A person who gives opinions on matters beyond their knowledge.', clue: 'Someone who always has an opinion, even when they are out of their depth.' },
  { word: 'Quire', answer: 'A set of 24 or 25 sheets of paper; also a group of singers.', clue: 'A word that can describe paper or people singing together.' },
  { word: 'Boustrophedon', answer: 'A style of writing in which alternate lines run in opposite directions.', clue: 'An unusual way to arrange lines of writing.' },
  { word: 'Nudiustertian', answer: 'Of or relating to the day before yesterday.', clue: 'A needlessly fancy word for a recent day.' },
  { word: 'Sonder', answer: 'The realization that each passerby has a life as complex as your own.', clue: 'A feeling you might get while watching strangers in a busy place.' },
  { word: 'Pangram', answer: 'A sentence that uses every letter of the alphabet at least once.', clue: 'A sentence with an alphabet-sized ambition.' },
  { word: 'Fard', answer: 'To apply makeup to the face.', clue: 'An old-fashioned word for getting ready.' },
  { word: 'Aglet', answer: 'The small plastic or metal tube at the end of a shoelace.', clue: 'A tiny everyday object with a surprisingly obscure name.' }
];
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const clean = (s, max = 60) => String(s || '').trim().replace(/[<>]/g, '').slice(0, max);
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise((resolve, reject) => { let body = ''; req.on('data', c => { body += c; if (body.length > 20_000) reject(new Error('Request too large')); }); req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); } }); req.on('error', reject); });
function makeCode() { let code; do { code = Array.from({ length: 5 }, () => alphabet[crypto.randomInt(alphabet.length)]).join(''); } while (rooms.has(code)); return code; }
function player(room, id) { return room.players.find(p => p.id === id); }
function isConnected(p) { return Date.now() - (p.lastSeen || 0) < 12000; }
function pack(room, id) {
  const me = player(room, id);
  if (!me) return null;
  const word = room.rounds[room.roundIndex];
  const isReader = room.readerId === id;
  const opts = room.phase === 'vote' || room.phase === 'reveal' || room.phase === 'finished' ? room.options : [];
  return {
    code: room.code, players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, connected: isConnected(p) })),
    meId: id, hostId: room.hostId, host: room.hostId === id, phase: room.phase, round: room.roundIndex + 1,
    totalRounds: room.totalRounds, reader: player(room, room.readerId)?.name || '', isReader,
    word: isReader && ['clue', 'submit', 'vote'].includes(room.phase) ? word.word : null,
    trueAnswer: isReader && ['clue', 'submit'].includes(room.phase) ? word.answer : null,
    clue: isReader && ['clue', 'submit'].includes(room.phase) ? word.clue : (['submit', 'vote'].includes(room.phase) ? word.clue : null),
    answer: ['reveal', 'finished'].includes(room.phase) ? word.answer : null,
    submissions: room.players.filter(p => p.id !== room.readerId && isConnected(p) && p.submission).length,
    submitCount: room.players.filter(p => p.id !== room.readerId && isConnected(p)).length,
    voted: Boolean(me.voted), submitted: Boolean(me.submission), options: opts.map(o => ({ id: o.id, text: o.text, own: o.authorId === id })),
    results: ['reveal', 'finished'].includes(room.phase) ? room.options.map(o => ({ text: o.text, real: o.real, author: o.real ? null : player(room, o.authorId)?.name, votes: o.voters.map(v => player(room, v)?.name).filter(Boolean), own: o.authorId === id })) : [],
    roundScores: room.roundScores, winners: room.winners, lastRound: room.phase === 'finished'
  };
}
function beginRound(room) {
  room.roundIndex++;
  if (room.roundIndex >= room.totalRounds) {
    room.phase = 'finished'; const high = Math.max(...room.players.map(p => p.score)); room.winners = room.players.filter(p => p.score === high).map(p => p.name); return;
  }
  room.readerId = room.players[room.roundIndex % room.players.length].id;
  room.players.forEach(p => { p.submission = ''; p.voted = false; });
  room.options = []; room.roundScores = null;
  room.phase = 'submit';
}
function reveal(room) {
  const word = room.rounds[room.roundIndex];
  room.options.push({ id: 'real', text: word.answer, real: true, authorId: null, voters: [] });
  for (const p of room.players) if (p.id !== room.readerId && p.submission) room.options.push({ id: p.id, text: p.submission, real: false, authorId: p.id, voters: [] });
  for (let i = room.options.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [room.options[i], room.options[j]] = [room.options[j], room.options[i]]; }
  room.phase = 'vote';
}
async function handle(req, res) {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); return res.end(); }
  if (req.method === 'GET' && u.pathname === '/api/health') return json(res, 200, { ok: true });
  if (req.method === 'POST' && u.pathname === '/api/create') {
    const b = await readBody(req), name = clean(b.name);
    if (!name) return json(res, 400, { error: 'Enter your name first.' });
    const id = crypto.randomUUID(), code = makeCode();
    const room = { code, hostId: id, players: [{ id, name, score: 0, lastSeen: Date.now(), submission: '', voted: false }], phase: 'lobby', totalRounds: Math.max(2, Math.min(12, Number(b.rounds) || 3)), roundIndex: -1, rounds: [...words].sort(() => Math.random() - .5), readerId: null, options: [], roundScores: null, winners: [] };
    rooms.set(code, room); return json(res, 201, { playerId: id, state: pack(room, id) });
  }
  if (req.method === 'POST' && u.pathname === '/api/join') {
    const b = await readBody(req), code = clean(b.code, 5).toUpperCase(), name = clean(b.name), room = rooms.get(code);
    if (!room) return json(res, 404, { error: 'We couldn’t find that room. Check the code and try again.' });
    if (!name) return json(res, 400, { error: 'Enter your name first.' });
    if (room.phase !== 'lobby') return json(res, 409, { error: 'This game has already started.' });
    if (room.players.length >= 12) return json(res, 409, { error: 'This room is full (12 players maximum).' });
    if (room.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return json(res, 409, { error: 'That name is already in this room. Choose another.' });
    const id = crypto.randomUUID(); room.players.push({ id, name, score: 0, lastSeen: Date.now(), submission: '', voted: false });
    return json(res, 201, { playerId: id, state: pack(room, id) });
  }
  const m = u.pathname.match(/^\/api\/room\/([A-Z0-9]+)(?:\/(start|submit|vote|next|continue))?$/i);
  if (m) {
    const room = rooms.get(m[1].toUpperCase());
    if (!room) return json(res, 404, { error: 'Room not found. It may have expired.' });
    if (req.method === 'GET') { const id = u.searchParams.get('playerId'); const current = player(room, id); if (current) current.lastSeen = Date.now(); const state = pack(room, id); if (!state) return json(res, 403, { error: 'Player not in this room.' }); return json(res, 200, { state }); }
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
    const b = await readBody(req), id = String(b.playerId || ''), me = player(room, id);
    if (me) me.lastSeen = Date.now();
    if (!me) return json(res, 403, { error: 'Player not in this room.' });
    const action = m[2];
    if (action === 'start') {
      if (id !== room.hostId) return json(res, 403, { error: 'Only the host can start the game.' });
      if (room.players.length < 3) return json(res, 409, { error: 'You need at least three players to start.' });
      room.totalRounds = Math.max(2, Math.min(12, Number(b.rounds) || 3));
      room.roundIndex = -1; room.players.forEach(p => p.score = 0); beginRound(room); return json(res, 200, { state: pack(room, id) });
    }
    if (action === 'submit') {
      if (room.phase !== 'submit' || id === room.readerId) return json(res, 409, { error: 'You can’t submit at this stage.' });
      const text = clean(b.text, 160); if (text.length < 3) return json(res, 400, { error: 'Write a definition with at least 3 characters.' });
      if (me.submission) return json(res, 409, { error: 'Your fake answer is already locked in.' });
      me.submission = text;
      if (room.players.filter(p => p.id !== room.readerId && isConnected(p)).every(p => p.submission)) reveal(room);
      return json(res, 200, { state: pack(room, id) });
    }
    if (action === 'vote') {
      if (room.phase !== 'vote' || id === room.readerId) return json(res, 409, { error: 'You can’t vote at this stage.' });
      if (me.voted) return json(res, 409, { error: 'Your vote is already locked in.' });
      const option = room.options.find(o => o.id === b.optionId); if (!option) return json(res, 400, { error: 'Choose one of the answers shown.' });
      option.voters.push(id); me.voted = true;
      const eligible = room.players.filter(p => p.id !== room.readerId && isConnected(p));
      if (eligible.every(p => p.voted)) {
        const real = room.options.find(o => o.real), points = Object.fromEntries(room.players.map(p => [p.id, 0]));
        for (const voterId of real.voters) if (voterId !== room.readerId) points[voterId] += 1000;
        for (const o of room.options) if (!o.real) for (const voterId of o.voters) if (voterId !== o.authorId) points[o.authorId] += 500;
        points[room.readerId] += real.voters.length * 500;
        room.players.forEach(p => p.score += points[p.id]); room.roundScores = Object.fromEntries(room.players.map(p => [p.name, points[p.id]])); room.phase = 'reveal';
      }
      return json(res, 200, { state: pack(room, id) });
    }
    if (action === 'continue') {
      if (id !== room.hostId) return json(res, 403, { error: 'Only the host can continue.' });
      const offline = room.players.filter(p => !isConnected(p));
      if (!offline.length || !['submit', 'vote'].includes(room.phase)) return json(res, 409, { error: 'There are no offline players to skip right now.' });
      if (room.phase === 'submit' && offline.some(p => p.id === room.readerId)) {
        const nextReader = room.players.find(p => p.id !== room.readerId && isConnected(p));
        if (!nextReader) return json(res, 409, { error: 'There is no connected player available to read this round.' });
        room.readerId = nextReader.id; nextReader.submission = '';
      }
      if (room.phase === 'submit' && room.players.filter(p => p.id !== room.readerId && isConnected(p)).every(p => p.submission)) reveal(room);
      if (room.phase === 'vote' && room.players.filter(p => p.id !== room.readerId && isConnected(p)).every(p => p.voted)) {
        const real = room.options.find(o => o.real), points = Object.fromEntries(room.players.map(p => [p.id, 0]));
        for (const voterId of real.voters) if (voterId !== room.readerId) points[voterId] += 1000;
        for (const o of room.options) if (!o.real) for (const voterId of o.voters) if (voterId !== o.authorId) points[o.authorId] += 500;
        points[room.readerId] += real.voters.length * 500;
        room.players.forEach(p => p.score += points[p.id]); room.roundScores = Object.fromEntries(room.players.map(p => [p.name, points[p.id]])); room.phase = 'reveal';
      }
      return json(res, 200, { state: pack(room, id) });
    }
    if (action === 'next') {
      if (room.phase !== 'reveal') return json(res, 409, { error: 'The round isn’t ready to advance.' });
      if (id !== room.hostId) return json(res, 403, { error: 'Only the host can continue.' });
      beginRound(room); return json(res, 200, { state: pack(room, id) });
    }
    return json(res, 404, { error: 'Action not found.' });
  }
  if (req.method === 'GET') {
    const filePath = u.pathname === '/' ? path.join(STATIC_ROOT, 'index.html') : path.join(STATIC_ROOT, path.normalize(decodeURIComponent(u.pathname)).replace(/^([/\\])+/, ''));
    if (!filePath.startsWith(STATIC_ROOT)) return json(res, 403, { error: 'Forbidden' });
    fs.readFile(filePath, (err, data) => { if (err) return json(res, 404, { error: 'Not found' }); const ext = path.extname(filePath); res.writeHead(200, { 'Content-Type': ({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'}[ext] || 'application/octet-stream'), 'Cache-Control': 'no-cache' }); res.end(data); }); return;
  }
  json(res, 404, { error: 'Not found' });
}
http.createServer((req, res) => handle(req, res).catch(e => { console.error(e); json(res, 500, { error: 'Something went wrong. Please try again.' }); })).listen(PORT, '0.0.0.0', () => console.log(`Word Bluff is ready on port ${PORT}`));



