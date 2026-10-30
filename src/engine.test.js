import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  stepGame,
  hitShot,
  nextPoint,
  serverForPoint,
  DIFFICULTIES,
  CHALLENGES,
} from "./engine.js";

function advance(
  state,
  until = (s) => s.phase !== "flight" && s.phase !== "serving",
  limit = 3000,
) {
  let s = state;
  for (let i = 0; i < limit; i++) {
    if (until(s)) return s;
    s = stepGame(s, 0.05);
  }
  assert.fail("Simulation did not reach the requested phase");
}

// A simple, real player strategy: use the open side and mix reliable and power
// shots. This exercises public actions and simulation, not challenge counters.
function play(
  options,
  stop = (s) => s.phase === "match" || s.challengeComplete,
  target = null,
) {
  let s = createGame(options);
  let shots = 0;
  const pointWinners = [];
  for (let i = 0; i < 30000; i++) {
    if (stop(s)) return { state: s, shots, pointWinners };
    if (s.phase === "aim") {
      shots++;
      s = hitShot(
        s,
        target || { x: s.opponent.x > 50 ? 20 : 80, y: 18 },
        shots % 2 ? "normal" : "power",
      );
    } else if (s.phase === "point") {
      pointWinners.push(s.pointWinner);
      s = nextPoint(s);
    } else s = stepGame(s, 0.05);
  }
  assert.fail("Game failed to finish");
}

test("tiebreak service follows 1–2–2 order, alternating courts each point", () => {
  assert.deepEqual(
    Array.from({ length: 13 }, (_, i) => serverForPoint(i)),
    [
      "player",
      "opponent",
      "opponent",
      "player",
      "player",
      "opponent",
      "opponent",
      "player",
      "player",
      "opponent",
      "opponent",
      "player",
      "player",
    ],
  );
  const initial = createGame();
  const served = advance(initial, (s) => s.phase === "flight");
  assert.equal(served.flight.serve, true);
  assert.equal(served.flight.hitter, "player");
  assert.equal(served.flight.from.x, 58);
  assert.equal(served.flight.to.x, 38);
  assert.equal(served.flight.to.y, 32);
  let next = nextPoint({ ...initial, phase: "point", pointsPlayed: 1 });
  next = advance(next, (s) => s.phase === "flight");
  assert.equal(next.flight.hitter, "opponent");
  assert.equal(next.flight.to.x, 38);
  assert.equal(next.flight.to.y, 68);
  const opponentDeuce = advance(
    nextPoint({ ...initial, phase: "point", pointsPlayed: 2 }),
    (s) => s.phase === "flight",
  );
  assert.equal(opponentDeuce.flight.from.x, 42);
  assert.equal(opponentDeuce.flight.to.x, 62);
  const playerAd = advance(
    nextPoint({ ...initial, phase: "point", pointsPlayed: 3 }),
    (s) => s.phase === "flight",
  );
  assert.equal(playerAd.flight.from.x, 42);
  assert.equal(playerAd.flight.to.x, 62);
});

test("automatic serve and return lead to an interactive shot, never an idle rally", () => {
  const s = advance(createGame({ seed: 12345 }));
  assert.equal(s.phase, "aim");
  assert.equal(s.rally, 2);
  assert.notEqual(s.player.y, 86);
  const aimed = hitShot(s, { x: 75, y: 17 }, "normal");
  assert.equal(aimed.phase, "flight");
  assert.equal(aimed.flight.hitter, "player");
  assert.equal(aimed.rally, 3);
  assert.equal(s.phase, "aim", "the previous React state is immutable");
  assert.deepEqual(
    stepGame(s, 10),
    s,
    "time and AI freeze while choosing a shot",
  );
});

test("targeting ignores invalid places and input during animation", () => {
  const initial = createGame();
  assert.equal(hitShot(initial, { x: 50, y: 20 }), initial);
  const aim = advance(initial);
  for (const target of [
    { x: 50, y: 75 },
    { x: 4, y: 20 },
    { x: NaN, y: 20 },
    null,
  ]) {
    assert.equal(hitShot(aim, target), aim);
  }
});

