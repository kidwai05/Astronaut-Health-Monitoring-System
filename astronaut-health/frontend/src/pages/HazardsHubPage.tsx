import { useEffect, useState, type CSSProperties, type ComponentType } from "react";
import {
  ArrowUpRight,
  Bone,
  Brain,
  Earth,
  Eye,
  HeartPulse,
  LockKeyhole,
  Radiation,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type HazardLink = { label: string; screen: string };
type Hazard = {
  name: string;
  short: string;
  icon: ComponentType<{ size?: number }>;
  tone: string;
  concerns: string[];
  helps: string;
  links: HazardLink[];
};

const hazards: Hazard[] = [
  {
    name: "Space Radiation",
    short: "Radiation",
    icon: Radiation,
    tone: "radiation",
    concerns: [
      "Increased exposure beyond Earth's protective magnetosphere",
      "Possible acute effects from solar particle events",
      "Long-term cumulative exposure",
    ],
    helps:
      "VITALIS brings environment readings and space-weather context together so you can notice changes and follow mission guidance.",
    links: [
      { label: "Environment & radiation", screen: "Environment" },
      { label: "Alerts", screen: "Alerts" },
      { label: "Trends", screen: "Trends" },
    ],
  },
  {
    name: "Isolation and Confinement",
    short: "Isolation",
    icon: Brain,
    tone: "isolation",
    concerns: [
      "Mood and stress changes",
      "Sleep disruption and fatigue",
      "Reduced privacy and social connection",
    ],
    helps:
      "Private check-ins, sleep tracking, and supportive guidance can help you reflect on wellbeing patterns without judgment.",
    links: [
      { label: "Mood check-in", screen: "Mood" },
      { label: "Sleep tracker", screen: "Sleep" },
      { label: "Guidance", screen: "Guidance" },
    ],
  },
  {
    name: "Distance from Earth",
    short: "Distance",
    icon: Earth,
    tone: "distance",
    concerns: [
      "Communication delays",
      "Limited access to real-time consultation",
      "Greater need for crew autonomy",
    ],
    helps:
      "Offline-first logs keep health information available locally, with decision-support cues to help organize what to review.",
    links: [
      { label: "Quick log", screen: "Log" },
      { label: "Health records", screen: "Records" },
      { label: "Guidance", screen: "Guidance" },
    ],
  },
  {
    name: "Gravity Fields",
    short: "Gravity",
    icon: Bone,
    tone: "gravity",
    concerns: [
      "Bone mineral loss",
      "Muscle strength and endurance changes",
      "Balance and sensorimotor adaptation",
    ],
    helps:
      "Activity and symptom histories can make changes easier to spot over time and support conversations with the medical team.",
    links: [
      { label: "Progress", screen: "Progress" },
      { label: "Body map", screen: "Body Map" },
      { label: "Trends", screen: "Trends" },
    ],
  },
  {
    name: "Hostile or Closed Environments",
    short: "Environment",
    icon: ShieldAlert,
    tone: "hostile",
    concerns: [
      "Constrained atmosphere and habitat conditions",
      "Noise, temperature, and humidity stressors",
      "Reduced access to familiar surroundings",
    ],
    helps:
      "Habitat measurements, reminders, and symptom logs keep relevant context together for review—on board and offline.",
    links: [
      { label: "Environment screen", screen: "Environment" },
      { label: "Reminders", screen: "Reminders" },
      { label: "Body map", screen: "Body Map" },
    ],
  },
];

export function HazardsHubPage({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setLoading(false), reduced ? 250 : 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) return <HazardsSkeleton />;

  return (
    <main className="dashboard support-screen hazards-screen">
      <section className="support-page-heading page-entrance">
        <div>
          <p className="eyebrow">MISSION HEALTH REFERENCE</p>
          <h1>Hazards Learn Hub</h1>
          <p>
            Explore the health challenges of human spaceflight and the tools that support your crew.
          </p>
        </div>
        <span className="hazards-reference-badge">
          <ShieldCheck size={17} /> NASA human spaceflight hazards
        </span>
      </section>

      <section
        className="hazards-intro panel reveal-card"
        style={{ "--reveal-delay": "40ms" } as CSSProperties}
      >
        <div className="hazards-intro-icon">
          <Sparkles size={22} />
        </div>
        <div>
          <span className="panel-kicker">KNOW THE HAZARD · KNOW YOUR TOOLS</span>
          <h2>Spaceflight health is shaped by the environment around you.</h2>
          <p>
            These topics are a starting point for learning—not a personal risk assessment or
            diagnosis.
          </p>
        </div>
        <span className="hazards-intro-number">
          05 <small>topics</small>
        </span>
      </section>

      <section className="hazard-card-grid" aria-label="NASA spaceflight hazards">
        {hazards.map((hazard, index) => {
          const Icon = hazard.icon;
          return (
            <article
              className={`hazard-learn-card panel ${hazard.tone} reveal-card`}
              style={{ "--reveal-delay": `${110 + index * 75}ms` } as CSSProperties}
              key={hazard.name}
            >
              <header className="hazard-card-header">
                <span className="hazard-card-icon">
                  <Icon size={24} />
                </span>
                <span className="hazard-card-number">{String(index + 1).padStart(2, "0")}</span>
              </header>
              <h2>{hazard.name}</h2>
              <section className="hazard-detail-block">
                <h3>
                  <Eye size={15} /> Health concerns
                </h3>
                <ul>
                  {hazard.concerns.map((concern) => (
                    <li key={concern}>{concern}</li>
                  ))}
                </ul>
              </section>
              <section className="hazard-help-block">
                <h3>
                  <HeartPulse size={15} /> How VITALIS helps
                </h3>
                <p>{hazard.helps}</p>
              </section>
              <footer className="hazard-links">
                <span>Explore tools</span>
                <div>
                  {hazard.links.map((link) => (
                    <button key={link.label} onClick={() => onNavigate(link.screen)}>
                      {link.label} <ArrowUpRight size={14} />
                    </button>
                  ))}
                </div>
              </footer>
            </article>
          );
        })}
      </section>

      <p className="hazards-disclaimer">
        <LockKeyhole size={15} /> VITALIS provides crew health decision support. Always follow
        mission protocols and consult the flight surgeon as needed.
      </p>
    </main>
  );
}

function HazardsSkeleton() {
  return (
    <main className="dashboard support-screen support-skeleton">
      <section className="support-page-heading">
        <div>
          <div className="skeleton-block support-sk-eyebrow" />
          <div className="skeleton-block support-sk-title" />
          <div className="skeleton-block support-sk-copy" />
        </div>
      </section>
      <div className="skeleton-block hazards-sk-intro" />
      <div className="hazard-card-grid">
        {[0, 1, 2, 3, 4].map((item) => (
          <div className="skeleton-block hazards-sk-card" key={item} />
        ))}
      </div>
    </main>
  );
}
