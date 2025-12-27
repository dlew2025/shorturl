import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

const DATA_FILE = path.join(process.cwd(), "data", "shortlinks.json");

function loadDb(): DbShape {
  if (!fs.existsSync(DATA_FILE)) return { links: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as DbShape;
}

function saveDb(db: DbShape) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;

  const db = loadDb();
  const rec = db.links.find((x) => x.code === code);

  if (!rec || rec.disabled) {
    return new NextResponse("Short link not found", { status: 404 });
  }

  rec.accessCount = (rec.accessCount || 0) + 1;
  rec.lastAccessedAt = new Date().toISOString();
  saveDb(db);

  return NextResponse.redirect(rec.longUrl, 302);
}
