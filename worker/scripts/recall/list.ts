// Prints what Walrus Memory holds for this install. Reads only.
// Run: cd worker && npx tsx scripts/recall/list.ts

import type { RecallStore } from "../../src/recall/memory";
import type { LessonRecord, OutcomeRecord, PickRecord, PrefRecord, RecordKind } from "../../src/recall/records";
import { loadEnvOrExit, openStore, safeError } from "./shared";

const RETRY_MS = 20_000;

function pickLine(pick: PickRecord): string {
  const lean = pick.pYes >= 0.5 ? `YES ${Math.round(pick.pYes * 100)}%` : `NO ${Math.round((1 - pick.pYes) * 100)}%`;
  return `${pick.id}  ${lean}  ${pick.question}`;
}

function outcomeLine(outcome: OutcomeRecord): string {
  return `${outcome.pickId}  ${outcome.hit ? "right" : "wrong"}  Brier ${outcome.brier.toFixed(3)}  ${outcome.detail}`;
}

const lessonLine = (lesson: LessonRecord): string => `${lesson.key} (${lesson.n} calls): ${lesson.text}`;
const prefLine = (pref: PrefRecord): string => `${pref.kind} ${"site" in pref ? pref.site : pref.address}`;

async function show(store: RecallStore, kind: RecordKind): Promise<number> {
  const lines =
    kind === "pick"
      ? (await store.list("pick", true)).map(pickLine)
      : kind === "outcome"
        ? (await store.list("outcome", true)).map(outcomeLine)
        : kind === "lesson"
          ? (await store.list("lesson", true)).map(lessonLine)
          : (await store.list("pref", true)).map(prefLine);
  console.log(`${kind}: ${lines.length}`);
  for (const line of lines) console.log(`  ${line}`);
  return lines.length;
}

const env = loadEnvOrExit();

try {
  const store = await openStore(env);
  const picks = await show(store, "pick");
  if (picks === 0) {
    console.log("No picks yet. Writes are asynchronous, so checking again in 20 seconds...");
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    await show(store, "pick");
  }
  for (const kind of ["outcome", "lesson", "pref"] as const) await show(store, kind);
} catch (error) {
  console.error(safeError(error, env));
  process.exit(1);
}
