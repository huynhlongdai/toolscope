import { corsHeaders, requireAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const supabase = auth.supabase;

    const { tool_id, batch } = await req.json();

    let toolsToCheck: any[] = [];

    if (batch) {
      const { data } = await supabase
        .from("tools")
        .select("id, name, website_url, status")
        .eq("status", "published")
        .not("website_url", "is", null)
        .limit(500);
      toolsToCheck = data ?? [];
    } else if (tool_id) {
      const { data } = await supabase
        .from("tools")
        .select("id, name, website_url, status")
        .eq("id", tool_id)
        .single();
      if (data) toolsToCheck = [data];
    }

    if (toolsToCheck.length === 0) {
      return new Response(JSON.stringify({ checked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const tool of toolsToCheck) {
      if (!tool.website_url) continue;

      let health_status = "unknown";
      let health_details = "";

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(tool.website_url, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "manual",
        });

        clearTimeout(timeout);
        const status = res.status;

        if (status >= 200 && status < 300) {
          health_status = "active";
          health_details = `HTTP ${status}`;
        } else if (status === 301 || status === 302 || status === 307 || status === 308) {
          const location = res.headers.get("location") || "";
          try {
            const originalHost = new URL(tool.website_url).hostname.replace("www.", "");
            const redirectHost = location ? new URL(location, tool.website_url).hostname.replace("www.", "") : "";
            if (redirectHost && redirectHost !== originalHost) {
              health_status = "warning";
              health_details = `Redirect to ${redirectHost}`;
            } else {
              health_status = "active";
              health_details = `Redirect ${status} (same domain)`;
            }
          } catch {
            health_status = "warning";
            health_details = `Redirect ${status}: ${location}`;
          }
        } else if (status === 403) {
          // Many sites block HEAD requests, try GET
          try {
            const getRes = await fetch(tool.website_url, {
              method: "GET",
              signal: AbortSignal.timeout(10000),
              redirect: "follow",
            });
            if (getRes.status >= 200 && getRes.status < 400) {
              health_status = "active";
              health_details = `HTTP ${getRes.status} (GET fallback)`;
            } else {
              health_status = "warning";
              health_details = `HTTP ${status} (HEAD), ${getRes.status} (GET)`;
            }
          } catch {
            health_status = "warning";
            health_details = `HTTP ${status}`;
          }
        } else if (status === 404) {
          health_status = "dead";
          health_details = "HTTP 404 Not Found";
        } else if (status >= 500) {
          health_status = "dead";
          health_details = `HTTP ${status} Server Error`;
        } else {
          health_status = "warning";
          health_details = `HTTP ${status}`;
        }
      } catch (e: any) {
        if (e.name === "AbortError") {
          health_status = "dead";
          health_details = "Timeout (10s)";
        } else if (e.message?.includes("dns") || e.message?.includes("DNS") || e.message?.includes("getaddrinfo")) {
          health_status = "dead";
          health_details = "DNS_FAIL";
        } else {
          health_status = "dead";
          health_details = e.message?.substring(0, 100) || "Connection failed";
        }
      }

      // Update tool
      const updateData: any = {
        health_status,
        health_checked_at: new Date().toISOString(),
        health_details,
      };

      // Auto-archive dead tools
      if (health_status === "dead" && tool.status === "published") {
        updateData.status = "archived";
      }

      await supabase.from("tools").update(updateData).eq("id", tool.id);

      // Notify admins for dead/warning tools
      if (health_status === "dead" || health_status === "warning") {
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .limit(5);

        if (admins) {
          const emoji = health_status === "dead" ? "🔴" : "🟡";
          const notifications = admins.map((a: any) => ({
            user_id: a.user_id,
            type: "health_check",
            title: `${emoji} ${tool.name}: ${health_status}`,
            message: health_details,
            link: "/admin/tools",
          }));
          await supabase.from("notifications").insert(notifications);
        }
      }

      results.push({ id: tool.id, name: tool.name, health_status, health_details });
    }

    return new Response(JSON.stringify({ checked: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
