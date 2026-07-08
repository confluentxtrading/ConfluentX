import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Temporary deploy diagnostic — reports DB connectivity without leaking secrets. */
export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  const urlShape = {
    present: url.length > 0,
    startsWithQuote: url.startsWith('"') || url.startsWith("'"),
    startsWithPostgres: url.startsWith("postgresql://") || url.startsWith("postgres://"),
    length: url.length,
  };

  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "connected", urlShape });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        urlShape,
        error: error instanceof Error ? error.message.slice(0, 600) : "unknown",
      },
      { status: 500 }
    );
  }
}
