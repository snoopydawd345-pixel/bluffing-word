import React, { useEffect, useRef, useState } from 'react';

const SESSION_KEY = 'wordbluff-session';
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const readSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
};
const escName = name => String(name || '').slice(0, 1).toUpperCase();
const points = value => Number(value || 0).toLocaleString();

async function request(url, body) {
  const response = await fetch(`${API_BASE}${url}`, body ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  } : {});
  let result;
  try { result = await response.json(); }
  catch { throw new Error('The game server did not respond.'); }
  if (!response.ok) throw new Error(result.error || 'Something went wrong.');
  return result;
}

function Brand() {
  return <a className="brand" href="/" aria-label="Word Bluff home"><span className="brand-icon">W</span><span>word<span className="brand-accent">bluff</span></span></a>;
}

function Header() {
  return <header className="topbar"><Brand /><div className="top-meta"><span className="live-dot" /> LIVE PARTY GAME</div></header>;
}

function Footer() {
  return <footer className="footer"><span>WORD BLUFF</span><span>MAKE IT UP. MAKE IT CONVINCING.</span></footer>;
}

function Home({ onCreate, onJoin, initialName = '', initialCode = '', pending }) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState(initialCode);
  return <section className="home-grid">
    <div className="hero">
      <div className="eyebrow"><span className="spark">✦</span> THE GAME OF CONVINCING NONSENSE</div>
      <h1>Can you spot<br />the <span>real</span> one?</h1>
      <p className="hero-copy">Make up a definition. Sell the lie. Catch your friends bluffing.</p>
      <div className="how-row"><div className="how-icon">✍</div><div><b>Write a convincing fake</b><small>Make the made-up sound meaningful.</small></div><span className="how-number">01</span></div>
      <div className="how-row"><div className="how-icon">◉</div><div><b>Pick what you believe</b><small>One answer is real. The others? Maybe.</small></div><span className="how-number">02</span></div>
      <div className="how-row"><div className="how-icon">♛</div><div><b>Outwit your friends</b><small>Guess right or get them to believe you.</small></div><span className="how-number">03</span></div>
      <div className="hero-foot"><span>✦</span> No accounts. No downloads. Just good bluffs.</div>
    </div>
    <div className="join-card">
      <div className="card-orbit orbit-a" /><div className="card-orbit orbit-b" />
      <div className="card-content">
        <div className="card-kicker">READY WHEN YOU ARE</div><h2>Get in the game</h2>
        <p>Create a room for your crew, or join with a code.</p>
        <form onSubmit={event => { event.preventDefault(); onCreate(name); }}>
          <label className="label" htmlFor="player-name">YOUR NAME</label>
          <input id="player-name" className="text-input" maxLength={24} placeholder="What should we call you?" autoComplete="nickname" value={name} onChange={event => setName(event.target.value)} />
          <button className="btn btn-primary full" disabled={pending}><span>✦</span> Create a room <span className="arrow">→</span></button>
        </form>
        <div className="divider"><span /> OR JOIN A ROOM <span /></div>
        <form className="join-row" onSubmit={event => { event.preventDefault(); onJoin(name, code); }}>
          <input className="text-input code-input" maxLength={5} placeholder="ROOM CODE" aria-label="Room code" autoComplete="off" value={code} onChange={event => setCode(event.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())} />
          <button className="btn btn-light" disabled={pending}>Join <span>→</span></button>
        </form>
        <div className="fine-print"><span className="shield">⬡</span> Up to 12 players · At least 3 to play · Free to join</div>
      </div>
    </div>
  </section>;
}

function GameHeader({ state, onCopy }) {
  return <div className="game-top">
    <div className="room-badge"><div><small>ROOM CODE</small><strong>{state.code}</strong></div><button className="copy-btn" onClick={onCopy}>Copy</button></div>
    <div className="round-badge"><div><small>{state.phase === 'lobby' ? 'ROOM STATUS' : 'ROUND'}</small><strong>{state.phase === 'lobby' ? `${state.players.length} players` : `${Math.min(state.round, state.totalRounds)} / ${state.totalRounds}`}</strong></div></div>
  </div>;
}

function PlayerList({ state }) {
  return <div className="player-grid">{state.players.map(player => <div className="player-chip" key={player.id}>
    <div className="avatar">{escName(player.name)}</div>
    <div><b>{player.name}</b><small>{points(player.score)} pts · {player.connected ? 'online' : 'reconnecting'}</small></div>
    {player.name === state.reader && <span className="reader-tag">READER</span>}
  </div>)}</div>;
}

