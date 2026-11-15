import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Bone,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  CloudOff,
  Droplets,
  Eye,
  HeartPulse,
  ListChecks,
  Moon,
  OctagonAlert,
  PhoneCall,
  Radiation,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { StatusChip, useModalFocus } from "./VitalisUI";

const topics = [
  {
    name: "Bone and muscle",
    icon: Bone,
    title: "Reduced resistance performance",
    current: "84",
    unit: "%",
    baseline: "90–100%",
    change: "−6%",
    tone: "caution" as const,
    summary: "Lower-body resistance output has declined across the last three sessions.",
    meaning:
      "Reduced output can follow workload accumulation, inadequate recovery, or early musculoskeletal deconditioning.",
    signal: [92, 91, 90, 89, 87, 86, 84],
    actions: [
      "Complete the prescribed recovery block",
      "Review resistance-device form",
      "Prioritize protein and hydration",
    ],
    criteria: [
      "New focal bone pain",
      "Loss of strength on one side",
      "Swelling or reduced range",
      "Pain that changes movement",
    ],
  },
  {
    name: "Hydration",
    icon: Droplets,
    title: "Hydration check-in due",
    current: "1",
    unit: "entry",
    baseline: "Mission plan",
    change: "Due",
    tone: "caution" as const,
    summary: "A scheduled hydration entry has not been recorded yet.",
    meaning:
      "Regular hydration supports normal function. Follow the mission fluid plan and consider recent activity and cabin conditions.",
    signal: [4, 5, 5, 4, 5, 4, 3],
    actions: [
      "Drink fluids according to the mission plan",
      "Log your intake when convenient",
      "Review any symptoms with the flight surgeon",
    ],
    criteria: [
      "Persistent dizziness",
      "Very dark urine",
      "Unable to keep fluids down",
      "New confusion or weakness",
    ],
  },
  {
    name: "Heart",
    icon: HeartPulse,
    title: "Rising resting heart rate",
    current: "72",
    unit: "bpm",
    baseline: "62–68 bpm",
    change: "+8%",
    tone: "caution" as const,
    summary: "Resting heart rate has risen gradually and is now above your personal baseline.",
    meaning:
      "A gradual rise can reflect reduced recovery, dehydration, disrupted sleep, stress, or recent workload.",
    signal: [64, 65, 64, 66, 68, 70, 72],
    actions: [
      "Pause and recover for five minutes",
      "Hydrate according to mission protocol",
      "Review sleep and recent workload",
    ],
    criteria: [
      "Chest pain or pressure",
      "Shortness of breath",
      "Faintness or confusion",
      "Fever above 38°C",
    ],
  },
  {
    name: "Sleep",
    icon: Moon,
    title: "Sleep duration below recovery range",
    current: "6h 40m",
    unit: "",
    baseline: "7–9 hours",
    change: "−48m",
    tone: "caution" as const,
    summary: "Sleep duration has stayed below your recovery range for two nights.",
    meaning:
      "Short sleep can increase fatigue, affect mood, and reduce physical and cognitive recovery.",
    signal: [7.8, 7.6, 7.4, 7.2, 6.9, 6.5, 6.67],
    actions: [
      "Protect the next sleep opportunity",
      "Dim habitat lighting before bed",
      "Review caffeine and workload timing",
    ],
    criteria: [
      "Unable to sleep for 24 hours",
      "Confusion or unsafe fatigue",
      "Breathing interruptions",
      "Severe headache on waking",
    ],
  },
  {
    name: "Stress",
    icon: Brain,
    title: "Sustained stress load",
    current: "7",
    unit: "/10",
    baseline: "2–5 /10",
    change: "+2",
    tone: "caution" as const,
    summary: "Self-reported stress has remained above your usual range for three days.",
    meaning: "Persistent stress can affect sleep, attention, communication, and physical recovery.",
    signal: [4, 4, 5, 5, 6, 7, 7],
    actions: [
      "Use the two-minute breathing protocol",
      "Reduce nonessential task switching",
      "Request a private support check-in",
    ],
    criteria: [
      "Thoughts of self-harm",
      "Panic that does not settle",
      "Unable to perform safely",
      "Severe crew conflict",
    ],
  },
  {
    name: "Radiation",
    icon: Radiation,
    title: "Radiation exposure status",
    current: "Low",
    unit: "",
    baseline: "Mission limits",
    change: "Stable",
    tone: "normal" as const,
    summary: "Current cumulative exposure remains within the planned mission envelope.",
    meaning:
      "Radiation risk varies with solar activity, shielding location, and cumulative mission exposure.",
    signal: [28, 29, 29, 30, 30, 31, 31],
    actions: ["Keep dosimeter attached", "Confirm shelter route", "Follow solar-weather notices"],
    criteria: [
      "Solar particle event alarm",
      "Dosimeter fault",
      "Unexpected exposure spike",
      "Shelter instruction received",
    ],
  },
  {
    name: "Eyes",
    icon: Eye,
    title: "Vision change in microgravity",
    current: "2",
    unit: "/5",
    baseline: "No symptoms",
    change: "New",
    tone: "caution" as const,
    summary: "Mild vision change and dryness were logged during the current mission week.",
    meaning:
      "Vision changes can be related to dryness, workload, or spaceflight-associated fluid shifts.",
    signal: [0, 0, 1, 1, 1, 2, 2],
    actions: [
      "Pause near-vision work",
      "Use approved eye lubrication",
      "Repeat the vision self-check",
    ],
    criteria: [
      "Sudden vision loss",
      "New flashing lights",
      "Severe eye pain",
      "One-sided visual change",
    ],
  },
  {
    name: "Infection",
    icon: ShieldPlus,
    title: "Infection monitoring",
    current: "36.7",
    unit: "°C",
    baseline: "36.3–37.0°C",
    change: "Stable",
    tone: "normal" as const,
    summary: "Temperature and reported symptoms are currently within your normal range.",
    meaning:
      "Temperature, resting heart rate, and symptom clusters are reviewed together for early change.",
    signal: [36.5, 36.6, 36.5, 36.7, 36.6, 36.7, 36.7],
    actions: [
      "Continue routine monitoring",
      "Maintain hand hygiene",
      "Log any new symptoms promptly",
    ],
    criteria: [
      "Temperature at or above 38°C",
      "Rapidly worsening symptoms",
      "Breathing difficulty",
      "Fever with fast heart rate",
    ],
  },
];

