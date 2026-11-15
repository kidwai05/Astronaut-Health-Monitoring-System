import { useEffect, useState, type CSSProperties } from "react";
import {
  BedDouble,
  Check,
  Clock3,
  Lightbulb,
  Minus,
  Moon,
  Plus,
  Save,
  Star,
  Sunrise,
} from "lucide-react";
import { StatusChip } from "./VitalisUI";

const nights = [
  { day: "MON", hours: 7.8, quality: 4 },
  { day: "TUE", hours: 7.2, quality: 4 },
  { day: "WED", hours: 6.9, quality: 3 },
  { day: "THU", hours: 7.5, quality: 4 },
  { day: "FRI", hours: 6.4, quality: 3 },
  { day: "SAT", hours: 6.1, quality: 2 },
  { day: "SUN", hours: 6.67, quality: 3 },
];

export function SleepTracker({ onNotify }: { onNotify: (message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [quality, setQuality] = useState(3);
  const [bedtime, setBedtime] = useState("22:40");
  const [wakeTime, setWakeTime] = useState("05:20");
  const [interruptions, setInterruptions] = useState(2);
  const [chartMode, setChartMode] = useState<"duration" | "quality">("duration");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setLoading(false), reduced ? 250 : 1000);
    return () => clearTimeout(timer);
  }, []);

  const save = () => {
    if (saveState !== "idle") return;
    setSaveState("saving");
    setTimeout(() => setSaveState("saved"), 450);
    setTimeout(() => {
      setSaveState("idle");
      onNotify("Sleep log saved locally");
    }, 1250);
  };

  if (loading) return <SleepSkeleton />;

  return (
    <main className="dashboard sleep-screen">
      <section className="sleep-heading page-entrance">
        <div>
          <p className="eyebrow">RECOVERY & REST</p>
          <h1>Sleep Tracker</h1>
          <p>Monitor sleep duration, quality, and recovery against your personal baseline.</p>
        </div>
        <StatusChip tone="caution" label="Recovery shifting" />
      </section>

      <section
        className="last-sleep-card panel reveal-card"
        style={{ "--reveal-delay": "60ms" } as CSSProperties}
      >
        <div className="sleep-summary-copy">
          <span className="sleep-card-icon">
            <Moon size={24} />
          </span>
          <div>
            <span className="panel-kicker">LAST NIGHT</span>
            <div className="sleep-duration">
              <strong>6h 40m</strong>
              <span>of 8h goal</span>
            </div>
            <div className="sleep-stars" aria-label="Sleep quality 3 out of 5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={20} className={star <= 3 ? "filled" : ""} />
              ))}
              <span>Fair quality</span>
            </div>
            <div className="sleep-summary-status">
              <StatusChip tone="caution" label="48m below goal" />
            </div>
          </div>
        </div>
        <SleepRing value={83} />
        <div className="sleep-summary-stats">
          <div>
            <Clock3 size={18} />
            <span>
              <small>Time asleep</small>
              <strong>6h 40m</strong>
            </span>
          </div>
          <div>
            <Sunrise size={18} />
            <span>
              <small>Wake time</small>
              <strong>05:20 MLT</strong>
            </span>
          </div>
          <div>
            <BedDouble size={18} />
            <span>
              <small>Interruptions</small>
              <strong>2 events</strong>
            </span>
          </div>
        </div>
      </section>

      <div className="sleep-section-heading page-entrance">
        <span className="section-number">01</span>
        <div>
          <span className="panel-kicker">WEEKLY PATTERN</span>
          <h2>See what is affecting recovery</h2>
          <p>Compare duration and quality across the last seven sleep periods.</p>
        </div>
      </div>

      <section className="sleep-insights-grid">
        <article
          className="sleep-chart-card panel reveal-card"
          style={{ "--reveal-delay": "120ms" } as CSSProperties}
        >
          <header className="sleep-chart-header">
            <div>
              <span className="panel-kicker">7-DAY DURATION</span>
              <h2>Sleep consistency</h2>
            </div>
            <div className="sleep-chart-controls">
              <div className="chart-mode-toggle">
                <button
                  className={chartMode === "duration" ? "active" : ""}
                  onClick={() => setChartMode("duration")}
                >
                  Duration
                </button>
                <button
                  className={chartMode === "quality" ? "active" : ""}
                  onClick={() => setChartMode("quality")}
                >
                  Quality
                </button>
              </div>
              <div className="chart-average">
                <small>AVERAGE</small>
                <strong>{chartMode === "duration" ? "6h 56m" : "3.3 / 5"}</strong>
              </div>
            </div>
          </header>
          <div className={`sleep-bar-chart ${chartMode}`}>
            <div className="recommended-band">
              <span>{chartMode === "duration" ? "RECOMMENDED 7–9H" : "GOOD QUALITY 4–5"}</span>
            </div>
            <div className="sleep-grid-lines">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="sleep-y-axis">
              {chartMode === "duration" ? (
                <>
                  <span>10h</span>
                  <span>7h</span>
                  <span>4h</span>
                  <span>0h</span>
                </>
              ) : (
                <>
                  <span>5</span>
                  <span>4</span>
                  <span>2</span>
                  <span>0</span>
                </>
              )}
            </div>
            <div className="sleep-bars">
              {nights.map((night, index) => {
                const value = chartMode === "duration" ? night.hours : night.quality;
                const low = chartMode === "duration" ? night.hours < 7 : night.quality < 4;
                return (
                  <div className="sleep-bar-column" key={night.day}>
                    <div className="bar-value">
                      {chartMode === "duration"
                        ? `${night.hours.toFixed(1)}h`
                        : `${night.quality}/5`}
                    </div>
                    <div
                      className={`sleep-bar ${low ? "low" : ""}`}
                      style={
                        {
                          "--bar-height": `${
                            chartMode === "duration" ? night.hours * 9 : night.quality * 18
                          }%`,
                          "--bar-delay": `${350 + index * 50}ms`,
                        } as CSSProperties
                      }
                    />
                    <span>{night.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="sleep-chart-legend">
            <span>
              <i className="legend-goal" /> Recommended range
            </span>
            <span>
              <i className="legend-low" /> Below 7 hours
            </span>
          </div>
        </article>

        <aside
          className="sleep-debt-card panel reveal-card"
          style={{ "--reveal-delay": "180ms" } as CSSProperties}
        >
          <span className="debt-icon">
            <Moon size={23} />
          </span>
          <span className="panel-kicker">SLEEP DEBT</span>
          <div className="debt-value">3h 10m</div>
          <p>Accumulated below your 8-hour nightly goal over the last 7 days.</p>
          <div className="debt-trend">
            <svg viewBox="0 0 180 55" preserveAspectRatio="none">
              <path className="debt-area" d="M0 46L30 39 60 42 90 31 120 24 150 15 180 8V55H0Z" />
              <polyline pathLength="1" points="0,46 30,39 60,42 90,31 120,24 150,15 180,8" />
            </svg>
            <span>
              <strong>+42m</strong> this week
            </span>
          </div>
          <StatusChip tone="caution" label="Needs recovery" />
        </aside>
      </section>

      <div className="sleep-section-heading page-entrance">
        <span className="section-number">02</span>
        <div>
          <span className="panel-kicker">ADD A SLEEP PERIOD</span>
          <h2>Log last night clearly</h2>
          <p>Confirm times, rate quality, and record any interruptions.</p>
        </div>
      </div>

      <section className="sleep-bottom-grid">
        <article
          className="sleep-log-card panel reveal-card"
          style={{ "--reveal-delay": "240ms" } as CSSProperties}
        >
          <header>
            <div>
              <span className="panel-kicker">MANUAL ENTRY</span>
              <h2>Sleep details</h2>
            </div>
            <span className="local-time-chip">
              <Clock3 size={15} /> Mission local time
            </span>
          </header>
          <div className="sleep-form-grid">
            <label className="time-field">
              <span>
                <b>1</b>
                <Moon size={17} /> Bedtime
              </span>
              <input
                type="time"
                value={bedtime}
                onChange={(event) => setBedtime(event.target.value)}
              />
            </label>
            <label className="time-field">
              <span>
                <b>2</b>
                <Sunrise size={17} /> Wake time
              </span>
              <input
                type="time"
                value={wakeTime}
                onChange={(event) => setWakeTime(event.target.value)}
              />
            </label>
            <fieldset className="quality-field">
              <legend>
                <b>3</b> Sleep quality
              </legend>
              <div>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    className={quality === value ? "active" : ""}
                    onClick={() => setQuality(value)}
                  >
                    <Star size={21} />
                    <span>{value}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="interruptions-field">
              <span>
                <strong>
                  <b>4</b> Interruptions
                </strong>
                <small>Times you woke during sleep</small>
              </span>
              <div>
                <button onClick={() => setInterruptions((value) => Math.max(0, value - 1))}>
                  <Minus size={21} />
                </button>
                <strong key={interruptions}>{interruptions}</strong>
                <button onClick={() => setInterruptions((value) => Math.min(12, value + 1))}>
                  <Plus size={21} />
                </button>
              </div>
            </div>
          </div>
          <button className={`save-sleep-button ${saveState}`} onClick={save}>
            {saveState === "saved" ? <Check size={21} /> : <Save size={20} />}
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Sleep log saved"
                : "Save sleep log"}
            <i />
          </button>
        </article>

        <article
          className="sleep-tip-card reveal-card"
          style={{ "--reveal-delay": "300ms" } as CSSProperties}
        >
          <span className="tip-icon">
            <Lightbulb size={23} />
          </span>
          <span className="panel-kicker">HABITAT SLEEP TIP</span>
          <h2>Prepare your sleep environment</h2>
          <p>
            Dim cabin lighting 60 minutes before bed, secure loose equipment, and keep ventilation
            noise consistent.
          </p>
          <ul>
            <li>Use your eye mask</li>
            <li>Set cabin temperature to 19–21°C</li>
            <li>Avoid caffeine within 6 hours</li>
          </ul>
          <button onClick={() => onNotify("Habitat sleep guidance opened")}>
            View sleep hygiene guide
          </button>
        </article>
      </section>
    </main>
  );
}

function SleepRing({ value }: { value: number }) {
  return (
    <div className="sleep-ring">
      <svg viewBox="0 0 124 124">
        <circle className="sleep-ring-track" cx="62" cy="62" r="51" />
        <circle
          className="sleep-ring-progress"
          cx="62"
          cy="62"
          r="51"
          pathLength="1"
          style={{ "--ring-offset": 1 - value / 100 } as CSSProperties}
        />
      </svg>
      <div>
        <strong>{value}%</strong>
        <span>of goal</span>
      </div>
    </div>
  );
}

function SleepSkeleton() {
  return (
    <main className="dashboard sleep-screen sleep-skeleton">
      <section className="sleep-heading">
        <div>
          <div className="skeleton-block sleep-sk-eyebrow" />
          <div className="skeleton-block sleep-sk-title" />
          <div className="skeleton-block sleep-sk-copy" />
        </div>
      </section>
      <div className="skeleton-block sleep-sk-summary" />
      <section className="sleep-insights-grid">
        <div className="skeleton-block sleep-sk-chart" />
        <div className="skeleton-block sleep-sk-debt" />
      </section>
      <section className="sleep-bottom-grid">
        <div className="skeleton-block sleep-sk-form" />
        <div className="skeleton-block sleep-sk-tip" />
      </section>
    </main>
  );
}
