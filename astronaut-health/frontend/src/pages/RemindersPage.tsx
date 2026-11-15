import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  BellRing,
  Check,
  CheckCircle2,
  Clock3,
  Droplets,
  Dumbbell,
  HeartPulse,
  Moon,
  Plus,
  Smile,
  X,
} from "lucide-react";
import { useModalFocus } from "../components/VitalisUI";

type Reminder = {
  id: number;
  title: string;
  time: string;
  enabled: boolean;
  done: boolean;
  kind: "vitals" | "exercise" | "sleep" | "mood" | "hydration" | "custom";
};

const initialReminders: Reminder[] = [
  { id: 1, title: "Morning vitals", time: "06:30", enabled: true, done: true, kind: "vitals" },
  {
    id: 2,
    title: "Exercise · 60 min",
    time: "10:00",
    enabled: true,
    done: false,
    kind: "exercise",
  },
  { id: 3, title: "Sleep log", time: "20:30", enabled: true, done: false, kind: "sleep" },
  { id: 4, title: "Mood check-in", time: "08:00", enabled: true, done: true, kind: "mood" },
  { id: 5, title: "Hydration", time: "09:30", enabled: true, done: false, kind: "hydration" },
];

const reminderIcons = {
  vitals: HeartPulse,
  exercise: Dumbbell,
  sleep: Moon,
  mood: Smile,
  hydration: Droplets,
  custom: BellRing,
};

