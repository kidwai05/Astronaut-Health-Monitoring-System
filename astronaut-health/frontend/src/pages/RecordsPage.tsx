import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  BedDouble,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Droplets,
  FileText,
  Filter,
  HeartPulse,
  Moon,
  Search,
  Smile,
  Thermometer,
  X,
} from "lucide-react";

type RecordCategory = "Vitals" | "Sleep" | "Wellbeing" | "Activity" | "Environment";
type HealthRecord = {
  id: number;
  category: RecordCategory;
  title: string;
  value: string;
  detail: string;
  date: string;
  time: string;
  icon: typeof HeartPulse;
  tone: string;
};

const records: HealthRecord[] = [
  {
    id: 1,
    category: "Vitals",
    title: "Morning vitals",
    value: "72 bpm",
    detail: "Heart rate · within personal range",
    date: "Today",
    time: "06:42 MLT",
    icon: HeartPulse,
    tone: "normal",
  },
  {
    id: 2,
    category: "Environment",
    title: "Cabin CO₂",
    value: "842 ppm",
    detail: "Atmosphere reading · in safe zone",
    date: "Today",
    time: "06:38 MLT",
    icon: Activity,
    tone: "normal",
  },
  {
    id: 3,
    category: "Sleep",
    title: "Sleep log",
    value: "6h 40m",
    detail: "Quality 3 of 5 · 2 interruptions",
    date: "Today",
    time: "05:22 MLT",
    icon: BedDouble,
    tone: "caution",
  },
  {
    id: 4,
    category: "Wellbeing",
    title: "Mood check-in",
    value: "Good",
    detail: "Stress 4/10 · energy 6/10",
    date: "Today",
    time: "07:15 MLT",
    icon: Smile,
    tone: "normal",
  },
  {
    id: 5,
    category: "Activity",
    title: "Resistance exercise",
    value: "32 min",
    detail: "Lower body · moderate effort",
    date: "Yesterday",
    time: "17:40 MLT",
    icon: Activity,
    tone: "normal",
  },
  {
    id: 6,
    category: "Vitals",
    title: "Temperature",
    value: "36.7 °C",
    detail: "Manual reading · stable",
    date: "Yesterday",
    time: "20:04 MLT",
    icon: Thermometer,
    tone: "normal",
  },
  {
    id: 7,
    category: "Wellbeing",
    title: "Hydration",
    value: "500 mL",
    detail: "Morning water intake",
    date: "Yesterday",
    time: "08:10 MLT",
    icon: Droplets,
    tone: "normal",
  },
  {
    id: 8,
    category: "Sleep",
    title: "Sleep log",
    value: "7h 05m",
    detail: "Quality 4 of 5 · 1 interruption",
    date: "Mission day 140",
    time: "05:16 MLT",
    icon: Moon,
    tone: "normal",
  },
];

const categories = ["All", "Vitals", "Sleep", "Wellbeing", "Activity", "Environment"] as const;
type CategoryFilter = (typeof categories)[number];

