import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();

  const { data: sessions, error } = await sb
    .from("developer_sessions")
    .select(`
      developer_id,
      session_id,
      status,
      current_language,
      last_heartbeat_at,
      developers!inner(github_login, avatar_url)
    `)
    .in("status", ["active", "idle"])
    .gte("last_heartbeat_at", cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Deduplicate by developer (keep latest session)
  const byDev = new Map<number, (typeof sessions)[number]>();
  for (const s of sessions ?? []) {
    const existing = byDev.get(s.developer_id);
    if (!existing || s.last_heartbeat_at > existing.last_heartbeat_at) {
      byDev.set(s.developer_id, s);
    }
  }

  let developers = Array.from(byDev.values()).map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dev = s.developers as any;
    return {
      githubLogin: dev.github_login,
      avatarUrl: dev.avatar_url,
      status: s.status,
      language: s.current_language,
    };
  });

  // --- SHOWCASE MODE: Mock coding presence if local is empty ---
  if (developers.length === 0) {
    developers = [
      {
        githubLogin: "srizzon",
        avatarUrl: "https://github.com/srizzon.png",
        status: "active",
        language: "TypeScript",
      },
      {
        githubLogin: "gregberge",
        avatarUrl: "https://github.com/gregberge.png",
        status: "active",
        language: "JavaScript",
      },
      {
        githubLogin: "shadcn",
        avatarUrl: "https://github.com/shadcn.png",
        status: "idle",
        language: "React",
      },
      {
        githubLogin: "gaearon",
        avatarUrl: "https://github.com/gaearon.png",
        status: "active",
        language: "JavaScript",
      },
    ];
  }

  return NextResponse.json(
    { count: developers.length, developers },
    {
      headers: {
        "Cache-Control": "s-maxage=10, stale-while-revalidate=20",
      },
    },
  );
}
