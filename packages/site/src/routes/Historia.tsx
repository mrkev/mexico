import { useState } from "react";
import { Toggle } from "../components/ui/toggle";
import citiesData from "../data/cities.json";
import nationsData from "../data/nations.json";
import peoplesData from "../data/peoples.json";
import { Entity, formatYear, LayerKey, LAYERS } from "../historia";

// Cached offline by scripts/fetch-historia.ts (`pnpm --filter site fetch:historia`).
const DATA: Record<LayerKey, Entity[]> = {
  peoples: peoplesData as Entity[],
  nations: nationsData as Entity[],
  cities: citiesData as Entity[],
};

// Per-layer colours. Full class strings so Tailwind keeps them.
const COLORS: Record<LayerKey, { bar: string; dot: string }> = {
  peoples: { bar: "bg-amber-700/80 hover:bg-amber-600", dot: "bg-amber-600" },
  nations: { bar: "bg-sky-700/80 hover:bg-sky-600", dot: "bg-sky-600" },
  cities: { bar: "bg-emerald-700/80 hover:bg-emerald-600", dot: "bg-emerald-600" },
};

type Tagged = Entity & { kind: LayerKey };

function wikidataUrl(id: string) {
  return `https://www.wikidata.org/wiki/${id}`;
}

// Rudimentary timeline: one row per entity, a bar spanning start..end placed on
// a shared linear year axis, coloured by layer. Entities with only a start get
// a short marker.
function Timeline({ items }: { items: Tagged[] }) {
  const min = Math.min(...items.map((p) => p.start as number));
  const max = Math.max(...items.map((p) => (p.end ?? p.start) as number));
  const span = max - min || 1;
  const pct = (year: number) => ((year - min) / span) * 100;

  const ticks = Array.from({ length: 5 }, (_, i) =>
    Math.round(min + (span * i) / 4)
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-5 text-xs text-gray-400 border-b border-gray-700">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${pct(t)}%` }}
          >
            {formatYear(t)}
          </span>
        ))}
      </div>

      {items.map((p) => {
        const start = p.start as number;
        const end = p.end ?? start;
        const left = pct(start);
        const width = Math.max(pct(end) - left, 0.8);
        return (
          <div key={`${p.kind}-${p.id}`} className="relative h-6">
            <div
              className={`absolute top-0.5 h-5 rounded flex items-center ${COLORS[p.kind].bar}`}
              style={{ left: `${left}%`, width: `${width}%`, minWidth: 4 }}
              title={`${p.label}: ${formatYear(start)}${
                p.end != null ? ` – ${formatYear(end)}` : ""
              }`}
            >
              <a
                href={wikidataUrl(p.id)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-white px-1 whitespace-nowrap"
              >
                {p.label}
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Historia() {
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    peoples: true,
    nations: true,
    cities: true,
  });

  const shown: Tagged[] = LAYERS.flatMap((l) =>
    visible[l.key] ? DATA[l.key].map((e) => ({ ...e, kind: l.key })) : []
  );
  const dated = shown
    .filter((p) => p.start != null)
    .sort((a, b) => (a.start as number) - (b.start as number));

  return (
    <div className="flex flex-col gap-6 px-6 py-4 w-full overflow-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl">Historia</h1>
        {LAYERS.map((l) => (
          <Toggle
            key={l.key}
            variant="outline"
            size="sm"
            pressed={visible[l.key]}
            onPressedChange={(on) =>
              setVisible((prev) => ({ ...prev, [l.key]: on }))
            }
          >
            <span
              className={`inline-block w-2.5 h-2.5 rounded-sm ${COLORS[l.key].dot}`}
            />
            {l.label} ({DATA[l.key].length})
          </Toggle>
        ))}
      </div>

      {dated.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Timeline ({dated.length})</h2>
          <Timeline items={dated} />
        </section>
      )}

      {LAYERS.map((l) => {
        if (!visible[l.key]) {
          return null;
        }
        const undated = DATA[l.key]
          .filter((p) => p.start == null)
          .sort((a, b) => a.label.localeCompare(b.label));
        if (undated.length === 0) {
          return null;
        }
        return (
          <section key={l.key} className="flex flex-col gap-2">
            <h2 className="text-lg flex items-center gap-2">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-sm ${COLORS[l.key].dot}`}
              />
              {l.label} — no dates yet ({undated.length})
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {undated.map((p) => (
                <li key={p.id}>
                  <a
                    href={wikidataUrl(p.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {p.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