test("seeded games replay the same outcomes and both sides win points", () => {
  const a = play({ seed: 12345, difficulty: "club" });
  const b = play({ seed: 12345, difficulty: "club" });
  assert.deepEqual(a, b);
  assert.ok(a.pointWinners.includes("player"));
  assert.ok(a.pointWinners.includes("opponent"));
  assert.ok(a.shots > 5);
  assert.equal(a.state.phase, "match");
  assert.ok(Math.max(...a.state.score) >= 7);
  assert.ok(Math.abs(a.state.score[0] - a.state.score[1]) >= 2);
});

function awardPoint(state, winner) {
  // An already flying ball landing out is a real end-point event. This fixture
  // lets scoring edge cases be tested independently of random rally lengths.
  const hitter = winner === "player" ? "opponent" : "player";
  return stepGame(
    {
      ...state,
      phase: "flight",
      flight: {
        from: { x: 50, y: 20 },
        to: { x: 95, y: 80 },
        receiverStart: { x: 50, y: 80 },
        elapsed: 0.99,
        duration: 1,
        progress: 0.99,
        hitter,
        shot: "normal",
        out: true,
        serve: false,
      },
    },
    0.05,
  );
}

test("7–6 is not a win; tiebreak keeps going until the lead is two", () => {
  let s = { ...createGame(), score: [6, 6], pointsPlayed: 12 };
  s = awardPoint(s, "player");
  assert.deepEqual(s.score, [7, 6]);
  assert.equal(s.phase, "point");
  s = awardPoint(nextPoint(s), "opponent");
  assert.deepEqual(s.score, [7, 7]);
  assert.equal(s.phase, "point");
  s = awardPoint(nextPoint(s), "player");
  s = awardPoint(nextPoint(s), "player");
  assert.deepEqual(s.score, [9, 7]);
  assert.equal(s.phase, "match");
  assert.equal(s.pointWinner, "player");
  assert.equal(nextPoint(s), s, "a finished match cannot quietly continue");
});

test("a short flight cannot teleport a distant receiver to the ball", () => {
  let s = createGame({ seed: 900, difficulty: "pro" });
  s.phase = "flight";
  s.opponent = { x: 16, y: 14 };
  s.flight = {
    from: { x: 70, y: 85 },
    to: { x: 83, y: 14 },
    receiverStart: { ...s.opponent },
    elapsed: 0,
    duration: 0.3,
    progress: 0,
    hitter: "player",
    shot: "power",
    out: false,
    serve: false,
  };
  s = advance(s);
  assert.equal(s.phase, "point");
  assert.equal(s.pointWinner, "player");
  assert.ok(s.opponent.x < 40);
});

test("difficulty changes actual speed, accuracy, strategy and match outcomes", () => {
  assert.ok(DIFFICULTIES.rookie.speed < DIFFICULTIES.club.speed);
  assert.ok(DIFFICULTIES.club.speed < DIFFICULTIES.pro.speed);
  assert.ok(DIFFICULTIES.rookie.error > DIFFICULTIES.pro.error);
  const averageShare = ["rookie", "club", "pro"].map((difficulty) => {
    const shares = [11, 22, 33, 44, 55, 66, 77, 88].map((seed) => {
      const { state } = play({ seed, difficulty });
      const high = Math.max(...state.score);
      const lead = Math.abs(state.score[0] - state.score[1]);
      assert.equal(state.phase, "match");
      assert.ok(high >= 7 && lead >= 2);
      assert.ok(
        high === 7 || lead === 2,
        "the match stops at the first two-point lead after seven",
      );
      return state.score[0] / (state.score[0] + state.score[1]);
    });
    return shares.reduce((sum, share) => sum + share, 0) / shares.length;
  });
  assert.ok(
    averageShare[0] > averageShare[1],
    "the same strategy should score more against Rookie than Club",
  );
  assert.ok(
    averageShare[1] > averageShare[2] + 0.15,
    "Pro should pose a meaningful additional challenge",
  );
});

