import React, { useEffect, useRef, useState } from "react";
import { createGame, stepGame, hitShot, nextPoint } from "./engine.js";

const MODES = [
  {
    id: "match",
    name: "Quick Match",
    icon: "racket",
    note: "First to 7. Make every shot count.",
    tag: "PLAY",
  },
  {
    id: "practice",
    name: "Practice Court",
    icon: "target",
    note: "Find your angles. No score, no pressure.",
  },
  {
    id: "challenge",
    name: "Challenges",
    icon: "trophy",
    note: "Five little missions. One smarter player.",
    tag: "5",
  },
];
const LEVELS = [
  { id: "rookie", name: "Rookie", note: "A little room to learn." },
  { id: "club", name: "Club Player", note: "Ready for a good rally." },
  { id: "pro", name: "Pro", note: "Find an edge. They recover fast." },
];
const SHOT_OPTIONS = [
  {
    id: "normal",
    name: "Normal",
    note: "Steady & reliable",
    icon: "arrow",
    key: "1",
  },
  {
    id: "power",
    name: "Power",
    note: "Fast & a little risky",
    icon: "bolt",
    key: "2",
  },
  {
    id: "slice",
    name: "Slice",
    note: "Slow & unexpected",
    icon: "slice",
    key: "3",
  },
];
const MISSIONS = [
  {
    title: "Go deep",
    description: "Land 3 shots near the far baseline.",
    goal: 3,
    icon: "arrow",
  },
  {
    title: "Find your angle",
    description: "Land a wide shot and pull your opponent aside.",
    goal: 1,
    icon: "angle",
  },
  {
    title: "See the space",
    description: "Land a shot on the empty side of the court.",
    goal: 1,
    icon: "target",
  },
  {
    title: "Change the conversation",
    description: "Win a point by switching sides on consecutive shots.",
    goal: 1,
    icon: "switch",
  },
  {
    title: "Rookie, meet your match",
    description: "Win 3 points against the Rookie.",
    goal: 3,
    icon: "trophy",
  },
];
const store = {
  read(key, fallback) {
    try {
      const value = localStorage.getItem(`tsl-${key}`);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(`tsl-${key}`, JSON.stringify(value));
    } catch {
      /* Game remains playable without storage. */
    }
  },
};
const savedLevel = store.read("difficulty", "rookie");
const INITIAL_LEVEL = LEVELS.some((level) => level.id === savedLevel)
  ? savedLevel
  : "rookie";
const savedBadges = store.read("badges", []);
const INITIAL_BADGES = Array.isArray(savedBadges)
  ? savedBadges.filter((n) => Number.isInteger(n) && n >= 0 && n < 5)
  : [];

