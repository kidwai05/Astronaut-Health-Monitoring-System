import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Check,
  ChevronRight,
  Clock3,
  HeartHandshake,
  LockKeyhole,
  MessageCircleHeart,
  Save,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const moods = [
  { face: "😞", label: "Very low" },
  { face: "🙁", label: "Low" },
  { face: "😐", label: "Okay" },
  { face: "🙂", label: "Good" },
  { face: "😊", label: "Great" },
];
const tags = ["Isolated", "Tired", "Motivated", "Anxious", "Crew conflict", "High workload"];
const trend = [3, 4, 4, 3, 4, 5, 4, 4, 3, 3, 4, 4, 3, 4];

export function MoodCheckin({ onNotify }: { onNotify: (message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState(4);
  const [stress, setStress] = useState(4);
  const [energy, setEnergy] = useState(6);
  const [selectedTags, setSelectedTags] = useState<string[]>(["Tired"]);
  const [journal, setJournal] = useState("");
  const [touched, setTouched] = useState({ mood: true, stress: false, energy: false, tags: true });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setLoading(false), reduced ? 250 : 1000);
    return () => clearTimeout(timer);
  }, []);

  const progress = useMemo(() => Object.values(touched).filter(Boolean).length * 25, [touched]);
  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
    setTouched((value) => ({ ...value, tags: true }));
  };
  const save = () => {
    if (saveState !== "idle") return;
    setSaveState("saving");
    setTimeout(() => setSaveState("saved"), 450);
    setTimeout(() => {
      setSaveState("idle");
      onNotify("Private wellbeing check-in saved locally");
    }, 1300);
  };

  if (loading) return <MoodSkeleton />;

  return (
    <main className="dashboard mood-screen">
      <section className="mood-heading page-entrance">
        <div>
          <p className="eyebrow">BEHAVIOURAL HEALTH</p>
          <h1>How are you feeling?</h1>
          <p>A brief private check-in to help you notice patterns over time.</p>
        </div>
        <div className="privacy-chip">
          <LockKeyhole size={17} />
          <span>Private to you</span>
        </div>
      </section>

      <section
        className="checkin-progress-card reveal-card"
        style={{ "--reveal-delay": "60ms" } as CSSProperties}
      >
        <span className="checkin-clock">
          <Clock3 size={22} />
        </span>
        <div>
          <span className="panel-kicker">30-SECOND DAILY CHECK-IN</span>
          <strong>{progress === 100 ? "Ready to save" : "A few quick reflections"}</strong>
        </div>
        <div className="checkin-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <b>{progress}%</b>
      </section>

      <div className="mood-section-heading page-entrance">
        <span className="mood-section-number">01</span>
        <div>
          <span className="panel-kicker">CURRENT STATE</span>
          <h2>Check in with yourself</h2>
          <p>Choose the response that feels closest right now. There are no wrong answers.</p>
        </div>
      </div>

      <section className="mood-form-layout">
        <article
          className="mood-scale-card panel reveal-card"
          style={{ "--reveal-delay": "120ms" } as CSSProperties}
        >
          <header>
            <div>
              <span className="form-question-number">01</span>
              <div>
                <span className="panel-kicker">MOOD</span>
                <h2>Overall, how do you feel?</h2>
              </div>
            </div>
            <strong>{moods[mood - 1].label}</strong>
          </header>
          <div className="mood-selector-layout">
            <div className="mood-focus">
              <div className="mood-focus-rings">
                <span className="mood-focus-emoji" key={mood}>
                  {moods[mood - 1].face}
                </span>
                <i />
                <i />
                <i />
              </div>
              <span className="panel-kicker">CURRENT MOOD</span>
              <strong>{moods[mood - 1].label}</strong>
              <small>{mood} of 5</small>
            </div>
            <div className="large-mood-scale">
              {moods.map((item, index) => (
                <button
                  key={item.label}
                  className={mood === index + 1 ? "active" : ""}
                  onClick={() => {
                    setMood(index + 1);
                    setTouched((value) => ({ ...value, mood: true }));
                  }}
                >
                  <span>{item.face}</span>
                  <strong>{item.label}</strong>
                  <small>{index + 1}</small>
                </button>
              ))}
            </div>
          </div>
        </article>

        <article
          className="wellbeing-sliders panel reveal-card"
          style={{ "--reveal-delay": "180ms" } as CSSProperties}
        >
          <header>
            <span className="form-question-number">02</span>
            <div>
              <span className="panel-kicker">CURRENT STATE</span>
              <h2>Stress & energy</h2>
            </div>
          </header>
          <WellbeingSlider
            icon={<Sparkles size={19} />}
            label="Stress"
            value={stress}
            low="Calm"
            high="Overwhelmed"
            tone="stress"
            onChange={(value) => {
              setStress(value);
              setTouched((current) => ({ ...current, stress: true }));
            }}
          />
          <WellbeingSlider
            icon={<Zap size={19} />}
            label="Energy"
            value={energy}
            low="Depleted"
            high="Energized"
            tone="energy"
            onChange={(value) => {
              setEnergy(value);
              setTouched((current) => ({ ...current, energy: true }));
            }}
          />
        </article>

        <article
          className="mood-context-card panel reveal-card"
          style={{ "--reveal-delay": "240ms" } as CSSProperties}
        >
          <header>
            <span className="form-question-number">03</span>
            <div>
              <span className="panel-kicker">CONTEXT</span>
              <h2>What is influencing today?</h2>
            </div>
          </header>
          <div className="mood-tags">
            {tags.map((tag, index) => (
              <button
                key={tag}
                className={selectedTags.includes(tag) ? "selected" : ""}
                style={{ "--tag-delay": `${300 + index * 50}ms` } as CSSProperties}
                onClick={() => toggleTag(tag)}
              >
                {selectedTags.includes(tag) && <Check size={15} />}
                {tag}
              </button>
            ))}
          </div>
        </article>

        <article
          className="journal-card panel reveal-card"
          style={{ "--reveal-delay": "300ms" } as CSSProperties}
        >
          <header>
            <span className="journal-lock">
              <LockKeyhole size={19} />
            </span>
            <div>
              <span className="panel-kicker">OPTIONAL · PRIVATE</span>
              <h2>Journal note</h2>
            </div>
            <ShieldCheck size={20} />
          </header>
          <textarea
            value={journal}
            onChange={(event) => setJournal(event.target.value)}
            placeholder="Write anything you want to remember about today…"
            maxLength={500}
          />
          <div>
            <span>Encrypted on this device</span>
            <b>{journal.length} / 500</b>
          </div>
        </article>
      </section>

      <div className="mood-section-heading page-entrance">
        <span className="mood-section-number">02</span>
        <div>
          <span className="panel-kicker">PRIVATE REFLECTION</span>
          <h2>Review and save your check-in</h2>
          <p>Context and journal notes stay private on this device.</p>
        </div>
      </div>

      <div
        className="mood-save-row reveal-card"
        style={{ "--reveal-delay": "340ms" } as CSSProperties}
      >
        <span>
          <LockKeyhole size={17} /> Your journal is not included in crew reports.
        </span>
        <button className={`save-mood-button ${saveState}`} onClick={save}>
          {saveState === "saved" ? <Check size={21} /> : <Save size={20} />}
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Check-in saved"
              : "Save check-in"}
          <i />
        </button>
      </div>

      <div className="mood-section-heading page-entrance">
        <span className="mood-section-number">03</span>
        <div>
          <span className="panel-kicker">PATTERNS & SUPPORT</span>
          <h2>Notice change without judgment</h2>
          <p>Your private trend can help you decide when additional support would be useful.</p>
        </div>
      </div>

      <section className="mood-insights-grid">
        <article
          className="mood-trend-card panel reveal-card"
          style={{ "--reveal-delay": "400ms" } as CSSProperties}
        >
          <header>
            <div>
              <span className="panel-kicker">14-DAY TREND</span>
              <h2>Mood has remained steady</h2>
            </div>
            <span className="trend-average">
              AVG <strong>3.7 / 5</strong>
            </span>
          </header>
          <div className="mood-line-chart">
            <div className="mood-baseline">
              <span>PERSONAL RANGE</span>
            </div>
            <div className="mood-y-labels">
              <span>Great</span>
              <span>Okay</span>
              <span>Low</span>
            </div>
            <svg viewBox="0 0 700 190" preserveAspectRatio="none">
              <defs>
                <linearGradient id="moodArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--accent-secondary)" stopOpacity=".24" />
                  <stop offset="1" stopColor="var(--accent-secondary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                className="mood-area"
                d="M0 100L54 60 108 60 162 100 215 60 269 20 323 60 377 60 431 100 485 100 538 60 592 60 646 100 700 60V190H0Z"
              />
              <polyline
                className="mood-line"
                pathLength="1"
                points="0,100 54,60 108,60 162,100 215,60 269,20 323,60 377,60 431,100 485,100 538,60 592,60 646,100 700,60"
              />
              {trend.map((value, index) => {
                const x = (index / 13) * 700;
                const y = 180 - value * 40;
                return (
                  <circle
                    key={index}
                    className={hoveredPoint === index ? "active" : ""}
                    style={{ "--point-delay": `${1050 + index * 45}ms` } as CSSProperties}
                    cx={x}
                    cy={y}
                    r="5"
                    onMouseEnter={() => setHoveredPoint(index)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </svg>
            {hoveredPoint !== null && (
              <div
                className="mood-chart-tooltip"
                style={{ left: `${(hoveredPoint / 13) * 86 + 9}%` }}
              >
                <strong>Day {hoveredPoint + 1}</strong>
                <span>{trend[hoveredPoint]} / 5</span>
              </div>
            )}
            <div className="mood-x-labels">
              <span>14 days ago</span>
              <span>7 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </article>

        <article
          className="support-card reveal-card"
          style={{ "--reveal-delay": "460ms" } as CSSProperties}
        >
          <span className="support-icon">
            <HeartHandshake size={26} />
          </span>
          <span className="panel-kicker">SUPPORT IS AVAILABLE</span>
          <h2>You do not have to manage everything alone.</h2>
          <p>
            A private conversation with the behavioural health team is always available, even if you
            simply want to talk.
          </p>
          <button onClick={() => onNotify("Private support options opened")}>
            <MessageCircleHeart size={20} /> I'd like to talk to someone <ChevronRight size={18} />
          </button>
          <small>This does not trigger an emergency alert.</small>
        </article>
      </section>
    </main>
  );
}

function WellbeingSlider({
  icon,
  label,
  value,
  low,
  high,
  tone,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  low: string;
  high: string;
  tone: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className={`wellbeing-slider ${tone}`}>
      <span className="slider-title">
        <i>{icon}</i>
        <strong>{label}</strong>
        <output>{value} / 10</output>
      </span>
      <div className="mood-slider-track">
        <span className="slider-bubble" style={{ left: `${value * 10}%` }}>
          {value}
        </span>
        <input
          type="range"
          min="0"
          max="10"
          value={value}
          onChange={(event) => onChange(+event.target.value)}
          style={{ "--slider-value": `${value * 10}%` } as CSSProperties}
        />
      </div>
      <span className="slider-end-labels">
        <small>{low}</small>
        <small>{high}</small>
      </span>
    </label>
  );
}

function MoodSkeleton() {
  return (
    <main className="dashboard mood-screen mood-skeleton">
      <section className="mood-heading">
        <div>
          <div className="skeleton-block mood-sk-eyebrow" />
          <div className="skeleton-block mood-sk-title" />
          <div className="skeleton-block mood-sk-copy" />
        </div>
      </section>
      <div className="skeleton-block mood-sk-progress" />
      <section className="mood-form-layout">
        <div className="skeleton-block mood-sk-scale" />
        <div className="skeleton-block mood-sk-sliders" />
        <div className="skeleton-block mood-sk-context" />
        <div className="skeleton-block mood-sk-journal" />
      </section>
      <section className="mood-insights-grid">
        <div className="skeleton-block mood-sk-chart" />
        <div className="skeleton-block mood-sk-support" />
      </section>
    </main>
  );
}
