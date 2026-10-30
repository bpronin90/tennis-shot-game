// A small, deterministic tennis simulation. The renderer never decides outcomes.
// Distances are court coordinates; time is seconds. Every public update returns
// a fresh state so React can render safely without changing the previous frame.
export const DIFFICULTIES = {
  rookie: {
    name: "Rookie",
    speed: 32,
    reaction: 0.16,
    reach: 4.2,
    error: 0.075,
  },
  club: {
    name: "Club Player",
    speed: 40,
    reaction: 0.11,
    reach: 4.5,
    error: 0.037,
  },
  pro: { name: "Pro", speed: 48, reaction: 0.065, reach: 4.8, error: 0.013 },
};

export const SHOTS = {
  normal: {
    name: "Normal",
    duration: 1.22,
    risk: 0.012,
    description: "Reliable & balanced",
  },
  power: {
    name: "Power",
    duration: 0.88,
    risk: 0.075,
    description: "Fast, with more risk",
  },
  slice: {
    name: "Slice",
    duration: 1.42,
    risk: 0.023,
    description: "Low, slow & sneaky",
  },
};

export const CHALLENGES = [
  {
    id: 0,
    title: "Go deep",
    description: "Land 3 shots near the far baseline.",
    goal: 3,
    stat: "deep",
    hint: "Aim in the back strip of their court, close to the baseline.",
  },
  {
    id: 1,
    title: "Find your angle",
    description: "Pull your opponent toward a sideline.",
    goal: 1,
    stat: "wide",
    hint: "Aim wide, but leave a little space inside the line.",
  },
  {
    id: 2,
    title: "Find the open court",
    description: "Land a shot on the empty side.",
    goal: 1,
    stat: "open",
    hint: "Pull them to one side, then aim to the other.",
  },
  {
    id: 3,
    title: "Change it up",
    description: "Win a point by changing direction.",
    goal: 1,
    stat: "changes",
    hint: "Hit to one side, then win by hitting to the other.",
  },
  {
    id: 4,
    title: "Rookie rally",
    description: "Win 3 points against the Rookie.",
    goal: 3,
    stat: "wins",
    hint: "Move them around. A wide shot can open up the next one.",
  },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.25);
const copy = (s) => ({
  ...s,
  player: { ...s.player },
  opponent: { ...s.opponent },
  ball: { ...s.ball },
  score: [...s.score],
  stats: { ...s.stats },
  playerShots: [...s.playerShots],
  flight: s.flight
    ? { ...s.flight, from: { ...s.flight.from }, to: { ...s.flight.to } }
    : null,
});

