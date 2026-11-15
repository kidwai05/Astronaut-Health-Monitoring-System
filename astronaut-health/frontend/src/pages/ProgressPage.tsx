import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  Award,
  Bone,
  Check,
  Flame,
  LockKeyhole,
  Moon,
  Smile,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

const weeklyScores = [
  { day: "M", value: 74 },
  { day: "T", value: 79 },
  { day: "W", value: 76 },
  { day: "T", value: 83 },
  { day: "F", value: 80 },
  { day: "S", value: 85 },
  { day: "S", value: 82 },
];

const badges = [
  {
    name: "7-day logger",
    detail: "Logged health for seven days in a row",
    icon: Check,
    status: "earned",
    progress: "Earned · Mission day 137",
  },
  {
    name: "Sleep champion",
    detail: "Reach your sleep goal five nights this week",
    icon: Moon,
    status: "in-progress",
    progress: "3 of 5 nights",
  },
  {
    name: "Iron bones",
    detail: "Complete four resistance sessions this week",
    icon: Bone,
    status: "locked",
    progress: "2 of 4 sessions",
  },
  {
    name: "Mood tracker",
    detail: "Complete a wellbeing check-in five days this week",
    icon: Smile,
    status: "earned",
    progress: "Earned · Mission day 141",
  },
] as const;

export function ProgressPage({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setLoading(false), reduced ? 250 : 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) return <ProgressSkeleton />;

  return (
    <main className="dashboard support-screen progress-screen">
      <section className="support-page-heading page-entrance">
        <div>
          <p className="eyebrow">YOUR MISSION, YOUR PACE</p>
          <h1>Progress</h1>
          <p>Every check-in is a little more insight into how you're doing.</p>
        </div>
        <span className="progress-week-label">
          <Sparkles size={16} /> This week
        </span>
      </section>

      <section className="progress-hero-grid">
        <article
          className="streak-card-large panel reveal-card"
          style={{ "--reveal-delay": "40ms" } as CSSProperties}
        >
          <div className="streak-glow">
            <Flame size={25} />
          </div>
          <span className="panel-kicker">DAILY LOGGING STREAK</span>
          <div className="streak-count">
            <strong>12</strong>
            <span>days</span>
          </div>
          <h2>You're building a steady rhythm.</h2>
          <p>Your consistency helps make your personal trends more useful.</p>
          <div className="streak-week-dots" aria-label="Logged each day this week">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <span className="streak-day" key={`${day}-${index}`}>
                <i className={index === 6 ? "today" : "done"}>
                  {index < 6 ? <Check size={12} /> : <Star size={12} />}
                </i>
                <small>{day}</small>
              </span>
            ))}
          </div>
        </article>

        <article
          className="mission-progress-card panel reveal-card"
          style={{ "--reveal-delay": "110ms" } as CSSProperties}
        >
          <div className="support-panel-heading">
            <div>
              <span className="panel-kicker">MISSION TIMELINE</span>
              <h2>
                Day 142 <small>of 520</small>
              </h2>
            </div>
            <span className="mission-orbit-icon">
              <TrendingUp size={19} />
            </span>
          </div>
          <div className="mission-day-track">
            <span />
            <i />
          </div>
          <div className="mission-progress-labels">
            <span>Launch</span>
            <strong>27% complete</strong>
            <span>Return</span>
          </div>
          <p>You're making progress through the mission—one day at a time.</p>
          <div className="mission-milestone">
            <span>Next milestone</span>
            <strong>
              Mission day 150 <small>· 8 days away</small>
            </strong>
          </div>
        </article>

        <article
          className="weekly-score-card panel reveal-card"
          style={{ "--reveal-delay": "180ms" } as CSSProperties}
        >
          <div className="support-panel-heading">
            <div>
              <span className="panel-kicker">WEEKLY HEALTH SCORE</span>
              <h2>Health snapshot</h2>
            </div>
            <span className="score-trend">
              <TrendingUp size={15} /> +4
            </span>
          </div>
          <div className="score-card-content">
            <div className="score-ring" role="img" aria-label="Weekly health score 82 out of 100">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle className="score-ring-track" cx="60" cy="60" r="48" />
                <circle className="score-ring-value" cx="60" cy="60" r="48" pathLength="100" />
              </svg>
              <span>
                <strong>82</strong>
                <small>/100</small>
              </span>
            </div>
            <div className="score-copy">
              <span className="score-status">
                <i /> Steady
              </span>
              <p>A positive week so far. Keep noticing what helps you feel your best.</p>
              <button onClick={() => onNavigate("Trends")}>
                View health trends <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
          <WeeklyScoreChart />
        </article>
      </section>

      <section className="progress-badges-section">
        <header className="support-section-title page-entrance">
          <div>
            <span className="panel-kicker">MILESTONES & WINS</span>
            <h2>Your badges</h2>
            <p>Celebrate the habits you're growing. There's no rush to unlock them all.</p>
          </div>
          <span className="badge-count">
            <Award size={17} /> 2 earned
          </span>
        </header>
        <div className="progress-badge-grid">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <article
                className={`progress-badge-card panel ${badge.status} reveal-card`}
                style={{ "--reveal-delay": `${240 + index * 75}ms` } as CSSProperties}
                key={badge.name}
              >
                <div className="badge-icon">
                  <Icon size={24} />
                </div>
                {badge.status === "earned" ? (
                  <span className="badge-status earned">
                    <Check size={13} /> Earned
                  </span>
                ) : (
                  <span className="badge-status locked">
                    <LockKeyhole size={12} /> {badge.status === "locked" ? "Locked" : "In progress"}
                  </span>
                )}
                <h3>{badge.name}</h3>
                <p>{badge.detail}</p>
                {badge.status === "in-progress" && (
                  <div className="badge-progress">
                    <span style={{ width: "60%" }} />
                  </div>
                )}
                <small>{badge.progress}</small>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function WeeklyScoreChart() {
  return (
    <div className="weekly-score-chart">
      <div className="weekly-score-chart-heading">
        <span>DAILY SNAPSHOT</span>
        <small>Past 7 days</small>
      </div>
      <div className="weekly-score-bars" aria-label="Health score by day">
        {weeklyScores.map((item, index) => (
          <div className="weekly-score-column" key={`${item.day}-${index}`}>
            <span
              className={`weekly-score-bar ${index === 6 ? "current" : ""}`}
              style={
                {
                  "--bar-height": `${item.value}%`,
                  "--bar-delay": `${450 + index * 60}ms`,
                } as CSSProperties
              }
            />
            <small>{item.day}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <main className="dashboard support-screen support-skeleton">
      <section className="support-page-heading">
        <div>
          <div className="skeleton-block support-sk-eyebrow" />
          <div className="skeleton-block support-sk-title" />
          <div className="skeleton-block support-sk-copy" />
        </div>
      </section>
      <div className="progress-hero-grid">
        <div className="skeleton-block progress-sk-card" />
        <div className="skeleton-block progress-sk-card" />
        <div className="skeleton-block progress-sk-wide" />
      </div>
      <div className="progress-badge-grid">
        {[0, 1, 2, 3].map((item) => (
          <div className="skeleton-block progress-sk-badge" key={item} />
        ))}
      </div>
    </main>
  );
}
