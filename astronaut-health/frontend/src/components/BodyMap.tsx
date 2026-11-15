import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  Activity,
  Check,
  ChevronRight,
  CircleAlert,
  Eye,
  Info,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { StatusChip } from "./VitalisUI";

type Side = "front" | "back";
const faces = ["😣", "🙁", "😐", "🙂", "😊"];
const history = [
  ["Eyes", "Dryness", "Today · 06:18", "2/5"],
  ["Back", "Lower back discomfort", "Yesterday · 19:42", "3/5"],
  ["Head", "Headache", "Mission day 140", "2/5"],
];

export function BodyMap({ onNotify }: { onNotify: (message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [side, setSide] = useState<Side>("front");
  const [region, setRegion] = useState("Eyes");
  const [symptoms, setSymptoms] = useState(["Dryness"]);
  const [severity, setSeverity] = useState(2);
  const [notes, setNotes] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setLoading(false), reduced ? 250 : 1000);
    return () => clearTimeout(timer);
  }, []);

  const chooseRegion = (next: string) => {
    setRegion(next);
    setSymptoms(next === "Eyes" ? ["Dryness"] : []);
    setSeverity(next === "Eyes" ? 2 : 1);
    setPanelOpen(true);
  };
  const options =
    region === "Eyes"
      ? ["Vision change", "Pain", "Dryness", "Headache"]
      : ["Pain", "Tingling", "Stiffness", "Swelling"];
  const toggleSymptom = (value: string) =>
    setSymptoms((items) =>
      items.includes(value) ? items.filter((item) => item !== value) : [...items, value],
    );
  const save = () => {
    if (saving !== "idle") return;
    setSaving("saving");
    setTimeout(() => setSaving("saved"), 450);
    setTimeout(() => {
      setSaving("idle");
      onNotify(`${region} symptom saved locally`);
    }, 1200);
  };

  if (loading) return <BodyMapSkeleton />;

  return (
    <main className="dashboard body-map-screen">
      <section className="body-map-heading page-entrance">
        <div>
          <p className="eyebrow">SYMPTOM LOCATION</p>
          <h1>Interactive Body Map</h1>
          <p>Tap a region to record how you feel. Recent symptoms are highlighted.</p>
        </div>
        <StatusChip tone="caution" label="3 recent symptoms" />
      </section>

      <section className="body-map-layout">
        <div
          className="body-canvas panel reveal-card"
          style={{ "--reveal-delay": "60ms" } as CSSProperties}
        >
          <div className="body-canvas-toolbar">
            <div className="body-view-toggle">
              <button className={side === "front" ? "active" : ""} onClick={() => setSide("front")}>
                Front
              </button>
              <button className={side === "back" ? "active" : ""} onClick={() => setSide("back")}>
                Back
              </button>
            </div>
            <button
              className="rotate-body-button"
              onClick={() => setSide((value) => (value === "front" ? "back" : "front"))}
            >
              <RotateCcw size={18} /> Rotate view
            </button>
          </div>
          <div className={`human-map-wrap ${side}`}>
            <HumanFigure side={side} selected={region} onSelect={chooseRegion} />
            <span className="body-orientation-label">{side.toUpperCase()} VIEW</span>
          </div>
          <div className="body-map-legend">
            <span>
              <i className="legend-selected" /> Selected region
            </span>
            <span>
              <i className="legend-recent" /> Recent symptom
            </span>
            <span>
              <Sparkles size={16} /> Tap any region
            </span>
          </div>
        </div>

        <aside className={`symptom-panel panel ${panelOpen ? "open" : "closed"}`}>
          <div className="mobile-sheet-handle" />
          <header>
            <div>
              <span className="panel-kicker">SELECTED REGION</span>
              <h2>
                {region === "Eyes" ? <Eye size={21} /> : <Activity size={21} />} {region}
              </h2>
            </div>
            <button className="close-symptom-panel" onClick={() => setPanelOpen(false)}>
              <X size={20} />
            </button>
          </header>
          <div className="symptom-form">
            <fieldset>
              <legend>What are you experiencing?</legend>
              <div className="symptom-chips">
                {options.map((item, index) => (
                  <button
                    key={item}
                    className={symptoms.includes(item) ? "selected" : ""}
                    style={{ "--chip-delay": `${100 + index * 50}ms` } as CSSProperties}
                    onClick={() => toggleSymptom(item)}
                  >
                    {symptoms.includes(item) && <Check size={15} />}
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="severity-control">
              <span>
                <strong>Severity</strong>
                <b>{severity} / 5</b>
              </span>
              <div className="severity-faces">
                {faces.map((face, index) => (
                  <span className={severity === index + 1 ? "active" : ""} key={face}>
                    {face}
                  </span>
                ))}
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={severity}
                onChange={(event) => setSeverity(+event.target.value)}
                style={{ "--severity": `${(severity - 1) * 25}%` } as CSSProperties}
              />
              <div className="severity-labels">
                <span>Mild</span>
                <span>Severe</span>
              </div>
            </label>
            <label className="symptom-notes">
              <span>
                Notes <small>OPTIONAL</small>
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Describe when it started or what makes it better…"
                maxLength={240}
              />
              <small>{notes.length} / 240</small>
            </label>
            <button className={`save-symptom-button ${saving}`} onClick={save}>
              {saving === "saved" ? <Check size={21} /> : <Save size={20} />}
              {saving === "saving"
                ? "Saving…"
                : saving === "saved"
                  ? "Symptom saved"
                  : "Save symptom"}
              <i />
            </button>
          </div>

          {region === "Eyes" && (
            <article className="vision-info-card">
              <span>
                <Info size={20} />
              </span>
              <div>
                <strong>Spaceflight vision note</strong>
                <p>Vision changes can be related to spaceflight fluid shifts.</p>
                <button onClick={() => onNotify("Vision guidance opened")}>
                  See guidance <ChevronRight size={17} />
                </button>
              </div>
            </article>
          )}

          <section className="recent-symptoms">
            <div className="recent-heading">
              <h3>Recent symptoms</h3>
              <span>Last 7 days</span>
            </div>
            <div className="symptom-timeline">
              {history.map(([area, symptom, time, score], index) => (
                <button
                  className="timeline-item"
                  key={`${area}-${time}`}
                  style={{ "--timeline-delay": `${420 + index * 60}ms` } as CSSProperties}
                  onClick={() => {
                    chooseRegion(area);
                    if (area === "Back") setSide("back");
                  }}
                >
                  <span className={`timeline-dot ${index === 1 ? "warning" : "caution"}`} />
                  <span>
                    <strong>
                      {area} · {symptom}
                    </strong>
                    <small>{time}</small>
                  </span>
                  <b>{score}</b>
                </button>
              ))}
            </div>
          </section>
          <div className="panel-disclaimer">
            <CircleAlert size={15} /> Decision support only. Not a medical diagnosis.
          </div>
        </aside>
      </section>
    </main>
  );
}

function HumanFigure({
  side,
  selected,
  onSelect,
}: {
  side: Side;
  selected: string;
  onSelect: (region: string) => void;
}) {
  const recent = new Set(["Eyes", "Back", "Head"]);
  const props = (name: string) => ({
    className: `body-svg-region ${selected === name ? "selected" : ""} ${recent.has(name) ? "recent" : ""}`,
    role: "button",
    tabIndex: 0,
    "aria-label": `Select ${name}`,
    onClick: () => onSelect(name),
    onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
      if (event.key === "Enter" || event.key === " ") onSelect(name);
    },
  });
  return (
    <svg className="human-map" viewBox="0 0 360 720" aria-label={`${side} human body map`}>
      <g className="body-outline">
        <ellipse cx="180" cy="66" rx="35" ry="45" />
        <path d="M158 104C160 120 155 128 145 137 124 140 98 146 84 164 71 181 69 205 65 229L43 339C39 356 47 369 60 371 75 373 82 361 84 346L103 250C108 282 115 314 126 341 132 356 134 373 131 394L124 486 117 626C116 646 128 659 143 656 156 654 160 643 163 626L180 487 197 626C200 643 204 654 217 656 232 659 244 646 243 626L236 486 229 394C226 373 228 356 234 341 245 314 252 282 257 250L276 346C278 361 285 373 300 371 313 369 321 356 317 339L295 229C291 205 289 181 276 164 262 146 236 140 215 137 205 128 200 120 202 104 190 112 170 112 158 104Z" />
        <path d="M119 624C109 646 101 665 104 682 118 692 143 689 159 678L163 628ZM241 624C251 646 259 665 256 682 242 692 217 689 201 678L197 628Z" />
      </g>
      <g className="body-landmarks">
        {side === "front" ? (
          <>
            <path d="M145 143Q180 161 215 143M180 158V337M145 224Q180 239 215 224M169 287Q180 294 191 287" />
            <circle cx="180" cy="276" r="2.5" />
          </>
        ) : (
          <>
            <path d="M180 140V340M140 169Q153 218 176 235M220 169Q207 218 184 235M145 310Q180 326 215 310" />
          </>
        )}
        <path d="M132 387Q149 397 166 390M194 390Q211 397 228 387M126 486Q143 493 160 486M200 486Q217 493 234 486" />
      </g>
      <g {...props("Head")}>
        <ellipse cx="180" cy="66" rx="34" ry="44" />
      </g>
      {side === "front" && (
        <g {...props("Eyes")}>
          <path d="M153 61Q164 52 175 61 164 69 153 61ZM185 61Q196 52 207 61 196 69 185 61Z" />
        </g>
      )}
      <g {...props("Neck")}>
        <path d="M158 103C161 121 155 131 145 138Q180 157 215 138C205 131 199 121 202 103Q180 114 158 103Z" />
      </g>
      {side === "front" ? (
        <>
          <g {...props("Chest")}>
            <path d="M145 138Q180 157 215 138C233 143 248 152 258 166L246 238Q214 250 180 244 146 250 114 238L102 166C112 152 127 143 145 138Z" />
          </g>
          <g {...props("Abdomen")}>
            <path d="M114 238Q180 255 246 238L234 341Q180 365 126 341Z" />
          </g>
        </>
      ) : (
        <g {...props("Back")}>
          <path d="M145 138Q180 151 215 138C234 143 248 152 258 166L234 341Q180 365 126 341L102 166C112 152 126 143 145 138Z" />
        </g>
      )}
      <g {...props("Arms")}>
        <path d="M102 166C84 177 79 200 75 229L50 346C49 355 54 362 61 362 70 362 74 355 76 344L105 209ZM258 166C276 177 281 200 285 229L310 346C311 355 306 362 299 362 290 362 286 355 284 344L255 209Z" />
      </g>
      <g {...props("Hands")}>
        <path d="M48 338C35 349 33 371 42 383 50 393 67 386 70 371L72 346ZM312 338C325 349 327 371 318 383 310 393 293 386 290 371L288 346Z" />
      </g>
      <g {...props("Hips")}>
        <path d="M126 334Q180 360 234 334L229 394Q205 414 180 403 155 414 131 394Z" />
      </g>
      <g {...props("Legs")}>
        <path d="M132 386Q154 406 178 398L163 628C160 644 153 653 143 653 131 653 123 643 125 626L132 486Q126 425 132 386ZM228 386Q206 406 182 398L197 628C200 644 207 653 217 653 229 653 237 643 235 626L228 486Q234 425 228 386Z" />
      </g>
      <g {...props("Feet")}>
        <path d="M124 620L163 624 159 678Q132 693 104 682C103 663 113 640 124 620ZM236 620L197 624 201 678Q228 693 256 682C257 663 247 640 236 620Z" />
      </g>
    </svg>
  );
}

function BodyMapSkeleton() {
  return (
    <main className="dashboard body-map-screen body-map-skeleton">
      <section className="body-map-heading">
        <div>
          <div className="skeleton-block bm-sk-eyebrow" />
          <div className="skeleton-block bm-sk-title" />
          <div className="skeleton-block bm-sk-copy" />
        </div>
      </section>
      <section className="body-map-layout">
        <div className="panel body-canvas bm-sk-canvas">
          <div className="skeleton-block bm-sk-toggle" />
          <div className="skeleton-block bm-sk-figure" />
        </div>
        <div className="panel symptom-panel bm-sk-panel">
          <div className="skeleton-block bm-sk-panel-title" />
          <div className="bm-sk-chip-row">
            {[0, 1, 2, 3].map((i) => (
              <div className="skeleton-block bm-sk-chip" key={i} />
            ))}
          </div>
          <div className="skeleton-block bm-sk-slider" />
          <div className="skeleton-block bm-sk-notes" />
          <div className="skeleton-block bm-sk-save" />
          {[0, 1, 2].map((i) => (
            <div className="skeleton-block bm-sk-timeline" key={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
