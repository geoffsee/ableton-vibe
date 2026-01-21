import fs from "fs";
import path from "path";

export type SampleSearchOptions = {
  roots?: string[];
  query?: string; // space-separated terms; prefix with '-' to exclude
  exts?: string[]; // e.g., ["wav","aiff","aif","mp3","flac"]
  bpmMin?: number;
  bpmMax?: number;
  key?: string; // e.g., "F#m", "C minor"
  limit?: number;
  maxDepth?: number; // directory depth limit from each root
};

export type SampleMatch = {
  path: string;
  name: string;
  ext: string;
  sizeBytes: number | null;
  mtimeMs: number | null;
  bpm?: number;
  musicalKey?: string;
};

const DEFAULT_EXTS = ["wav", "aif", "aiff", "mp3", "flac", "ogg", "m4a"];
const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_DEPTH = 6;

const IGNORED_DIR_NAMES = new Set([
  ".git",
  ".svn",
  ".hg",
  "node_modules",
  ".next",
  ".idea",
  "build",
  "dist",
  "__pycache__",
]);

const expandHome = (p: string) => (p.startsWith("~") ? path.join(process.env.HOME || "", p.slice(1)) : p);

const normalizeKey = (k: string | undefined | null): string | undefined => {
  if (!k) return undefined;
  const m = k
    .toLowerCase()
    .replace(/major|maj/gi, "M")
    .replace(/minor|min|m(?!aj)/gi, "m")
    .replace(/\s+/g, "")
    .replace(/b/g, "b")
    .replace(/#/g, "#");
  // Normalize first letter uppercase, accidentals kept, and m/M suffix simplified to m or M
  const match = m.match(/^([a-g])([#b])?(m|M)?$/);
  if (!match) return undefined;
  const letter = match[1]!.toUpperCase();
  const acc = match[2] || "";
  const mode = match[3] === "m" ? "m" : match[3] === "M" ? "M" : "";
  return `${letter}${acc}${mode}`;
};

const parseBpmFromName = (name: string): number | undefined => {
  const lower = name.toLowerCase();
  // 1) explicit BPM label
  let m = lower.match(/(?:^|[^\d])(\d{2,3})\s?bpm\b/);
  if (m) {
    const bpm = Number.parseInt(m[1]!, 10);
    if (bpm >= 50 && bpm <= 220) return bpm;
  }
  // 2) trailing tempo segments like _128, -126bpm, 140.
  m = lower.match(/(?:_|-|\s)(\d{2,3})(?:\s?bpm)?(?:\D|$)/);
  if (m) {
    const bpm = Number.parseInt(m[1]!, 10);
    if (bpm >= 50 && bpm <= 220) return bpm;
  }
  return undefined;
};

const parseKeyFromName = (name: string): string | undefined => {
  const lower = name.toLowerCase();
  // Capture patterns like C#m, F#maj, G minor, BbM
  const m = lower.match(/\b([a-g])([#b])?\s*(maj|major|m|min|minor)?\b/);
  if (!m) return undefined;
  const letter = m[1]!.toUpperCase();
  const accidental = (m[2] || "").replace("b", "b").replace("#", "#");
  const mode = m[3]
    ? m[3].startsWith("maj") || m[3].startsWith("M")
      ? "M"
      : "m"
    : "";
  return normalizeKey(`${letter}${accidental}${mode}`);
};

const tokenize = (q: string | undefined | null) => {
  if (!q) return { include: [] as string[], exclude: [] as string[] };
  const parts = q
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const include: string[] = [];
  const exclude: string[] = [];
  for (const p of parts) {
    if (p.startsWith("-")) exclude.push(p.slice(1).toLowerCase());
    else include.push(p.toLowerCase());
  }
  return { include, exclude };
};

const pathMatchesQuery = (p: string, include: string[], exclude: string[]) => {
  const hay = p.toLowerCase();
  for (const ex of exclude) if (hay.includes(ex)) return false;
  for (const inc of include) if (!hay.includes(inc)) return false;
  return true;
};

const statSafe = (p: string) => {
  try {
    return fs.statSync(p);
  } catch { return null; }
};

const isDir = (p: string) => {
  const s = statSafe(p);
  return !!s && s.isDirectory();
};

const defaultRoots = (): string[] => {
  const env = process.env.SAMPLE_DIRS;
  const fromEnv = env
    ? env
        .split(/[;,]/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];
  const candidates = [
    ...fromEnv,
    "~/Music/Ableton/User Library/Samples",
    "~/Music/Ableton/User Library",
    "~/Music/Samples",
    "~/Samples",
    "~/Downloads",
  ].map(expandHome);
  const uniq: string[] = [];
  for (const c of candidates) {
    if (!uniq.includes(c) && isDir(c)) uniq.push(c);
  }
  return uniq;
};

export async function searchSamples(opts: SampleSearchOptions = {}): Promise<SampleMatch[]> {
  const roots = (opts.roots && opts.roots.length ? opts.roots : defaultRoots()).map(expandHome);
  const exts = (opts.exts && opts.exts.length ? opts.exts : DEFAULT_EXTS).map((e) => e.toLowerCase());
  const { include, exclude } = tokenize(opts.query);
  const limit = Math.max(1, opts.limit ?? DEFAULT_LIMIT);
  const maxDepth = Math.max(1, opts.maxDepth ?? DEFAULT_MAX_DEPTH);

  const results: SampleMatch[] = [];

  const walk = async (dir: string, depth: number) => {
    if (results.length >= limit) return; // early stop
    if (depth > maxDepth) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= limit) return; // early stop
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIR_NAMES.has(entry.name)) {
          await walk(full, depth + 1);
        }
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).slice(1).toLowerCase();
      if (!exts.includes(ext)) continue;

      const base = entry.name;
      const composed = `${full} ${base}`;
      if (!pathMatchesQuery(composed, include, exclude)) continue;

      const bpm = parseBpmFromName(base);
      if (typeof opts.bpmMin === "number" && (bpm ?? -Infinity) < opts.bpmMin) continue;
      if (typeof opts.bpmMax === "number" && (bpm ?? Infinity) > opts.bpmMax) continue;

      const keyParsed = parseKeyFromName(base);
      const keyFilter = normalizeKey(opts.key ?? undefined);
      if (keyFilter && keyParsed && keyFilter !== keyParsed) continue;
      if (keyFilter && !keyParsed) continue;

      const st = statSafe(full);
      results.push({
        path: full,
        name: base,
        ext,
        sizeBytes: st?.size ?? null,
        mtimeMs: st?.mtimeMs ?? null,
        bpm: bpm ?? undefined,
        musicalKey: keyParsed ?? undefined,
      });
    }
  };

  for (const root of roots) {
    if (results.length >= limit) break;
    await walk(root, 0);
  }

  // sort: prefer query matches (already filtered), then BPM closeness to midpoint of range, then recent
  const targetMid = typeof opts.bpmMin === "number" && typeof opts.bpmMax === "number"
    ? (opts.bpmMin + opts.bpmMax) / 2
    : typeof opts.bpmMin === "number"
      ? opts.bpmMin
      : typeof opts.bpmMax === "number"
        ? opts.bpmMax
        : undefined;
  results.sort((a, b) => {
    const aScore = targetMid && a.bpm ? Math.abs(a.bpm - targetMid) : 0;
    const bScore = targetMid && b.bpm ? Math.abs(b.bpm - targetMid) : 0;
    if (aScore !== bScore) return aScore - bScore;
    const am = a.mtimeMs ?? 0;
    const bm = b.mtimeMs ?? 0;
    return bm - am;
  });

  return results.slice(0, limit);
}