export function RemindersPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState(initialReminders);
  const [addOpen, setAddOpen] = useState(false);
  const modalRef = useRef<HTMLElement>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("12:00");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setLoading(false), reduced ? 250 : 850);
    return () => window.clearTimeout(timer);
  }, []);
  useModalFocus(modalRef, addOpen, () => setAddOpen(false));

  const toggleReminder = (id: number) => {
    setReminders((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, enabled: !item.enabled, done: item.enabled ? false : item.done }
          : item,
      ),
    );
  };

  const toggleDone = (id: number) => {
    setReminders((items) =>
      items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  };

  const addReminder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setReminders((items) => [
      ...items,
      { id: Date.now(), title, time: newTime, enabled: true, done: false, kind: "custom" },
    ]);
    setNewTitle("");
    setAddOpen(false);
    onNotify("Reminder added to today's checklist");
  };

  if (loading) return <RemindersSkeleton />;

  const completed = reminders.filter((reminder) => reminder.done).length;
  const enabled = reminders.filter((reminder) => reminder.enabled).length;
  const progress = reminders.length ? (completed / reminders.length) * 100 : 0;

  return (
    <main className="dashboard support-screen reminders-screen">
      <section className="support-page-heading page-entrance">
        <div>
          <p className="eyebrow">DAILY ROUTINE</p>
          <h1>Reminders</h1>
          <p>A few small check-ins can support a steady mission rhythm.</p>
        </div>
        <button className="primary-button support-primary-button" onClick={() => setAddOpen(true)}>
          <Plus size={19} />
          Add reminder
        </button>
      </section>

      <section
        className="reminder-overview panel reveal-card"
        style={{ "--reveal-delay": "40ms" } as CSSProperties}
      >
        <div className="reminder-overview-icon">
          <CheckCircle2 size={22} />
        </div>
        <div className="reminder-overview-copy">
          <span className="panel-kicker">TODAY'S CHECKLIST</span>
          <h2>
            {completed === reminders.length
              ? "A complete day. Nicely done."
              : "One step at a time."}
          </h2>
          <p>
            {completed} of {reminders.length} check-ins complete · {enabled} reminders on
          </p>
        </div>
        <div className="reminder-progress-wrap">
          <div className="reminder-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <span>{Math.round(progress)}%</span>
        </div>
      </section>

      <div className="reminders-content-grid">
        <section className="reminders-list-panel panel">
          <header className="support-panel-heading">
            <div>
              <span className="panel-kicker">SUNDAY · MISSION DAY 142</span>
              <h2>Today's plan</h2>
            </div>
            <span className="reminders-date-chip">
              <Clock3 size={15} /> MLT
            </span>
          </header>
          <div className="reminder-list" aria-label="Today's reminders">
            {reminders.map((reminder, index) => {
              const Icon = reminderIcons[reminder.kind];
              return (
                <article
                  className={`daily-reminder-row ${reminder.done ? "completed" : ""} ${!reminder.enabled ? "disabled" : ""} reveal-card`}
                  style={{ "--reveal-delay": `${100 + index * 65}ms` } as CSSProperties}
                  key={reminder.id}
                >
                  <button
                    className="daily-reminder-check"
                    aria-label={`${reminder.done ? "Mark incomplete" : "Mark complete"}: ${reminder.title}`}
                    aria-pressed={reminder.done}
                    disabled={!reminder.enabled}
                    onClick={() => toggleDone(reminder.id)}
                  >
                    {reminder.done && <Check size={18} strokeWidth={3} />}
                  </button>
                  <span className={`daily-reminder-icon ${reminder.kind}`}>
                    <Icon size={20} />
                  </span>
                  <div className="daily-reminder-copy">
                    <h3>{reminder.title}</h3>
                    <span>
                      <Clock3 size={13} /> {reminder.time} MLT
                    </span>
                  </div>
                  <button
                    className={`reminder-switch ${reminder.enabled ? "on" : ""}`}
                    role="switch"
                    aria-checked={reminder.enabled}
                    aria-label={`${reminder.enabled ? "Turn off" : "Turn on"} ${reminder.title} reminder`}
                    onClick={() => toggleReminder(reminder.id)}
                  >
                    <i />
                  </button>
                </article>
              );
            })}
          </div>
          <button className="add-reminder-inline" onClick={() => setAddOpen(true)}>
            <Plus size={17} /> Add another reminder
          </button>
        </section>

        <aside className="reminders-side-column">
          <article
            className="routine-tip-card panel reveal-card"
            style={{ "--reveal-delay": "220ms" } as CSSProperties}
          >
            <span className="routine-tip-icon">
              <BellRing size={20} />
            </span>
            <span className="panel-kicker">A GENTLE NUDGE</span>
            <h2>Build your routine around your day.</h2>
            <p>
              Reminders are yours to adjust. A missed check-in is simply a chance to pick it up when
              it suits you.
            </p>
            <div className="routine-tip-footer">
              <span>Next reminder</span>
              <strong>Exercise · 10:00 MLT</strong>
            </div>
          </article>
          <article
            className="reminder-week-card panel reveal-card"
            style={{ "--reveal-delay": "300ms" } as CSSProperties}
          >
            <header>
              <div>
                <span className="panel-kicker">THIS WEEK</span>
                <h2>Daily check-ins</h2>
              </div>
              <strong>78%</strong>
            </header>
            <div className="reminder-week-bars" aria-label="Weekly reminder completion">
              {[
                ["M", 62],
                ["T", 82],
                ["W", 74],
                ["T", 90],
                ["F", 68],
                ["S", 84],
                ["S", 78],
              ].map(([day, height], index) => (
                <div className="reminder-week-column" key={`${day}-${index}`}>
                  <span
                    className="reminder-week-bar"
                    style={
                      {
                        "--bar-height": `${height}%`,
                        "--bar-delay": `${350 + index * 65}ms`,
                      } as CSSProperties
                    }
                  />
                  <small>{day}</small>
                </div>
              ))}
            </div>
            <p>You're finding a rhythm that works for you.</p>
          </article>
        </aside>
      </div>

      {addOpen && (
        <div
          className="support-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAddOpen(false);
          }}
        >
          <section
            ref={modalRef}
            className="support-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-reminder-title"
          >
            <header>
              <div>
                <span className="panel-kicker">DAILY ROUTINE</span>
                <h2 id="add-reminder-title">Add a reminder</h2>
              </div>
              <button
                className="support-modal-close"
                aria-label="Close dialog"
                onClick={() => setAddOpen(false)}
              >
                <X size={20} />
              </button>
            </header>
            <form onSubmit={addReminder}>
              <label className="support-form-field">
                Reminder name
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="e.g. Stretch break"
                  maxLength={50}
                  required
                />
              </label>
              <label className="support-form-field">
                Time
                <input
                  type="time"
                  value={newTime}
                  onChange={(event) => setNewTime(event.target.value)}
                  required
                />
              </label>
              <div className="support-modal-actions">
                <button
                  className="support-secondary-button"
                  type="button"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  <Plus size={17} /> Add reminder
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function RemindersSkeleton() {
  return (
    <main className="dashboard support-screen support-skeleton">
      <section className="support-page-heading">
        <div>
          <div className="skeleton-block support-sk-eyebrow" />
          <div className="skeleton-block support-sk-title" />
          <div className="skeleton-block support-sk-copy" />
        </div>
        <div className="skeleton-block support-sk-button" />
      </section>
      <div className="skeleton-block reminder-sk-overview" />
      <div className="reminders-content-grid">
        <div className="skeleton-block reminder-sk-list" />
        <div className="skeleton-block reminder-sk-side" />
      </div>
    </main>
  );
}