// Mulberry32: randomness is reproducible from a seed and contained in game state.
function random(s) {
  s.rng = (s.rng + 0x6d2b79f5) >>> 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function serverForPoint(pointNumber) {
  return pointNumber === 0 || Math.floor((pointNumber - 1) / 2) % 2 === 1
    ? "player"
    : "opponent";
}

function move(position, target, speed, dt) {
  const d = distance(position, target);
  const fraction = d ? Math.min(1, (speed * dt) / d) : 1;
  position.x += (target.x - position.x) * fraction;
  position.y += (target.y - position.y) * fraction;
}

function event(s, type, extra = {}) {
  s.eventId += 1;
  s.lastEvent = { id: s.eventId, type, ...extra };
}

function updateChallenge(s) {
  if (s.mode !== "challenge") return;
  const challenge = CHALLENGES[s.challenge];
  s.challengeProgress = Math.min(challenge.goal, s.stats[challenge.stat]);
  if (!s.challengeComplete && s.challengeProgress >= challenge.goal) {
    s.challengeComplete = true;
    event(s, "challenge", { challenge: s.challenge });
  }
}

export function createGame({
  mode = "match",
  difficulty = "rookie",
  challenge = 0,
  seed = 12345,
} = {}) {
  const s = {
    mode: ["match", "practice", "challenge"].includes(mode) ? mode : "match",
    difficulty: DIFFICULTIES[difficulty] ? difficulty : "rookie",
    challenge: clamp(Math.floor(challenge), 0, 4),
    challengeProgress: 0,
    challengeComplete: false,
    phase: "serving",
    player: { x: 50, y: 86 },
    opponent: { x: 50, y: 14 },
    ball: { x: 50, y: 86, height: 0 },
    flight: null,
    score: [0, 0],
    server: "player",
    pointsPlayed: 0,
    rally: 0,
    pointWinner: null,
    message: "Serve coming up. Get ready to pick your spot!",
    stats: { deep: 0, wide: 0, open: 0, changes: 0, wins: 0, bestRally: 0 },
    playerShots: [],
    lastTarget: null,
    lastEvent: null,
    eventId: 0,
    rng: Number(seed) >>> 0,
    timer: 0.65,
    time: 0,
    bounce: null,
    playerStretch: 0,
  };
  if (s.mode === "challenge" && s.challenge === 4) s.difficulty = "rookie";
  return s;
}

function launch(s, hitter, target, shot, { serve = false, out = false } = {}) {
  const from = { ...s[hitter] };
  const length = distance(from, target);
  const duration = SHOTS[shot].duration * clamp(length / 90, 0.8, 1.12);
  s.flight = {
    from,
    to: { ...target },
    progress: 0,
    elapsed: 0,
    duration,
    hitter,
    shot,
    serve,
    out,
    receiverStart: { ...(hitter === "player" ? s.opponent : s.player) },
  };
  s.ball = { ...from, height: 0 };
  s.phase = "flight";
  s.rally += 1;
  s.stats.bestRally = Math.max(s.stats.bestRally, s.rally);
}

function serve(s) {
  const total = s.pointsPlayed;
  // Alternate service courts each point. The opening serve is yours.
  const side = total % 2 === 0 ? 1 : -1;
  const hitter = s.server;
  const perspective = hitter === "player" ? 1 : -1;
  s[hitter].x = 50 + side * perspective * 8;
  const target = {
    x: 50 - side * perspective * 12,
    y: hitter === "player" ? 32 : 68,
  };
  s.message =
    hitter === "player"
      ? "Your serve. Watch their return!"
      : "Their serve. You move to the ball automatically.";
  launch(s, hitter, target, "normal", { serve: true });
}

function endPoint(s, winner, reason) {
  s.pointWinner = winner;
  s.phase = "point";
  s.flight = null;
  s.pointsPlayed += 1;
  if (s.mode === "match") s.score[winner === "player" ? 0 : 1] += 1;
  if (winner === "player") {
    s.stats.wins += 1;
    const shots = s.playerShots;
    if (
      shots.length >= 2 &&
      shots.at(-1) !== 0 &&
      shots.at(-2) === -shots.at(-1)
    )
      s.stats.changes += 1;
  }
  s.message = reason;
  event(s, "point", { winner, reason });
  updateChallenge(s);
  if (
    s.mode === "match" &&
    Math.max(...s.score) >= 7 &&
    Math.abs(s.score[0] - s.score[1]) >= 2
  ) {
    s.phase = "match";
    s.message =
      winner === "player"
        ? "Match won! Smart shots make the difference."
        : "Good match! Every rally makes you sharper.";
  }
}

function landPlayerShot(s, flight) {
  if (flight.serve) return;
  const target = flight.to;
  const isDeep = target.y <= 21;
  const isWide =
    (target.x <= 25 && s.opponent.x <= 31) ||
    (target.x >= 75 && s.opponent.x >= 69);
  const isOpen = Math.abs(flight.receiverStart.x - target.x) >= 36;
  if (isDeep) s.stats.deep += 1;
  if (isWide) s.stats.wide += 1;
  if (isOpen) s.stats.open += 1;
  if (isOpen) s.message = "Great choice! You found the empty side.";
  else if (isWide) s.message = "Great angle! You pulled them off the court!";
  else if (isDeep) s.message = "Nice deep shot! Your opponent is pushed back.";
  else s.message = "Nice shot. Watch for space on their next return.";
  event(s, "shot", {
    deep: isDeep,
    wide: isWide,
    open: isOpen,
    shot: flight.shot,
  });
  updateChallenge(s);
}

function opponentReturn(s, incoming) {
  const d = DIFFICULTIES[s.difficulty];
  const travel = distance(incoming.receiverStart, incoming.to);
  const available = d.speed * Math.max(0, incoming.duration - d.reaction);
  const stretch = clamp(travel / Math.max(1, available), 0, 1);
  const fatigue = Math.max(0, s.rally - 15) * 0.018;
  const error = d.error + stretch * stretch * 0.045 + fatigue;
  let x;
  let y;
  if (s.difficulty === "rookie") {
    x = 28 + random(s) * 44;
    y = 73 + random(s) * 12;
  } else {
    const openSide = s.player.x > 50 ? 1 : -1;
    const smart = random(s) < (s.difficulty === "pro" ? 0.9 : 0.65);
    x = smart ? 50 - openSide * (25 + random(s) * 6) : 28 + random(s) * 44;
    y =
      s.difficulty === "pro" && s.player.y > 80 && random(s) < 0.16
        ? 59
        : 76 + random(s) * 10;
  }
  // A stretched receiver sends a slower, more central defensive ball.
  if (stretch > 0.88) x = x * 0.65 + 50 * 0.35;
  const out = random(s) < error || s.rally >= 45;
  if (out) x = x < 50 ? 8 : 92;
  const shot =
    stretch > 0.88
      ? "slice"
      : s.difficulty === "pro" && random(s) < 0.2
        ? "power"
        : "normal";
  launch(s, "opponent", { x, y }, shot, { out });
}

export function hitShot(state, target, shot = "normal") {
  if (
    state.phase !== "aim" ||
    !target ||
    !Number.isFinite(target.x) ||
    !Number.isFinite(target.y)
  )
    return state;
  if (target.x < 12 || target.x > 88 || target.y < 8 || target.y > 48)
    return state;
  const s = copy(state);
  const kind = SHOTS[shot] ? shot : "normal";
  const edge = Math.min(
    target.x - 12,
    88 - target.x,
    target.y - 8,
    50 - target.y,
  );
  const edgeRisk = clamp((7 - edge) / 7, 0, 1);
  const risk =
    SHOTS[kind].risk +
    edgeRisk * (kind === "power" ? 0.28 : 0.16) +
    s.playerStretch * (kind === "power" ? 0.055 : 0.012);
  const out = random(s) < risk;
  let landing = {
    x: target.x + (random(s) - 0.5) * 2,
    y: target.y + (random(s) - 0.5) * 1.5,
  };
  if (out) {
    if (target.y - 8 < Math.min(target.x - 12, 88 - target.x)) landing.y = 4;
    else landing.x = target.x < 50 ? 8 : 92;
  }
  // Accuracy scatter can also send a line-hugging shot outside the singles court.
  const isOut =
    out || landing.x < 12 || landing.x > 88 || landing.y < 8 || landing.y >= 50;
  s.lastTarget = { ...target };
  s.playerShots.push(target.x < 44 ? -1 : target.x > 56 ? 1 : 0);
  s.message =
    kind === "power"
      ? "Go for it! Power needs room inside the lines."
      : kind === "slice"
        ? "Change the pace. Make them move."
        : "Find your angle. Make the court work for you.";
  launch(s, "player", landing, kind, { out: isOut });
  event(s, "hit", { shot: kind });
  return s;
}

export function stepGame(state, deltaSeconds) {
  if (!["serving", "flight"].includes(state.phase)) return state;
  const s = copy(state);
  const dt = clamp(Number(deltaSeconds) || 0, 0, 0.05);
  s.time += dt;
  if (s.bounce && s.time - s.bounce.at > 0.35) s.bounce = null;
  if (s.phase === "serving") {
    s.timer -= dt;
    if (s.timer <= 0) serve(s);
    return s;
  }
  const f = s.flight;
  const previousElapsed = f.elapsed;
  f.elapsed = Math.min(f.duration, f.elapsed + dt);
  f.progress = f.elapsed / f.duration;
  const receiver = f.hitter === "player" ? "opponent" : "player";
  const d = DIFFICULTIES[s.difficulty];
  const reaction = receiver === "opponent" ? d.reaction : 0.07;
  const chaseTime = Math.max(
    0,
    f.elapsed - Math.max(previousElapsed, reaction),
  );
  const target = { x: clamp(f.to.x, 8, 92), y: f.to.y };
  move(s[receiver], target, receiver === "opponent" ? d.speed : 44, chaseTime);
  move(
    s[f.hitter],
    { x: 50, y: f.hitter === "player" ? 86 : 14 },
    (f.hitter === "player" ? 44 : d.speed) * 0.55,
    dt,
  );
  s.ball = {
    x: f.from.x + (f.to.x - f.from.x) * f.progress,
    y: f.from.y + (f.to.y - f.from.y) * f.progress,
    height: Math.sin(f.progress * Math.PI) * (f.shot === "slice" ? 2.2 : 5.5),
  };
  if (f.progress < 1) return s;
  s.bounce = { ...f.to, at: s.time };
  if (f.out) {
    endPoint(
      s,
      receiver,
      f.hitter === "player"
        ? "Too risky! That one went out. Give the lines a little room."
        : "Their shot went out. Point to you!",
    );
    return s;
  }
  if (f.hitter === "player") landPlayerShot(s, f);
  const remaining = distance(s[receiver], f.to);
  const reach = receiver === "opponent" ? d.reach : 4.5;
  if (remaining > reach) {
    endPoint(
      s,
      f.hitter,
      f.hitter === "player"
        ? "Winner! You found a spot they couldn’t reach."
        : "Just out of reach. Try a safer return to give yourself time.",
    );
    return s;
  }
  if (receiver === "opponent") opponentReturn(s, f);
  else {
    s.playerStretch = clamp(
      distance(f.receiverStart, f.to) / (44 * Math.max(0.1, f.duration - 0.07)),
      0,
      1,
    );
    s.flight = null;
    s.phase = "aim";
    s.ball = { ...s.player, height: 0 };
    if (f.serve || s.rally < 3)
      s.message = "Your shot! Pick a shot type, then tap their court.";
  }
  return s;
}

export function nextPoint(state) {
  if (state.phase !== "point") return state;
  const s = copy(state);
  s.phase = "serving";
  s.server = serverForPoint(s.pointsPlayed);
  s.player = { x: 50, y: 86 };
  s.opponent = { x: 50, y: 14 };
  s.ball = { ...s[s.server], height: 0 };
  s.flight = null;
  s.rally = 0;
  s.playerShots = [];
  s.playerStretch = 0;
  s.lastTarget = null;
  s.pointWinner = null;
  s.timer = 0.65;
  s.bounce = null;
  s.message =
    s.server === "player"
      ? "Your serve. Find the space and make it count."
      : "Their serve. Get ready for your return.";
  return s;
}