function OfflineAction({ state, onContinue }) {
  const count = state.players.filter(player => !player.connected).length;
  if (!state.host || !count || !['submit', 'vote'].includes(state.phase)) return null;
  return <><div className="notice" style={{ marginTop: 16 }}>{count} player{count === 1 ? ' is' : 's are'} offline. If they’ve left, you can move on without waiting.</div><button className="btn btn-dark" style={{ marginTop: 10 }} onClick={onContinue}>Continue without offline player{count === 1 ? '' : 's'} →</button></>;
}

function Lobby({ state, onStart, onCopy }) {
  const [roundChoice, setRoundChoice] = useState('all');
  const enough = state.players.length >= 3;
  return <div className="panel">
    <div className="phase-label">ROOM LOBBY</div>
    <h2 className="panel-title">Your crew is {enough ? 'all set.' : 'on the way.'}</h2>
    <p className="panel-copy">{state.host ? 'Share your code. Once three or more players are here, you can start.' : 'You’re in! Hang tight while the host gets everyone together.'}</p>
    <div className="code-large"><span>YOUR ROOM CODE</span><strong>{state.code}</strong><button className="copy-btn" onClick={onCopy}>Copy</button></div>
    <PlayerList state={state} />
    <div className={`notice ${enough ? 'lime' : ''}`}>{enough ? '✓ Ready to play — Reader rotates each round, so everyone gets a turn.' : `Waiting for ${3 - state.players.length} more player${3 - state.players.length === 1 ? '' : 's'}. You need at least 3 to play.`}</div>
    <div className="bottom-row">
      {state.host ? <><label className="muted round-select-label">ROUNDS <select className="round-select" value={roundChoice} onChange={event => setRoundChoice(event.target.value)}><option value="all">Everyone reads ({state.players.length})</option><option value="3">3 rounds</option><option value="5">5 rounds</option></select></label><button className="btn btn-primary" disabled={!enough} onClick={() => onStart(roundChoice === 'all' ? state.players.length : Number(roundChoice))}>Start the game <span>→</span></button></> : <span className="status-line"><span className="live-dot" /> Waiting for {state.players.find(player => player.id === state.hostId)?.name || 'the host'} to start…</span>}
    </div>
  </div>;
}

function ReaderView({ state, onContinue }) {
  return <div className="panel">
    <div className="phase-label">YOUR READER ROUND</div><h2 className="panel-title">Give them a clue.</h2>
    <p className="panel-copy">Read your clue aloud. Keep the word and definition to yourself so everyone can bluff.</p>
    <div className="word-card"><div className="mini-label">SECRET WORD · ONLY YOU CAN SEE THIS</div><h3>{state.word}</h3><p>{state.trueAnswer}</p></div>
    <div className="prompt-card"><b>YOUR CLUE — READ ALOUD</b><p>{state.clue}</p></div>
    <div className="notice purple">Everyone is writing a fake definition right now. This page will move on automatically when all {state.submitCount} connected players have submitted.</div>
    <div className="status-line"><span className="live-dot" /> {state.submissions} of {state.submitCount} answers in</div>
    <OfflineAction state={state} onContinue={onContinue} />
  </div>;
}

function SubmitView({ state, onSubmit, onContinue }) {
  const [text, setText] = useState('');
  return <div className="panel">
    <div className="phase-label">ROUND {state.round} · MAKE UP A DEFINITION</div><h2 className="panel-title">Make the fake feel real.</h2>
    <p className="panel-copy">The Reader’s clue is below. Write a believable definition for the mystery word. Could be real. Could be nonsense.</p>
    <div className="prompt-card"><b>THE READER’S CLUE</b><p>{state.clue}</p></div>
    {state.submitted ? <><div className="notice lime">✓ Your bluff is locked in. Sit tight while the others finish.</div><div className="status-line"><span className="live-dot" /> {state.submissions} of {state.submitCount} answers in</div><OfflineAction state={state} onContinue={onContinue} /></> : <>
      <form className="form-stack" onSubmit={event => { event.preventDefault(); onSubmit(text); }}>
        <textarea maxLength={160} placeholder="Write your convincing definition…" aria-label="Your fake definition" value={text} onChange={event => setText(event.target.value)} />
        <button className="btn btn-primary submit-btn" disabled={text.trim().length < 3}>Lock it in <span>→</span></button>
      </form>
      <div className="status-line">Make it sound plausible — the group will vote on it.</div><OfflineAction state={state} onContinue={onContinue} />
    </>}
  </div>;
}