function Icon({ name, size = 20, ...props }) {
  const paths = {
    racket: (
      <>
        <ellipse cx="14" cy="9" rx="6" ry="8" transform="rotate(35 14 9)" />
        <path d="m9 15-6 7m4-9 6 5M9 4l9 6M8 8l8 6M13 2 7 12m10-8-6 12" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    trophy: (
      <>
        <path d="M7 3h10v5c0 5-2 7-5 7S7 13 7 8V3Zm0 2H3v3c0 3 2 4 5 4m9-7h4v3c0 3-2 4-5 4m-4 3v6m-4 0h8" />
      </>
    ),
    arrow: (
      <>
        <path d="M12 21V4m-6 6 6-6 6 6" />
      </>
    ),
    bolt: <path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z" />,
    slice: (
      <>
        <path d="M4 19c11 0 15-7 15-15m-6 4 6-4 3 7" />
      </>
    ),
    angle: (
      <>
        <path d="m4 20 15-15M9 5h10v10" />
      </>
    ),
    switch: (
      <>
        <path d="m4 7 3-3 3 3M7 4v12q0 4 4 4m9-3-3 3-3-3m3 3V8q0-4-4-4" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 8a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 4h.01" />
      </>
    ),
    restart: (
      <>
        <path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    menu: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 3C9 2 2 8 5 15s15 3 15-12ZM4 21l10-12" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.target}
    </svg>
  );
}

function TennisBall({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="currentColor" />
      <path
        d="M5 10c12 1 22 13 24 25M11 4c-1 12 10 23 24 25"
        fill="none"
        stroke="#183e30"
        strokeWidth="1.8"
      />
    </svg>
  );
}

// Court coordinates are the engine's independent 0–100 space.
const X = (x) => 112.37 + x * 2.5526;
const Y = (y) => 5.24 + y * 6.0952;
function Court({
  game,
  onTarget,
  hover,
  setHover,
  keyboardTarget,
  setKeyboardTarget,
  children,
}) {
  const svgRef = useRef(null);
  const aiming = game.phase === "aim";
  function pointerTarget(event) {
    const point = svgRef.current.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(
      svgRef.current.getScreenCTM().inverse(),
    );
    return { x: (local.x - 112.37) / 2.5526, y: (local.y - 5.24) / 6.0952 };
  }
  function choose(event) {
    const point = pointerTarget(event);
    if (
      aiming &&
      point.x >= 12 &&
      point.x <= 88 &&
      point.y >= 8 &&
      point.y <= 48
    )
      onTarget(point);
  }
  function keyboard(event) {
    const offsets = {
      ArrowLeft: [-6, 0],
      ArrowRight: [6, 0],
      ArrowUp: [0, -5],
      ArrowDown: [0, 5],
    };
    if (offsets[event.key]) {
      event.preventDefault();
      const [dx, dy] = offsets[event.key];
      setKeyboardTarget((p) => ({
        x: Math.min(87, Math.max(13, p.x + dx)),
        y: Math.min(47, Math.max(9, p.y + dy)),
      }));
    } else if ((event.key === " " || event.key === "Enter") && aiming) {
      event.preventDefault();
      onTarget(keyboardTarget);
    }
  }
  const target = hover || keyboardTarget;
  const flight = game.flight;
  const trajectory = flight
    ? `M${X(flight.from.x)} ${Y(flight.from.y)} Q${X((flight.from.x + flight.to.x) / 2)} ${Y((flight.from.y + flight.to.y) / 2) - 35} ${X(flight.to.x)} ${Y(flight.to.y)}`
    : null;
  const ball = game.ball;
  const status = aiming
    ? "Your shot. Find the open space."
    : game.phase === "serving"
      ? `${game.server === "player" ? "You" : "Opponent"} to serve`
      : game.phase === "flight"
        ? flight?.hitter === "player"
          ? "Nice. Watch their return."
          : "Getting into position…"
        : "A moment to reset.";
  function player(position, opponent = false) {
    return (
      <g transform={`translate(${X(position.x)} ${Y(position.y)})`}>
        <ellipse cy="7" rx="15" ry="7" fill="#05271f" opacity=".3" />
        <circle r="16" fill={opponent ? "#e5a17c" : "#d7ed8c"} opacity=".15" />
        <circle
          r="11"
          fill={opponent ? "#f4ac84" : "#d7ed8c"}
          stroke={opponent ? "#ffcfb5" : "#efffc7"}
          strokeWidth="2.5"
        />
        <circle cx="-2" cy="-3" r="3" fill="white" opacity=".45" />
        <g
          transform={`translate(${opponent ? -16 : 16} ${opponent ? 2 : -2}) rotate(${opponent ? -30 : 30})`}
        >
          <ellipse
            rx="5"
            ry="8"
            fill="none"
            stroke={opponent ? "#ffcfb5" : "#efffc7"}
            strokeWidth="2"
          />
          <path
            d="M0 8v6"
            stroke={opponent ? "#ffcfb5" : "#efffc7"}
            strokeWidth="2.5"
          />
        </g>
      </g>
    );
  }
  return (
    <div className={`court-wrap ${aiming ? "is-aiming" : ""}`}>
      <div className="court-status" aria-live="polite">
        <span className={`status-dot ${aiming ? "active" : ""}`} />
        {status}
      </div>
      <svg
        className="court-svg"
        ref={svgRef}
        viewBox="0 0 480 620"
        role="button"
        aria-label="Tennis court. Use arrow keys to aim and Enter to hit when it is your turn, or tap the opponent's court."
        aria-disabled={!aiming}
        tabIndex={0}
        onKeyDown={keyboard}
        onPointerDown={choose}
        onPointerMove={(event) => {
          const p = pointerTarget(event);
          setHover(p.x >= 12 && p.x <= 88 && p.y >= 8 && p.y <= 48 ? p : null);
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <pattern
            id="court-grain"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="2" r=".55" fill="white" opacity=".04" />
            <circle cx="4" cy="5" r=".5" fill="black" opacity=".045" />
          </pattern>
          <linearGradient id="court-shade" x2="0" y2="1">
            <stop stopColor="#1c594c" />
            <stop offset="1" stopColor="#164d40" />
          </linearGradient>
          <linearGradient id="target-zone" x2="0" y2="1">
            <stop stopColor="#d6eb90" stopOpacity=".11" />
            <stop offset="1" stopColor="#d6eb90" stopOpacity=".015" />
          </linearGradient>
          <pattern
            id="net-mesh"
            width="5"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 0H5M0 0V4"
              stroke="#d1e0d5"
              strokeWidth=".5"
              opacity=".55"
            />
          </pattern>
          <radialGradient id="ball-shine" cx=".3" cy=".2">
            <stop stopColor="#f7ffca" />
            <stop offset="1" stopColor="#d0ef69" />
          </radialGradient>
        </defs>
        <rect width="480" height="620" fill="url(#court-shade)" />
        <rect width="480" height="620" fill="url(#court-grain)" />
        <path
          d="M0 80H480M0 540H480"
          stroke="#e2ead3"
          strokeWidth="1"
          opacity=".05"
        />
        <rect
          x={X(0)}
          y={Y(8)}
          width={X(100) - X(0)}
          height={Y(92) - Y(8)}
          fill="#2e6d58"
          opacity=".47"
        />
        {aiming && (
          <rect
            x={X(12)}
            y={Y(8)}
            width={X(88) - X(12)}
            height={Y(48) - Y(8)}
            fill="url(#target-zone)"
          />
        )}
        {game.mode === "challenge" && game.challenge === 0 && (
          <rect
            x={X(12)}
            y={Y(8)}
            width={X(88) - X(12)}
            height={Y(21) - Y(8)}
            fill="#d7ed8c"
            opacity=".12"
          />
        )}
        <g fill="none" stroke="#ecf2dc" strokeWidth="1.8" opacity=".83">
          <rect x={X(0)} y={Y(8)} width={X(100) - X(0)} height={Y(92) - Y(8)} />
          <path
            d={`M${X(12)} ${Y(8)}V${Y(92)}M${X(88)} ${Y(8)}V${Y(92)}M${X(12)} ${Y(29)}H${X(88)}M${X(12)} ${Y(71)}H${X(88)}M${X(50)} ${Y(29)}V${Y(71)}M${X(50)} ${Y(8)}v6M${X(50)} ${Y(92)}v-6`}
          />
        </g>
        <text
          x="76"
          y="310"
          fill="#c9dfc9"
          opacity=".25"
          fontSize="9"
          letterSpacing="4"
          textAnchor="middle"
          transform="rotate(-90 76 310)"
        >
          FIND YOUR ADVANTAGE
        </text>
        <text
          x="404"
          y="310"
          fill="#c9dfc9"
          opacity=".25"
          fontSize="9"
          letterSpacing="4"
          textAnchor="middle"
          transform="rotate(90 404 310)"
        >
          TENNIS SHOT LAB
        </text>
        <g transform={`translate(0 ${Y(50)})`}>
          <path
            d={`M${X(-5)} 7Q240 14 ${X(105)} 7`}
            stroke="#092e25"
            strokeWidth="10"
            opacity=".2"
          />
          <path
            d={`M${X(-5)} -5Q240 1 ${X(105)} -5V5Q240 11 ${X(-5)} 5Z`}
            fill="url(#net-mesh)"
          />
          <path
            d={`M${X(-5)} -5Q240 1 ${X(105)} -5`}
            fill="none"
            stroke="#f1f5e6"
            strokeWidth="2.4"
          />
          <path
            d={`M${X(-5)} -7v16M${X(105)} -7v16`}
            stroke="#b3c1a9"
            strokeWidth="4"
          />
        </g>
        {trajectory && (
          <path
            d={trajectory}
            fill="none"
            stroke="#ecf4ae"
            opacity=".38"
            strokeWidth="1.5"
            strokeDasharray="4 5"
          />
        )}
        {game.bounce && (
          <ellipse
            cx={X(game.bounce.x)}
            cy={Y(game.bounce.y)}
            rx={5 + Math.min(1, (game.time - game.bounce.at) / 0.35) * 12}
            ry={3 + Math.min(1, (game.time - game.bounce.at) / 0.35) * 5}
            fill="none"
            stroke="#e8f5a7"
            strokeWidth="1.5"
            opacity=".6"
          />
        )}
        {game.lastTarget && !flight && (
          <g
            transform={`translate(${X(game.lastTarget.x)} ${Y(game.lastTarget.y)})`}
          >
            <ellipse rx="9" ry="5" fill="none" stroke="#dfecb0" opacity=".45" />
          </g>
        )}
        {aiming && (
          <g
            className="aim-target"
            transform={`translate(${X(target.x)} ${Y(target.y)})`}
          >
            <circle r="13" fill="#d8ee8f" opacity=".16" />
            <circle r="8" fill="none" stroke="#e3f4a8" strokeWidth="1.4" />
            <path
              d="M-17 0h5m12 0h5M0-17v5m0 24v5"
              stroke="#e3f4a8"
              strokeWidth="1.2"
            />
            <circle r="2" fill="#e3f4a8" />
          </g>
        )}
        {player(game.opponent, true)}
        {player(game.player)}
        {ball && (
          <g>
            <ellipse
              cx={X(ball.x)}
              cy={Y(ball.y) + 5}
              rx="4.5"
              ry="2.6"
              fill="#05271f"
              opacity=".4"
            />
            <circle
              cx={X(ball.x)}
              cy={Y(ball.y) - (ball.height || 0) * 4}
              r="4.8"
              fill="url(#ball-shine)"
              stroke="#f7ffd4"
              strokeWidth=".6"
            />
          </g>
        )}
        <text
          x="240"
          y="602"
          fill="#c8debd"
          opacity=".6"
          textAnchor="middle"
          fontSize="8"
          letterSpacing="2.8"
        >
          A LITTLE PLACEMENT. A LOT OF POSSIBILITY.
        </text>
      </svg>
      {children}
      <div className="court-footer">
        <span className="court-key">
          <i className="key-dot" /> You <i className="key-dot opponent-dot" />{" "}
          Opponent
        </span>
        <span>
          {aiming
            ? "Tap the far court to hit"
            : `${game.rally || 0} shots this rally`}{" "}
          <Icon name="target" size={13} />
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [difficulty, setDifficulty] = useState(INITIAL_LEVEL);
  const [mode, setMode] = useState("match");
  const [challenge, setChallenge] = useState(0);
  const [game, setGame] = useState(() =>
    createGame({ mode: "match", difficulty: INITIAL_LEVEL, seed: Date.now() }),
  );
  const [shot, setShot] = useState("normal");
  const [hover, setHover] = useState(null);
  const [keyboardTarget, setKeyboardTarget] = useState({ x: 50, y: 23 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [tutorial, setTutorial] = useState(() =>
    store.read("tutorial", false) ? null : 0,
  );
  const [badges, setBadges] = useState(INITIAL_BADGES);
  const [celebrate, setCelebrate] = useState(false);
  const lastWon = useRef("");
  const activeLevel =
    mode === "challenge" && challenge === 4 ? "rookie" : difficulty;
  const level = LEVELS.find((level) => level.id === activeLevel);
  const mission = MISSIONS[challenge];
  const menuRef = useRef(null);

  useEffect(() => {
    if (menuOpen) return;
    let id;
    let previous = performance.now();
    function frame(now) {
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      setGame((current) =>
        current.phase === "flight" || current.phase === "serving"
          ? stepGame(current, delta)
          : current,
      );
      id = requestAnimationFrame(frame);
    }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [menuOpen]);

  useEffect(() => {
    if (game.challengeComplete && mode === "challenge") {
      setBadges((current) => {
        if (current.includes(challenge)) return current;
        const result = [...current, challenge];
        store.write("badges", result);
        return result;
      });
    }
    const marker = `${game.score?.join("-")}-${game.stats?.wins}-${game.challengeComplete}`;
    if (
      (game.phase === "point" || game.phase === "match") &&
      (game.pointWinner === "player" || game.challengeComplete) &&
      marker !== lastWon.current
    ) {
      lastWon.current = marker;
      setCelebrate(true);
      const timer = setTimeout(() => setCelebrate(false), 1700);
      return () => clearTimeout(timer);
    }
  }, [
    game.phase,
    game.challengeComplete,
    game.pointWinner,
    game.score,
    game.stats?.wins,
    mode,
    challenge,
  ]);

  useEffect(() => {
    function shortcuts(event) {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.target.closest("button")
      )
        return;
      const option = SHOT_OPTIONS.find((s) => s.key === event.key);
      if (option && !menuOpen) selectShot(option.id);
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.activeElement;
    menuRef.current?.querySelector("button")?.focus();
    function trap(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const buttons = [...menuRef.current.querySelectorAll("button")];
      if (event.shiftKey && document.activeElement === buttons[0]) {
        event.preventDefault();
        buttons.at(-1).focus();
      }
      if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
        event.preventDefault();
        buttons[0].focus();
      }
    }
    window.addEventListener("keydown", trap);
    return () => {
      window.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [menuOpen]);

  function start(
    nextMode = mode,
    nextLevel = difficulty,
    nextChallenge = challenge,
  ) {
    setMode(nextMode);
    setDifficulty(nextLevel);
    setChallenge(nextChallenge);
    setShot("normal");
    setHover(null);
    setCelebrate(false);
    setGame(
      createGame({
        mode: nextMode,
        difficulty:
          nextMode === "challenge" && nextChallenge === 4
            ? "rookie"
            : nextLevel,
        challenge: nextChallenge,
        seed: Date.now(),
      }),
    );
    setMenuOpen(false);
    store.write("difficulty", nextLevel);
  }
  function selectShot(value) {
    setShot(value);
    setTutorial((current) => (current === 0 ? 1 : current));
  }
  function target(point) {
    setGame((current) => hitShot(current, point, shot));
    setTutorial((current) => (current === 0 || current === 1 ? 2 : current));
  }
  function finishTutorial() {
    setTutorial(null);
    store.write("tutorial", true);
  }
  const pointOver = game.phase === "point" || game.phase === "match";
  const matchOver = game.phase === "match";
  const challengeOver = mode === "challenge" && game.challengeComplete;
  const resultTitle = challengeOver
    ? "That’s smart tennis."
    : matchOver
      ? game.pointWinner === "player"
        ? "Game, set, great thinking."
        : "A good match. A fresh start?"
      : game.pointWinner === "player"
        ? "Point, beautifully played."
        : "Next point. New possibility.";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => setMenuOpen(true)}
          aria-label="Tennis Shot Lab main menu"
        >
          <span className="brand-mark">
            <TennisBall />
          </span>
          <span className="brand-name">
            tennis
            <span>
              shot lab<span className="brand-period">.</span>
            </span>
          </span>
        </button>
        <div className="brand-subtitle">FIND YOUR ADVANTAGE</div>
        <div className="section-label nav-section-label">THE CLUBHOUSE</div>
        <nav className="nav-list" aria-label="Game modes">
          {MODES.map((item) => (
            <button
              key={item.id}
              className={`nav-button ${mode === item.id ? "active" : ""}`}
              aria-label={item.name}
              title={item.name}
              aria-current={mode === item.id ? "page" : undefined}
              onClick={() => {
                start(item.id);
                finishTutorial();
              }}
            >
              <span className="nav-icon">
                <Icon name={item.icon} />
              </span>
              <span className="nav-name">{item.name}</span>
              {item.tag && <span className="nav-tag">{item.tag}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="daily-note">
            <Icon name="sun" size={26} />
            <p>
              Good tennis starts
              <br />
              with a good idea.
            </p>
            <span>Less rush. More intention.</span>
          </div>
          <button
            className="nav-button help-nav"
            onClick={() => {
              setMenuOpen(false);
              setTutorial(0);
              if (pointOver) start();
            }}
          >
            <Icon name="help" />
            <span>How to play</span>
            <Icon name="chevron" size={15} />
          </button>
          <div className="sidebar-footnote">A little smarter. Every rally.</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>THE COURT</span>
            <span>/</span>
            <strong>{MODES.find((item) => item.id === mode).name}</strong>
          </div>
          <div className="top-actions">
            <span className="online-label">
              <i /> YOUR COURT. YOUR PACE.
            </span>
            <button
              className="icon-button"
              title="Main menu"
              aria-label="Main menu"
              onClick={() => setMenuOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <button
              className="icon-button"
              title="How to play"
              aria-label="How to play"
              onClick={() => {
                setTutorial(0);
                if (pointOver) start();
              }}
            >
              <Icon name="help" />
            </button>
          </div>
        </header>
        <section className="page-header">
          <div className="eyebrow">
            {mode === "match"
              ? "PLAY WITH A LITTLE MORE INTENTION"
              : mode === "practice"
                ? "SPACE TO EXPERIMENT"
                : "SMALL WINS. SMARTER TENNIS."}
          </div>
          <div className="title-row">
            <h1>
              {mode === "match"
                ? "Find your advantage."
                : mode === "practice"
                  ? "Make room for discovery."
                  : "Rise to the challenge."}
            </h1>
            <span className="header-badge">
              <Icon name={mode === "challenge" ? "trophy" : "leaf"} size={15} />
              {mode === "match"
                ? "A game of good decisions"
                : mode === "practice"
                  ? "No score. Just possibility."
                  : `${badges.length} of 5 mastered`}
            </span>
          </div>
          <p className="page-description">
            {mode === "challenge"
              ? "Build your court sense, one little victory at a time."
              : "See the space. Choose your shot. Make the court your own."}
          </p>
        </section>

        <div className="game-layout">
          <section className="play-panel" aria-label="Tennis game">
            <div className="scoreboard">
              <div className="score-side">
                <span className="player-avatar">Y</span>
                <div>
                  <div className="player-name">
                    You{" "}
                    {game.server === "player" && (
                      <i className="server-dot" title="Serving" />
                    )}
                  </div>
                  <div className="player-label">THE THINKING PLAYER</div>
                </div>
              </div>
              <div className="score-center">
                {mode === "practice" ? (
                  <>
                    <div className="practice-score">
                      <Icon name="target" size={26} />
                    </div>
                    <div className="match-meta">FREE PLAY</div>
                  </>
                ) : (
                  <>
                    <div
                      className="score-numbers"
                      aria-label={
                        mode === "challenge"
                          ? `Challenge progress: ${game.challengeProgress} of ${mission.goal}`
                          : `Score: You ${game.score[0]}, opponent ${game.score[1]}`
                      }
                    >
                      <span className="score-num">
                        {mode === "challenge"
                          ? game.challengeProgress
                          : game.score[0]}
                      </span>
                      <span className="score-divider">
                        {mode === "challenge" ? "/" : ":"}
                      </span>
                      <span className="score-num">
                        {mode === "challenge" ? mission.goal : game.score[1]}
                      </span>
                    </div>
                    <div className="match-meta">
                      {mode === "match"
                        ? "TIEBREAK · FIRST TO 7, WIN BY 2"
                        : "CHALLENGE COURT"}
                    </div>
                  </>
                )}
              </div>
              <div className="score-side opponent">
                <div>
                  <div className="player-name">
                    {game.server === "opponent" && (
                      <i className="server-dot" title="Serving" />
                    )}{" "}
                    {level.name}
                  </div>
                  <div className="player-label">YOUR OPPONENT</div>
                </div>
                <span className="player-avatar orange">
                  <Icon name="racket" size={18} />
                </span>
              </div>
            </div>

            <Court
              game={game}
              onTarget={target}
              hover={hover}
              setHover={setHover}
              keyboardTarget={keyboardTarget}
              setKeyboardTarget={setKeyboardTarget}
            >
              {pointOver && (
                <div className="court-overlay">
                  <div className="result-card" role="status">
                    <span className="result-symbol">
                      <Icon
                        name={
                          game.pointWinner === "player" ? "spark" : "restart"
                        }
                        size={30}
                      />
                    </span>
                    <span className="result-eyebrow">
                      {challengeOver
                        ? "CHALLENGE COMPLETE"
                        : matchOver
                          ? "MATCH COMPLETE"
                          : game.pointWinner === "player"
                            ? "YOU WON THE POINT"
                            : "POINT TO YOUR OPPONENT"}
                    </span>
                    <h2>{resultTitle}</h2>
                    <p>{game.message}</p>
                    {mode === "match" && (
                      <div className="result-score">
                        {game.score[0]} <span>—</span> {game.score[1]}
                      </div>
                    )}
                    <button
                      className="button primary"
                      onClick={() => {
                        if (challengeOver && challenge < 4)
                          start("challenge", difficulty, challenge + 1);
                        else if (matchOver || challengeOver) start();
                        else setGame((current) => nextPoint(current));
                        setCelebrate(false);
                      }}
                    >
                      {challengeOver
                        ? challenge < 4
                          ? "Next challenge"
                          : "Play again"
                        : matchOver
                          ? "Play again"
                          : "Next point"}
                      <Icon
                        name="arrow"
                        size={17}
                        style={{ transform: "rotate(90deg)" }}
                      />
                    </button>
                    {(matchOver || challengeOver) && (
                      <button
                        className="button text-button"
                        onClick={() => setMenuOpen(true)}
                      >
                        Back to clubhouse
                      </button>
                    )}
                  </div>
                </div>
              )}
              {tutorial !== null && !pointOver && (
                <div className="tutorial-card">
                  <div className="tutorial-top">
                    <span>
                      <Icon name="spark" size={15} /> YOUR FIRST RALLY
                    </span>
                    <button
                      className="icon-button"
                      onClick={finishTutorial}
                      aria-label="Skip tutorial"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                  <div className="step-dots">
                    {[0, 1, 2].map((n) => (
                      <i
                        className={
                          tutorial === n ? "active" : tutorial > n ? "done" : ""
                        }
                        key={n}
                      />
                    ))}
                    <span>{tutorial + 1} / 3</span>
                  </div>
                  <h3>
                    {
                      [
                        "A good shot starts with a choice.",
                        "Now, find a little open space.",
                        "You think. Your feet do the rest.",
                      ][tutorial]
                    }
                  </h3>
                  <p>
                    {
                      [
                        "Choose Normal, Power, or Slice below the court. Normal is a great place to start.",
                        "Tap the far half of the court. Aim away from the orange player, with a little room inside the lines.",
                        "Your player moves automatically. When the ball comes back, the game waits for your next idea. Win 7 points, with a lead of 2.",
                      ][tutorial]
                    }
                  </p>
                  {tutorial === 2 ? (
                    <button
                      className="button primary small"
                      onClick={finishTutorial}
                    >
                      Let’s play <Icon name="chevron" size={14} />
                    </button>
                  ) : (
                    <div className="tutorial-hint">
                      <Icon
                        name={tutorial === 0 ? "arrow" : "target"}
                        size={15}
                        style={
                          tutorial === 0 ? { transform: "rotate(180deg)" } : {}
                        }
                      />
                      {tutorial === 0
                        ? "Try a shot type below"
                        : "Tap the other side of the net"}
                    </div>
                  )}
                </div>
              )}
              {celebrate && (
                <div className="celebration" aria-hidden="true">
                  {Array.from({ length: 18 }, (_, i) => (
                    <span
                      key={i}
                      style={{
                        "--i": i,
                        "--color": ["#d6ec87", "#f4ac84", "#ffffff"][i % 3],
                      }}
                    />
                  ))}
                </div>
              )}
            </Court>

            <div className="shot-controls">
              <div className="control-heading">
                <strong>Make your next move</strong>
                <span>
                  {game.phase === "aim"
                    ? "Pick a shot, then tap the court"
                    : "Choose a shot for your next return"}
                </span>
              </div>
              <div className="shot-options" role="group" aria-label="Shot type">
                {SHOT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`shot-button ${shot === option.id ? "selected" : ""}`}
                    aria-pressed={shot === option.id}
                    onClick={() => selectShot(option.id)}
                  >
                    <span className="shot-icon">
                      <Icon name={option.icon} size={22} />
                    </span>
                    <span className="shot-copy">
                      <strong>{option.name}</strong>
                      <small>{option.note}</small>
                    </span>
                    <kbd className="shot-shortcut">{option.key}</kbd>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="insight-panel">
            {mode === "challenge" ? (
              <section className="challenge-section">
                <div className="card-label">
                  <Icon name="trophy" size={16} /> YOUR CHALLENGES{" "}
                  <span>{badges.length}/5</span>
                </div>
                <div className="challenge-list">
                  {MISSIONS.map((item, i) => (
                    <button
                      className={`challenge-button ${challenge === i ? "selected" : ""}`}
                      key={item.title}
                      onClick={() => start("challenge", difficulty, i)}
                    >
                      <span
                        className={`challenge-index ${badges.includes(i) ? "complete" : ""}`}
                      >
                        {badges.includes(i) ? (
                          <Icon name="check" size={15} />
                        ) : (
                          `0${i + 1}`
                        )}
                      </span>
                      <span className="challenge-copy">
                        <strong>{item.title}</strong>
                        {challenge === i && <small>{item.description}</small>}
                      </span>
                      {challenge === i && <Icon name="chevron" size={13} />}
                    </button>
                  ))}
                </div>
                <div className="challenge-progress">
                  <span>
                    THIS ATTEMPT{" "}
                    <strong>
                      {Math.min(game.challengeProgress || 0, mission.goal)} /{" "}
                      {mission.goal}
                    </strong>
                  </span>
                  <progress
                    max={mission.goal}
                    value={Math.min(game.challengeProgress || 0, mission.goal)}
                    aria-label="Challenge progress"
                  />
                </div>
                <button
                  className="button text-button small"
                  onClick={() => start("challenge", difficulty, challenge)}
                >
                  <Icon name="restart" size={14} /> Retry this challenge
                </button>
              </section>
            ) : null}
            <section className="coach-card">
              <div className="card-label">
                <Icon name="spark" size={17} /> COURTSIDE COACH
                <span className="coach-live">LIVE</span>
              </div>
              <h2>
                {game.phase === "aim"
                  ? "A little space goes a long way."
                  : pointOver && game.pointWinner === "player"
                    ? "That’s the idea."
                    : mode === "practice"
                      ? "Curiosity looks good on you."
                      : "Play the space."}
              </h2>
              <p className="coach-message" aria-live="polite">
                {game.message ||
                  "Take a breath. Look at your opponent. Where would you least like to run?"}
              </p>
              <div className="coach-tip">
                <span className="tip-marker">
                  <Icon name="angle" size={18} />
                </span>
                <p>
                  {shot === "power"
                    ? "Power gets there faster. Leave a little room inside the lines."
                    : shot === "slice"
                      ? "A slice travels slowly and stays low. Aim short when they’re far back."
                      : "Deep shots buy you time. Wide shots open up the other side."}
                </p>
              </div>
            </section>
            <section className="settings-card">
              <div className="card-label">YOUR OPPONENT</div>
              <div
                className="difficulty-options"
                role="group"
                aria-label="Difficulty"
              >
                {LEVELS.map((item) => (
                  <button
                    key={item.id}
                    className={`difficulty-button ${activeLevel === item.id ? "selected" : ""}`}
                    aria-pressed={activeLevel === item.id}
                    disabled={
                      mode === "challenge" &&
                      challenge === 4 &&
                      item.id !== "rookie"
                    }
                    onClick={() => start(mode, item.id)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              <p className="settings-note">
                {mode === "challenge" && challenge === 4
                  ? "This mission is played against the Rookie."
                  : level.note}{" "}
                <span>Changing levels starts fresh.</span>
              </p>
            </section>
            <section className="session-card">
              <div className="card-label">A LITTLE PROGRESS</div>
              <div className="session-stats">
                <div className="stat-cell">
                  <strong>
                    {game.rally || 0}
                    <span>shots</span>
                  </strong>
                  <span>Current rally</span>
                </div>
                <div className="stat-cell">
                  <strong>
                    {game.stats?.bestRally || 0}
                    <span>shots</span>
                  </strong>
                  <span>Your best rally</span>
                </div>
              </div>
              <div className="legend-row">
                <span className="legend-dot" />
                <span>
                  Green is you. Peach is your opponent.
                  <br />
                  The little dot by a name means they serve.
                </span>
              </div>
            </section>
            <div className="session-actions">
              <button className="button secondary" onClick={() => start()}>
                <Icon name="restart" size={16} /> Restart
              </button>
              <button
                className="button secondary"
                onClick={() => setMenuOpen(true)}
              >
                <Icon name="menu" size={16} /> Main menu
              </button>
            </div>
            <div className="insight-note">
              <Icon name="leaf" size={18} />
              <span>
                Good decisions beat fast fingers.
                <br />
                Take your time. The court can wait.
              </span>
            </div>
          </aside>
        </div>
        <footer className="footer-note">
          <span>
            TENNIS SHOT LAB <span className="footer-dot">•</span> SMALL GAME.
            BIG COURT SENSE.
          </span>
          <span>
            Built for the love of the game. <Icon name="racket" size={14} />
          </span>
        </footer>
      </main>

      {menuOpen && (
        <div
          className="menu-overlay"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <section
            className="menu-dialog"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-title"
          >
            <div className="dialog-header">
              <span className="eyebrow">WELCOME TO YOUR COURT</span>
              <button
                className="icon-button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close main menu"
              >
                <Icon name="close" />
              </button>
            </div>
            <h2 id="menu-title">A good day to play.</h2>
            <p>
              A little strategy. A little practice. A whole lot of possibility.
            </p>
            <div className="menu-cards">
              {MODES.map((item) => (
                <button
                  className="menu-card"
                  key={item.id}
                  onClick={() => {
                    start(item.id);
                    finishTutorial();
                  }}
                >
                  <span className="menu-card-icon">
                    <Icon name={item.icon} size={25} />
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.note}</small>
                  </span>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
            <button
              className="button secondary"
              onClick={() => setMenuOpen(false)}
            >
              Back to my court
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
