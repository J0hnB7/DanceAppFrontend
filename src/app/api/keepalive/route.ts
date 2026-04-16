import { NextResponse } from "next/server";

// Called by Vercel Cron every 5 minutes to keep the Railway backend warm.
// Vercel Cron requires GET or POST — we use GET for simplicity.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const start = Date.now();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/actuator/health`, {
      next: { revalidate: 0 },
    });
    const ms = Date.now() - start;
    return NextResponse.json({ status: res.status, ms });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