function VoteView({ state, onVote, onContinue }) {
  const [selected, setSelected] = useState(null);
  if (state.isReader) return <div className="panel">
    <div className="phase-label">ROUND {state.round} · VOTING</div><h2 className="panel-title">The bluffs are in.</h2>
    <p className="panel-copy">The other players are choosing what they think is the real definition. You’ll reveal the answer once everyone has voted.</p>
    <div className="prompt-card"><b>THE WORD</b><p>{state.word || 'Your secret word'}</p></div>
    <div className="notice purple">{state.players.filter(player => player.id !== state.meId && player.connected).length} players are voting. Your screen will update when the round is ready to reveal.</div>
    <OfflineAction state={state} onContinue={onContinue} />
  </div>;
  const options = state.options || [];
  return <div className="panel">
    <div className="phase-label">ROUND {state.round} · PICK THE REAL DEFINITION</div><h2 className="panel-title">Which one’s the truth?</h2>
    <p className="panel-copy">Choose the definition you think is real. You can vote for your own bluff, but it won’t earn you bluff points.</p>
    <div className="prompt-card"><b>THE CLUE</b><p>{state.clue || ''}</p></div>
    {state.voted ? <><div className="notice lime">✓ Vote locked in. Waiting for everyone else to pick…</div><div className="status-line"><span className="live-dot" /> Waiting for the other players…</div><OfflineAction state={state} onContinue={onContinue} /></> : <>
      <div className="answer-list">{options.map((option, index) => <button type="button" key={option.id} className={`answer-option ${selected === option.id ? 'selected' : ''}`} onClick={() => setSelected(option.id)}><span className="answer-letter">{String.fromCharCode(65 + index)}</span><span>{option.text}{option.own && <small>YOUR BLUFF · YOU CAN VOTE FOR IT</small>}</span></button>)}</div>
      <div className="bottom-row"><span className="muted">Your vote stays secret until the reveal.</span><button className="btn btn-primary" disabled={!selected} onClick={() => onVote(selected)}>Lock my vote <span>→</span></button></div>
      <OfflineAction state={state} onContinue={onContinue} />
    </>}
  </div>;
}

function Results({ state, onNext, onHome }) {
  const final = state.phase === 'finished';
  const results = [...(state.results || [])].sort((a, b) => Number(b.real) - Number(a.real));
  const scoreCards = Object.entries(state.roundScores || {}).map(([name, score]) => <div className="score-card" key={name}><b>{name}</b><strong>+{points(score)}</strong><small>points this round</small></div>);
  const winners = state.winners || [];
  return <div className="panel">
    <div className="phase-label">{final ? 'GAME COMPLETE' : `ROUND ${state.round} · REVEAL`}</div>
    {final ? <><div className="trophy">✦</div><h2 className="panel-title">{winners.join(winners.length > 2 ? ', ' : ' and ')} {winners.length > 1 ? 'share' : 'takes'} the win!</h2><p className="panel-copy">That’s the final score. Nicely played, bluffers.</p></> : <><h2 className="panel-title">The truth comes out.</h2><p className="panel-copy">Here’s what was real, who got fooled, and the points from this round.</p></>}
    <div className="result-list">{results.map(result => <div className={`result-row ${result.real ? 'real' : ''}`} key={`${result.real ? 'real' : result.author}-${result.text}`}><div className="answer-text">{result.text}</div><div className="result-meta">{result.real ? '✓ REAL DEFINITION' : `Bluff by ${result.author || 'a player'}`} · {result.votes.length} vote{result.votes.length === 1 ? '' : 's'}{result.votes.length ? ` — ${result.votes.join(', ')}` : ''}{result.own && ' · YOUR BLUFF'}</div></div>)}</div>
    <h3 className="panel-title" style={{ fontSize: 16, marginTop: 25 }}>Round points</h3><div className="score-grid">{scoreCards}</div>
    <h3 className="panel-title" style={{ fontSize: 16, marginTop: 21 }}>Leaderboard</h3>
    <PlayerList state={{ ...state, players: [...state.players].sort((a, b) => b.score - a.score) }} />
    {!final ? <div className="bottom-row"><span className="muted">{state.host ? 'Ready for the next word?' : 'The host will start the next round.'}</span>{state.host ? <button className="btn btn-primary" onClick={onNext}>{state.round >= state.totalRounds ? 'See final results' : 'Next round'} <span>→</span></button> : <span className="status-line"><span className="live-dot" /> Waiting for the host…</span>}</div> : <><div className="notice lime">Thanks for playing Word Bluff! Make a new room to play again.</div><div className="bottom-row"><span className="muted">Final ranking is based on total points.</span><button className="btn btn-dark" onClick={onHome}>Back to the lobby</button></div></>}
  </div>;
}

