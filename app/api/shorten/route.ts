import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DEFAULT_PREFIX = "/share/";
// const SHORT_DOMAIN = "http://localhost:3000";

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
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveDb(db: DbShape) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function randomBase58(len = 4) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += BASE58[Math.floor(Math.random() * BASE58.length)];
  }
  return out;
}

export async function POST(req: Request) {
  const body = await req.json();
  const longUrl = body.url;

  if (!longUrl) {
    return NextResponse.json({ ok: false, error: "Missing URL" }, { status: 400 });
  }

  const db = loadDb();

  const existing = db.links.find((x) => x.longUrl === longUrl);
  if (existing) {
    return NextResponse.json({
      ok: true,
      shortUrl: `${req.headers.get("origin")}${DEFAULT_PREFIX}${existing.code}`,
    });
  }

  let code = randomBase58(4);
  while (db.links.some((x) => x.code === code)) {
    code = randomBase58(4);
  }

  db.links.push({
    code,
    longUrl,
    createdAt: new Date().toISOString(),
    createdBy: "local-tool",
    accessCount: 0,
    lastAccessedAt: null,
    disabled: false,
    disabledReason: null,
  });

  saveDb(db);

  return NextResponse.json({
    ok: true,
    shortUrl: `${req.headers.get("origin")}${DEFAULT_PREFIX}${code}`,
  });
}