const guidanceSections = [
  { title: "What this may mean", icon: Sparkles },
  { title: "What you can do now", icon: ListChecks },
  { title: "When to contact the flight surgeon", icon: TriangleAlert, highlighted: true },
];
type TopicProfile = (typeof topics)[number];

export function GuidanceScreen({
  onNotify,
  initialTopic = "Heart",
  onNavigate,
}: {
  onNotify: (message: string) => void;
  initialTopic?: string;
  onNavigate: (screen: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState(initialTopic);
  const [openSection, setOpenSection] = useState(0);
  const [criticalOpen, setCriticalOpen] = useState(false);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setLoading(false), reduced ? 250 : 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <GuidanceSkeleton />;
  const profile = topics.find((item) => item.name === topic) ?? topics[1];
  const TopicIcon = profile.icon;

  return (
    <main className="dashboard guidance-screen">
      <section className="guidance-heading page-entrance">
        <div>
          <p className="eyebrow">OFFLINE CLINICAL REFERENCE</p>
          <h1>Guidance</h1>
          <p>Plain-language next steps based on your personal baseline and mission protocols.</p>
        </div>
        <div className="offline-guidance-badge">
          <CloudOff size={18} />
          <span>Available offline</span>
        </div>
      </section>

      <section className="guidance-layout">
        <div className="guidance-main">
          <article
            className="guidance-hero panel reveal-card"
            style={{ "--reveal-delay": "60ms" } as CSSProperties}
          >
            <div className="guidance-hero-copy">
              <span className="guidance-topic-icon">
                <TopicIcon size={27} />
              </span>
              <div>
                <span className="panel-kicker">{topic.toUpperCase()} GUIDANCE</span>
                <h2>{profile.title}</h2>
                <p>{profile.summary}</p>
              </div>
              <StatusChip
                tone={profile.tone}
                label={profile.tone === "normal" ? "Within range" : "Monitor"}
              />
            </div>
            <GuidanceSignal profile={profile} />
          </article>

          <div className="guidance-section-heading page-entrance">
            <span className="guidance-section-number">01</span>
            <div>
              <span className="panel-kicker">UNDERSTAND & ACT</span>
              <h2>What to know and what to do</h2>
              <p>Open each section in order, or go directly to contact criteria.</p>
            </div>
          </div>

          <section className="guidance-accordions">
            {guidanceSections.map((section, index) => {
              const Icon = section.icon;
              const open = openSection === index;
              return (
                <article
                  key={section.title}
                  className={`guidance-accordion-card ${open ? "open" : ""} ${section.highlighted ? "highlighted" : ""} reveal-card`}
                  style={{ "--reveal-delay": `${120 + index * 60}ms` } as CSSProperties}
                >
                  <button
                    className="guidance-accordion-trigger"
                    onClick={() => setOpenSection(open ? -1 : index)}
                  >
                    <span className="accordion-number">0{index + 1}</span>
                    <span className="accordion-icon">
                      <Icon size={21} />
                    </span>
                    <span className="accordion-title">
                      <strong>{section.title}</strong>
                      <small>
                        {section.highlighted
                          ? "Important contact criteria"
                          : open
                            ? "Section expanded"
                            : "Tap to review"}
                      </small>
                    </span>
                    <ChevronDown size={21} />
                  </button>
                  <div className="guidance-accordion-body">
                    <div
                      onClick={(event) => {
                        if (
                          section.highlighted &&
                          (event.target as HTMLElement).closest("button")
                        ) {
                          setCriticalOpen(true);
                        }
                      }}
                    >
                      <GuidanceSectionBody
                        profile={profile}
                        section={index}
                        onNavigate={onNavigate}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <div
            className="sources-panel reveal-card"
            style={{ "--reveal-delay": "320ms" } as CSSProperties}
          >
            <header>
              <span className="sources-icon">
                <BookOpen size={20} />
              </span>
              <div>
                <span className="panel-kicker">PROTOCOL BASIS</span>
                <h3>Sources used for this guidance</h3>
              </div>
              <ShieldCheck size={20} />
            </header>
            <div className="source-cards">
              <span>
                <b>NASA-STD-3001</b>
                <small>Space Flight Human-System Standard</small>
              </span>
              <span>
                <b>NASA Human Research Program</b>
                <small>Evidence reports and mission risk guidance</small>
              </span>
            </div>
          </div>
        </div>

        <aside
          className="topic-library panel reveal-card"
          style={{ "--reveal-delay": "120ms" } as CSSProperties}
        >
          <header>
            <div>
              <span className="panel-kicker">TOPIC LIBRARY</span>
              <h2>Browse guidance</h2>
            </div>
            <span>
              <CloudOff size={15} />
              Offline
            </span>
          </header>
          <div className="topic-grid">
            {topics.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  className={topic === item.name ? "active" : ""}
                  style={{ "--topic-delay": `${200 + index * 50}ms` } as CSSProperties}
                  onClick={() => {
                    setTopic(item.name);
                    setOpenSection(0);
                    onNotify(`${item.name} guidance selected`);
                  }}
                >
                  <span>
                    <Icon size={23} />
                  </span>
                  <strong>{item.name}</strong>
                </button>
              );
            })}
          </div>
          <article className="critical-protocol-card">
            <span>
              <OctagonAlert size={22} />
            </span>
            <div>
              <small>PROTOTYPE ACTION</small>
              <strong>Critical response protocol</strong>
              <p>Preview the full-screen, cannot-snooze alert state.</p>
            </div>
            <button onClick={() => setCriticalOpen(true)}>Preview takeover</button>
          </article>
        </aside>
      </section>

      <div className="guidance-disclaimer">
        <ShieldCheck size={20} />
        <div>
          <strong>Decision support only</strong>
          <span>
            This guidance does not replace assessment by the flight surgeon and is not a medical
            diagnosis.
          </span>
        </div>
      </div>

      {criticalOpen && (
        <CriticalAlert
          onOpenGuidance={() => {
            setCriticalOpen(false);
            setTopic("Heart");
            setOpenSection(2);
          }}
          onNotify={onNotify}
          onNavigate={onNavigate}
        />
      )}
    </main>
  );
}

function GuidanceSignal({ profile }: { profile: TopicProfile }) {
  const values = profile.signal;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map(
      (value, index) =>
        `${(index / (values.length - 1)) * 260},${70 - ((value - min) / range) * 48}`,
    )
    .join(" ");
  const lastY = points.split(" ").at(-1)?.split(",")[1] ?? "22";
  return (
    <div className={`guidance-signal ${profile.tone}`}>
      <div>
        <span>CURRENT</span>
        <strong>
          {profile.current} <small>{profile.unit}</small>
        </strong>
      </div>
      <span className="signal-baseline-value">
        BASELINE <b>{profile.baseline}</b>
      </span>
      <svg viewBox="0 0 260 90" preserveAspectRatio="none">
        <rect x="0" y="47" width="260" height="23" className="guidance-baseline" />
        <polyline key={profile.name} pathLength="1" points={points} />
        <circle key={`${profile.name}-point`} cx="260" cy={lastY} r="5" />
      </svg>
      <span className="guidance-signal-label">7-DAY SIGNAL · {profile.change}</span>
    </div>
  );
}

function GuidanceSectionBody({
  profile,
  section,
  onNavigate,
}: {
  profile: TopicProfile;
  section: number;
  onNavigate: (screen: string) => void;
}) {
  if (section === 0) {
    return (
      <>
        <p>{profile.meaning}</p>
        <div className="guidance-fact-grid">
          <span>
            <b>{profile.change}</b>
            <small>recent change</small>
          </span>
          <span>
            <b>
              {profile.current} {profile.unit}
            </b>
            <small>current value</small>
          </span>
          <span>
            <b>{profile.baseline}</b>
            <small>personal range</small>
          </span>
        </div>
      </>
    );
  }
  if (section === 1) {
    return (
      <ol className="guidance-action-list">
        {profile.actions.map((action, index) => (
          <li key={action}>
            <span>{index + 1}</span>
            <div>
              <strong>{action}</strong>
              <p>Complete this step, then reassess how you feel and repeat the relevant reading.</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className="contact-criteria">
      <p>
        Use the medical support channel if this pattern persists or occurs with any of these signs:
      </p>
      <div>
        {profile.criteria.map((criterion) => (
          <span key={criterion}>
            <Check size={16} />
            {criterion}
          </span>
        ))}
      </div>
      <div className="flight-surgeon-channel">
        <span className="channel-icon">
          <PhoneCall size={20} />
        </span>
        <span>
          <small>RECIPIENT</small>
          <strong>Flight Surgeon · ARES VII Medical</strong>
        </span>
        <span className="channel-status">
          <CloudOff size={15} />
          Store-and-forward ready
        </span>
      </div>
      <button onClick={() => onNavigate("Flight Surgeon")}>
        <PhoneCall size={19} />
        Contact Flight Surgeon
      </button>
    </div>
  );
}

function CriticalAlert({
  onOpenGuidance,
  onNotify,
  onNavigate,
}: {
  onOpenGuidance: () => void;
  onNotify: (message: string) => void;
  onNavigate: (screen: string) => void;
}) {
  const [checked, setChecked] = useState([false, false, false]);
  const [contactState, setContactState] = useState<"idle" | "queued">("idle");
  const alertRef = useRef<HTMLDivElement>(null);
  useModalFocus(alertRef, true);
  const steps = [
    "Stop activity and sit or lie down safely.",
    "Repeat temperature and heart rate after 5 minutes.",
    "Contact the flight surgeon now.",
  ];
  const queueContact = () => {
    setContactState("queued");
    setChecked([true, true, true]);
    onNotify("Flight surgeon message queued");
  };
  return (
    <div
      ref={alertRef}
      className="critical-takeover"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="critical-alert-title"
    >
      <div className="critical-edge-pulse" />
      <div className="critical-content">
        <div className="critical-octagon">
          <OctagonAlert size={52} />
          <i />
          <i />
        </div>
        <span className="critical-kicker">CRITICAL ALERT · CANNOT BE SNOOZED</span>
        <h1 id="critical-alert-title">Critical: Fever and fast heart rate</h1>
        <p className="critical-intro">
          Two readings are outside the critical mission threshold. Follow the steps below and
          contact the flight surgeon.
        </p>
        <div className="critical-values">
          <div>
            <span>TEMPERATURE</span>
            <strong>
              38.6<small>°C</small>
            </strong>
            <b>
              <TriangleAlert size={16} />
              Critical
            </b>
          </div>
          <div>
            <span>HEART RATE</span>
            <strong>
              128<small>bpm</small>
            </strong>
            <b>
              <TriangleAlert size={16} />
              Critical
            </b>
          </div>
        </div>
        <section className="critical-checklist">
          <header>
            <span>DO THIS NOW</span>
            <strong>{checked.filter(Boolean).length} of 3 complete</strong>
          </header>
          {steps.map((step, index) => (
            <button
              key={step}
              className={checked[index] ? "checked" : ""}
              onClick={() =>
                setChecked((items) =>
                  items.map((item, itemIndex) => (itemIndex === index ? !item : item)),
                )
              }
            >
              <span>{checked[index] ? <Check size={20} /> : index + 1}</span>
              <strong>{step}</strong>
            </button>
          ))}
        </section>
        <div className="critical-contact-channel">
          <span className="critical-channel-icon">
            <PhoneCall size={22} />
          </span>
          <div>
            <small>CONTACT DESTINATION</small>
            <strong>ARES VII Flight Surgeon</strong>
            <span>Medical Support Channel · Priority transmission</span>
          </div>
          <b>
            <CloudOff size={16} />
            Link delayed
          </b>
        </div>
        <button
          className={`contact-flight-surgeon ${contactState}`}
          onClick={() => {
            queueContact();
            onNavigate("Flight Surgeon");
          }}
        >
          {contactState === "queued" ? <Check size={25} /> : <PhoneCall size={25} />}
          {contactState === "queued" ? "Message queued" : "Contact Flight Surgeon"}
        </button>
        <button className="open-critical-guidance" onClick={onOpenGuidance}>
          <BookOpen size={20} />
          Open guidance
        </button>
        <div className="critical-queue-note">
          <CloudOff size={18} />
          <span>Message will send when the link is available</span>
        </div>
      </div>
    </div>
  );
}

function GuidanceSkeleton() {
  return (
    <main className="dashboard guidance-screen guidance-skeleton">
      <section className="guidance-heading">
        <div>
          <div className="skeleton-block guidance-sk-eyebrow" />
          <div className="skeleton-block guidance-sk-title" />
          <div className="skeleton-block guidance-sk-copy" />
        </div>
      </section>
      <section className="guidance-layout">
        <div className="guidance-main">
          <div className="skeleton-block guidance-sk-hero" />
          {[0, 1, 2].map((item) => (
            <div className="skeleton-block guidance-sk-accordion" key={item} />
          ))}
        </div>
        <div className="skeleton-block guidance-sk-library" />
      </section>
    </main>
  );
}