export default function App() {
  const [context, setContext] = useState(() => readSession());
  const [state, setState] = useState(null);
  const [playerName, setPlayerName] = useState(() => readSession()?.name || '');
  const [roomCode, setRoomCode] = useState(() => readSession()?.code || '');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(Boolean(readSession()));
  const stateRef = useRef(null);
  const toastTimer = useRef(null);

  const notify = message => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  useEffect(() => {
    if (!context?.code || !context?.playerId) { setBooting(false); return undefined; }
    let active = true;
    async function poll() {
      try {
        const result = await request(`/api/room/${context.code}?playerId=${encodeURIComponent(context.playerId)}`);
        if (!active) return;
        if (stateRef.current?.phase && stateRef.current.phase !== result.state.phase) setState(null);
        const changed = JSON.stringify(stateRef.current) !== JSON.stringify(result.state);
        if (changed) { stateRef.current = result.state; setState(result.state); }
        setBooting(false);
      } catch {
        if (!active) return;
        localStorage.removeItem(SESSION_KEY);
        setContext(null); setState(null); stateRef.current = null; setBooting(false);
      }
    }
    poll();
    const interval = setInterval(poll, 850);
    return () => { active = false; clearInterval(interval); };
  }, [context?.code, context?.playerId]);

  async function enter(result, name) {
    const next = { code: result.state.code, playerId: result.playerId, name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setContext(next); stateRef.current = result.state; setState(result.state);
    setPlayerName(name); setRoomCode(result.state.code); setBooting(false);
  }

  async function createRoom(name) {
    if (!name.trim()) return notify('Add your name to create a room.');
    setBusy(true);
    try { await enter(await request('/api/create', { name: name.trim(), rounds: 3 }), name.trim()); }
    catch (error) { notify(error.message); }
    finally { setBusy(false); }
  }

  async function joinRoom(name, code) {
    if (!name.trim()) return notify('Add your name before joining.');
    if (code.trim().length !== 5) return notify('Enter the 5-character room code.');
    setBusy(true);
    try { await enter(await request('/api/join', { name: name.trim(), code: code.trim().toUpperCase() }), name.trim()); }
    catch (error) { notify(error.message); }
    finally { setBusy(false); }
  }

  async function act(action, payload = {}) {
    if (!context || busy) return;
    setBusy(true);
    try {
      const result = await request(`/api/room/${context.code}/${action}`, { playerId: context.playerId, ...payload });
      stateRef.current = result.state; setState(result.state);
    } catch (error) { notify(error.message); }
    finally { setBusy(false); }
  }

  async function copyRoomCode() {
    const code = state?.code || context?.code;
    if (!code) return;
    try { await navigator.clipboard.writeText(code); notify('Room code copied.'); }
    catch { notify(`Room code: ${code}`); }
  }

  function goHome() {
    localStorage.removeItem(SESSION_KEY); setContext(null); setState(null); stateRef.current = null; setBooting(false);
    setRoomCode('');
  }

  let content;
  if (booting) content = <div className="loading">Rejoining your game…</div>;
  else if (!state) content = <Home onCreate={createRoom} onJoin={joinRoom} initialName={playerName} initialCode={roomCode} pending={busy} />;
  else {
    const view = state.phase === 'lobby' ? <Lobby state={state} onStart={rounds => act('start', { rounds })} onCopy={copyRoomCode} />
      : state.phase === 'submit' ? (state.isReader ? <ReaderView state={state} onContinue={() => act('continue')} /> : <SubmitView key={`${state.code}-${state.round}`} state={state} onSubmit={text => { if (!text.trim()) return notify('Write your fake definition first.'); act('submit', { text: text.trim() }); }} onContinue={() => act('continue')} />)
      : state.phase === 'vote' ? <VoteView key={`${state.code}-${state.round}`} state={state} onVote={optionId => act('vote', { optionId })} onContinue={() => act('continue')} />
      : <Results state={state} onNext={() => act('next')} onHome={goHome} />;
    content = <div className="game-view"><GameHeader state={state} onCopy={copyRoomCode} />{view}</div>;
  }

  return <><div className="ambient ambient-one" /><div className="ambient ambient-two" /><Header /><main className="shell" id="app">{content}{toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}</main><Footer /></>;
}

