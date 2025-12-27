import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const ALLOWED_HOSTS = new Set([
  "mapzamurai.com",
  "www.mapzamurai.com",
  "staging.mapzamurai.com",
]);

const DEFAULT_PREFIX = "/l/";
const SHORT_DOMAIN = "http://localhost:3000";

type ShortLinkRecord = {
  code: string;
  longUrl: string;
  createdAt: string;
  createdBy: string;
  accessCount: number;
  lastAccessedAt: string | null;
  disabled: boolean;
  disabledReason: string | null;
};

type DbShape = {
  links: ShortLinkRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "shortlinks.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ links: [] }, null, 2));
  }
}

function loadDb(): DbShape {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as DbShape;
}

function saveDb(db: DbShape) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function randomBase58(len = 4) {
  let out = "";
  for (let i = 0; i < len; i++) {
    const idx = Math.floor(Math.random() * BASE58.length);
    out += BASE58[idx];
  }
  return out;
}

function normalizeUrl(input: string) {
  return input.trim();
}

function validateMapZamuraiUrl(urlString: string): { ok: true; url: string } | { ok: false; error: string } {
  let u: URL;
  try {
    u = new URL(urlString);
  } catch {
    return { ok: false, error: "Invalid URL format." };
  }

  if (!["http:", "https:"].includes(u.protocol)) {
    return { ok: false, error: "URL must start with http:// or https://." };
  }

  if (!ALLOWED_HOSTS.has(u.hostname)) {
    return { ok: false, error: "URL host must be mapzamurai.com (or approved staging host)." };
  }

  return { ok: true, url: u.toString() };
}

function generateUniqueCode(db: DbShape, len = 4, maxTries = 20) {
  const used = new Set(db.links.map((x) => x.code));
  for (let i = 0; i < maxTries; i++) {
    const code = randomBase58(len);
    if (!used.has(code)) return code;
  }
  // fallback to 5 chars if unlucky
  for (let i = 0; i < maxTries; i++) {
    const code = randomBase58(len + 1);
    if (!used.has(code)) return code;
  }
  throw new Error("Unable to generate a unique code. Try again.");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const longUrlRaw = typeof body?.url === "string" ? body.url : "";

    const normalized = normalizeUrl(longUrlRaw);
    const v = validateMapZamuraiUrl(normalized);
    if (!v.ok) {
      return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
    }

    const db = loadDb();

    // If same URL already exists, reuse it (nice UX)
    const existing = db.links.find((x) => x.longUrl === v.url);
    if (existing) {
      const shortUrl = `${SHORT_DOMAIN}${DEFAULT_PREFIX}${existing.code}`;
      return NextResponse.json({
        ok: true,
        reused: true,
        code: existing.code,
        shortUrl,
        longUrl: existing.longUrl,
      });
    }

    const code = generateUniqueCode(db, 4);

    const record: ShortLinkRecord = {
      code,
      longUrl: v.url,
      createdAt: new Date().toISOString(),
      createdBy: "local-tool",
      accessCount: 0,
      lastAccessedAt: null,
      disabled: false,
      disabledReason: null,
    };

    db.links.push(record);
    saveDb(db);

    const shortUrl = `${SHORT_DOMAIN}${DEFAULT_PREFIX}${code}`;

    return NextResponse.json({
      ok: true,
      reused: false,
      code,
      shortUrl,
      longUrl: v.url,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