test("shot types change actual flight speed and slice keeps a lower trajectory", () => {
  const aim = { ...createGame({ seed: 12345 }), phase: "aim" };
  const shots = Object.fromEntries(
    ["normal", "power", "slice"].map((kind) => [
      kind,
      hitShot(aim, { x: 50, y: 20 }, kind),
    ]),
  );
  for (const state of Object.values(shots))
    assert.equal(state.flight.out, false);
  assert.ok(shots.power.flight.duration < shots.normal.flight.duration);
  assert.ok(shots.normal.flight.duration < shots.slice.flight.duration);
  const heights = Object.fromEntries(
    Object.entries(shots).map(([kind, state]) => {
      const middle = advance(state, (s) => s.flight.progress >= 0.5);
      return [kind, middle.ball.height];
    }),
  );
  assert.ok(heights.normal > heights.slice * 2);
});

test("controlled randomness rewards safe targets and makes power riskier", () => {
  const outs = {
    normalCenter: 0,
    normalEdge: 0,
    powerCenter: 0,
    powerEdge: 0,
    sliceCenter: 0,
  };
  for (let seed = 1; seed <= 2048; seed++) {
    const aim = { ...createGame({ seed }), phase: "aim" };
    for (const [name, shot, x] of [
      ["normalCenter", "normal", 50],
      ["normalEdge", "normal", 12.5],
      ["powerCenter", "power", 50],
      ["powerEdge", "power", 12.5],
      ["sliceCenter", "slice", 50],
    ]) {
      if (hitShot(aim, { x, y: 20 }, shot).flight.out) outs[name]++;
    }
  }
  assert.ok(outs.normalCenter > 0 && outs.normalCenter < 2048 * 0.04);
  assert.ok(outs.powerCenter > outs.normalCenter * 3);
  assert.ok(
    outs.sliceCenter > outs.normalCenter && outs.sliceCenter < outs.powerCenter,
  );
  assert.ok(outs.normalEdge > outs.normalCenter * 5);
  assert.ok(
    outs.powerEdge > outs.normalEdge && outs.powerEdge > outs.powerCenter,
  );
});

test("practice plays repeated points without keeping a score or ending a match", () => {
  const { state, shots } = play(
    { mode: "practice", seed: 12345 },
    (s) => s.pointsPlayed >= 15,
  );
  assert.deepEqual(state.score, [0, 0]);
  assert.equal(state.phase, "point");
  assert.ok(shots >= 15);
  assert.ok(state.stats.bestRally >= 3);
});

for (let challenge = 0; challenge < CHALLENGES.length; challenge++) {
  test(`challenge ${challenge + 1} is winnable through normal play and resets: ${CHALLENGES[challenge].title}`, () => {
    const options = { mode: "challenge", challenge, seed: 12345 };
    const { state, shots } = play(options);
    assert.equal(state.challengeComplete, true);
    assert.equal(state.challengeProgress, CHALLENGES[challenge].goal);
    assert.ok(shots > 0);
    assert.ok(
      state.stats[CHALLENGES[challenge].stat] >= CHALLENGES[challenge].goal,
    );
    const reset = createGame(options);
    assert.equal(reset.challengeComplete, false);
    assert.equal(reset.challengeProgress, 0);
    assert.equal(reset.stats[CHALLENGES[challenge].stat], 0);
  });
}

test("an out ball never earns a deep/wide/open challenge credit", () => {
  const s = awardPoint(
    { ...createGame({ mode: "challenge", challenge: 0 }), playerShots: [-1] },
    "opponent",
  );
  assert.equal(s.challengeProgress, 0);
  assert.equal(s.stats.deep, 0);
  assert.equal(s.stats.wide, 0);
  assert.equal(s.stats.open, 0);
});

test("the three-point Rookie challenge always uses the Rookie", () => {
  assert.equal(
    createGame({ mode: "challenge", challenge: 4, difficulty: "pro" })
      .difficulty,
    "rookie",
  );
});