export function RecordsPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setLoading(false), reduced ? 250 : 900);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesCategory = category === "All" || record.category === category;
      const matchesSearch =
        !query ||
        `${record.title} ${record.category} ${record.value} ${record.detail}`
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  const exportCsv = () => {
    const rows = [
      ["Date", "Time", "Category", "Record", "Value", "Detail"],
      ...filteredRecords.map((record) => [
        record.date,
        record.time,
        record.category,
        record.title,
        record.value,
        record.detail,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((field) => `"${field.replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "vitalis-health-records.csv";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportOpen(false);
    onNotify(`${filteredRecords.length} records exported as CSV`);
  };

  const exportPdf = () => {
    setExportOpen(false);
    onNotify("Choose Save as PDF in the print dialog");
    window.print();
  };

  if (loading) return <RecordsSkeleton />;

  const dates = [...new Set(filteredRecords.map((record) => record.date))];

  return (
    <main className="dashboard support-screen records-screen">
      <section className="support-page-heading page-entrance">
        <div>
          <p className="eyebrow">PERSONAL HEALTH ARCHIVE</p>
          <h1>Health Records</h1>
          <p>Search your mission timeline and keep a portable copy of your health logs.</p>
        </div>
        <div className="records-export-wrap">
          <button
            className="primary-button support-primary-button"
            aria-expanded={exportOpen}
            onClick={() => setExportOpen((open) => !open)}
          >
            <Download size={18} /> Export PDF / CSV <ChevronDown size={16} />
          </button>
          {exportOpen && (
            <div className="records-export-menu">
              <button onClick={exportPdf}>
                <FileText size={17} />
                <span>
                  <strong>Export PDF</strong>
                  <small>Open print / save dialog</small>
                </span>
              </button>
              <button onClick={exportCsv}>
                <Download size={17} />
                <span>
                  <strong>Export CSV</strong>
                  <small>{filteredRecords.length} filtered records</small>
                </span>
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="records-layout">
        <section className="records-timeline-panel panel">
          <div className="records-controls">
            <label className="records-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search records, readings, notes..."
                aria-label="Search health records"
              />
              {search && (
                <button aria-label="Clear search" onClick={() => setSearch("")}>
                  <X size={15} />
                </button>
              )}
            </label>
            <div className="records-filter-label">
              <Filter size={15} /> Filter by type
            </div>
            <div
              className="records-filter-chips"
              role="group"
              aria-label="Filter records by category"
            >
              {categories.map((item) => (
                <button
                  className={category === item ? "active" : ""}
                  key={item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="records-result-count">
              {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"} shown
            </div>
          </div>

          <div className="records-timeline">
            {dates.map((date, dateIndex) => (
              <section className="records-date-group" key={date}>
                <h2>{date}</h2>
                <div className="records-date-items">
                  {filteredRecords
                    .filter((record) => record.date === date)
                    .map((record, index) => {
                      const Icon = record.icon;
                      return (
                        <article
                          className={`health-record-row reveal-card ${record.tone}`}
                          style={
                            {
                              "--reveal-delay": `${100 + dateIndex * 80 + index * 55}ms`,
                            } as CSSProperties
                          }
                          key={record.id}
                        >
                          <span className="health-record-icon">
                            <Icon size={19} />
                          </span>
                          <div className="health-record-copy">
                            <div className="health-record-title">
                              <h3>{record.title}</h3>
                              <span className={`record-category ${record.category.toLowerCase()}`}>
                                {record.category}
                              </span>
                            </div>
                            <p>{record.detail}</p>
                          </div>
                          <div className="health-record-value">
                            <strong>{record.value}</strong>
                            <time>
                              <Clock3 size={13} /> {record.time}
                            </time>
                          </div>
                        </article>
                      );
                    })}
                </div>
              </section>
            ))}
            {filteredRecords.length === 0 && (
              <div className="records-empty">
                <Search size={24} />
                <h2>No matching records</h2>
                <p>Try a different search or clear the current filter.</p>
                <button
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="records-report-preview panel">
          <header className="support-panel-heading">
            <div>
              <span className="panel-kicker">REPORT PREVIEW</span>
              <h2>Mission health summary</h2>
            </div>
            <span className="report-icon">
              <FileText size={19} />
            </span>
          </header>
          <p className="report-subtitle">Cdr. Amara Khan · Mission day 142</p>
          <div className="report-score-line">
            <span>Weekly health score</span>
            <strong>
              82 <small>/ 100</small>
            </strong>
          </div>
          <ReportSparkline />
          <div className="report-summary-grid">
            <div>
              <span>Log entries</span>
              <strong>48</strong>
            </div>
            <div>
              <span>Days logged</span>
              <strong>12</strong>
            </div>
            <div>
              <span>Open alerts</span>
              <strong>2</strong>
            </div>
            <div>
              <span>Data range</span>
              <strong>7 days</strong>
            </div>
          </div>
          <div className="report-preview-note">
            <Check size={15} /> Preview includes the currently filtered timeline.
          </div>
          <button className="report-preview-button" onClick={exportPdf}>
            <FileText size={16} /> Export this report
          </button>
          <p className="report-privacy-note">
            Your health records stay on this device until you choose to export them.
          </p>
        </aside>
      </div>
    </main>
  );
}

function ReportSparkline() {
  const values = [61, 69, 66, 75, 72, 78, 82];
  const points = values
    .map((value, index) => `${index * 30},${42 - ((value - 55) / 35) * 34}`)
    .join(" ");
  return (
    <div className="report-sparkline">
      <svg viewBox="0 0 180 48" role="img" aria-label="Weekly score trending upward">
        <line x1="0" x2="180" y1="42" y2="42" />
        <polyline points={points} pathLength="1" />
        <circle cx="180" cy={Number(points.split(" ").at(-1)?.split(",")[1])} r="3.5" />
      </svg>
      <div>
        <span>7 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function RecordsSkeleton() {
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
      <div className="records-layout">
        <div className="skeleton-block records-sk-timeline" />
        <div className="skeleton-block records-sk-report" />
      </div>
    </main>
  );
}
