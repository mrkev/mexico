// Offline fetcher for the Historia timeline data. Runs each layer's Wikidata
// SPARQL query and caches the parsed results to src/data/<layer>.json, so the
// client never has to hit the (frequently rate-limited) WDQS endpoint.
//
// Run with bun:
//   bun scripts/fetch-historia.ts                 # all layers
//   bun scripts/fetch-historia.ts --layer cities  # one layer
//   bun scripts/fetch-historia.ts --delay 90      # space requests further apart

import { Command } from "commander";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LAYERS, LayerKey } from "../src/historia";
import { entitiesFromSparql, sparqlUrl } from "../src/historia.sparql";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, "../src/data");

// Wikidata asks non-browser clients to send a descriptive User-Agent with
// contact info: https://meta.wikimedia.org/wiki/User-Agent_policy
const USER_AGENT =
  "mexico-historia/1.0 (https://github.com/mrkev/mexico; combuskev@gmail.com)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LAYER_KEYS = LAYERS.map((l) => l.key);

async function fetchLayer(
  key: LayerKey,
  { retries, retryDelayMs }: { retries: number; retryDelayMs: number }
) {
  const url = sparqlUrl(key);
  for (let attempt = 1; ; attempt++) {
    let status: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/sparql-results+json",
        },
      });
      if (res.ok) {
        return entitiesFromSparql(await res.json());
      }
      // 429 (rate limit) and 504 (timeout) are the usual transient failures.
      status = `HTTP ${res.status}`;
    } catch (err) {
      status = err instanceof Error ? err.message : String(err);
    }
    if (attempt > retries) {
      throw new Error(`${key}: ${status} (gave up after ${retries} retries)`);
    }
    console.warn(
      `  ${key}: ${status} — retry ${attempt}/${retries} in ${retryDelayMs / 1000}s`
    );
    await sleep(retryDelayMs);
  }
}

const program = new Command();
program
  .description("Fetch & cache Historia timeline data from Wikidata")
  .option("-l, --layer <key>", `only fetch one layer (${LAYER_KEYS.join(", ")})`)
  .option(
    "-d, --delay <seconds>",
    "delay between layers (WDQS rate-limits ~1 req/min)",
    "65"
  )
  .option("-r, --retries <n>", "retries per layer on failure", "3")
  .option("--retry-delay <seconds>", "delay between retries", "65")
  .parse();

const opts = program.opts<{
  layer?: string;
  delay: string;
  retries: string;
  retryDelay: string;
}>();

if (opts.layer && !LAYER_KEYS.includes(opts.layer as LayerKey)) {
  console.error(
    `Unknown layer "${opts.layer}". Choose one of: ${LAYER_KEYS.join(", ")}`
  );
  process.exit(1);
}

const layers = opts.layer ? [opts.layer as LayerKey] : LAYER_KEYS;
const delayMs = Number(opts.delay) * 1000;
const retries = Number(opts.retries);
const retryDelayMs = Number(opts.retryDelay) * 1000;

await mkdir(OUT_DIR, { recursive: true });

for (let i = 0; i < layers.length; i++) {
  const key = layers[i];
  console.log(`Fetching ${key}…`);
  const entities = await fetchLayer(key, { retries, retryDelayMs });
  const out = resolve(OUT_DIR, `${key}.json`);
  await writeFile(out, JSON.stringify(entities, null, 2) + "\n");
  const dated = entities.filter((e) => e.start != null).length;
  console.log(
    `  wrote ${entities.length} entities (${dated} dated) → src/data/${key}.json`
  );
  if (i < layers.length - 1) {
    await sleep(delayMs);
  }
}

console.log("Done.");
