import { createClient } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;
type JsonValue = string | number | boolean | null | {
  [key: string]: JsonValue | undefined;
} | JsonValue[];
type TraceTable<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
type TraceDatabase = {
  public: {
    Tables: {
      mc_trace_accounts: TraceTable<
        {
          uuid: string;
          username: string;
          first_seen: number;
          last_seen: number;
          updated: number;
        },
        {
          uuid: string;
          username: string;
          first_seen?: number;
          last_seen?: number;
          updated?: number;
        },
        {
          uuid?: string;
          username?: string;
          first_seen?: number;
          last_seen?: number;
          updated?: number;
        }
      >;
      mc_trace_logins: TraceTable<
        {
          id: string;
          uuid: string;
          occurred: number;
          ip_fingerprint: string;
          source: string;
        },
        {
          id?: string;
          uuid: string;
          occurred: number;
          ip_fingerprint?: string;
          source?: string;
        },
        {
          id?: string;
          uuid?: string;
          occurred?: number;
          ip_fingerprint?: string;
          source?: string;
        }
      >;
      mc_trace_notes: TraceTable<
        {
          id: number;
          uuid: string;
          author: string;
          body: string;
          created: number;
        },
        {
          id?: number;
          uuid: string;
          author: string;
          body: string;
          created: number;
        },
        {
          id?: number;
          uuid?: string;
          author?: string;
          body?: string;
          created?: number;
        }
      >;
      mc_trace_conversations: TraceTable<
        {
          id: number;
          uuid: string;
          author: string;
          body: string;
          evidence: string;
          created: number;
        },
        {
          id?: number;
          uuid: string;
          author: string;
          body: string;
          evidence?: string;
          created: number;
        },
        {
          id?: number;
          uuid?: string;
          author?: string;
          body?: string;
          evidence?: string;
          created?: number;
        }
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      trace_auth_attempt: {
        Args: { p_address_hash: string; p_action: string };
        Returns: { blocked: boolean; retryAfter: number };
      };
      trace_sync_records: {
        Args: { p_records: JsonValue };
        Returns: { ok: boolean; accounts: number; loginEvents: number };
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const namePattern = /^[A-Za-z0-9_]{3,16}$/;
const encoder = new TextEncoder();
const defaultOrigins = [
  "https://crownpvp.com",
  "https://www.crownpvp.com",
  "http://localhost:8788",
];

function createTraceClient(url: string, key: string) {
  return createClient<TraceDatabase>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(body: unknown, status: number, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...Object.fromEntries(new Headers(headers)),
    },
  });
}

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown, limit: number) {
  return String(value ?? "").replace(
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,
    "",
  ).trim().slice(0, limit);
}

function equalSecret(actual: string, expected: string) {
  if (!actual || actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actual.length; i++) {
    mismatch |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/,
    "",
  );
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
  );
}

async function signSession(secret: string) {
  const body = base64Url(
    encoder.encode(
      JSON.stringify({ role: "trace-owner", exp: Date.now() + 30 * 60 * 1000 }),
    ),
  );
  return `${body}.${base64Url(await hmac(secret, body))}`;
}

async function validSession(secret: string, token: string) {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return false;
  try {
    if (!equalSecret(signature, base64Url(await hmac(secret, body)))) {
      return false;
    }
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(body)));
    return payload?.role === "trace-owner" &&
      Number.isSafeInteger(payload.exp) && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function normalizeIp(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 64) return null;
  const address = value.trim();
  if (!address) return null;
  if (address.includes(":")) {
    try {
      return new URL(`http://[${address}]/`).hostname.slice(1, -1)
        .toLowerCase();
    } catch {
      return null;
    }
  }
  const octets = address.split(".");
  if (
    octets.length !== 4 ||
    octets.some((part) =>
      !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255
    )
  ) return null;
  return octets.map(Number).join(".");
}

function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const configured = (Deno.env.get("TRACE_ALLOWED_ORIGINS") || "").split(",")
    .map((value) => value.trim()).filter(Boolean);
  return [...defaultOrigins, ...configured].includes(origin);
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "apikey, content-type, x-owner-session",
    "access-control-max-age": "600",
    "vary": "Origin",
  });
  if (origin && originAllowed(request)) {
    headers.set("access-control-allow-origin", origin);
  }
  return headers;
}

function reply(request: Request, body: unknown, status = 200) {
  return json(body, status, corsHeaders(request));
}

async function readJson(
  request: Request,
  maxBytes = 2_000_000,
): Promise<JsonRecord | null> {
  const raw = await request.text();
  if (encoder.encode(raw).byteLength > maxBytes) {
    throw new Error("Request body is too large.");
  }
  try {
    return record(JSON.parse(raw));
  } catch {
    return null;
  }
}

function errorResponse(
  error: { message?: string } | null,
  message: string,
  status = 500,
) {
  if (error) console.error("Trace database request failed.");
  return { error: message, status };
}

async function authenticate(
  request: Request,
  supabase: ReturnType<typeof createTraceClient>,
  ownerKey: string,
  sessionSecret: string,
) {
  const data = await readJson(request, 4096);
  const password = typeof data?.password === "string" ? data.password : "";
  const forwarded =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const addressHash = Array.from(
    await hmac(sessionSecret, `trace-login-ip:${forwarded}`),
  )
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");

  const { data: rate, error: rateError } = await supabase.rpc(
    "trace_auth_attempt",
    {
      p_address_hash: addressHash,
      p_action: "check",
    },
  );
  if (rateError) {
    return {
      error: "Authentication service is temporarily unavailable.",
      status: 503,
    };
  }
  if (rate?.blocked) {
    return {
      error:
        `Too many failed attempts. Try again in ${rate.retryAfter} seconds.`,
      status: 429,
    };
  }
  if (!password || password.length > 256 || !equalSecret(password, ownerKey)) {
    const { data: failed, error } = await supabase.rpc("trace_auth_attempt", {
      p_address_hash: addressHash,
      p_action: "failure",
    });
    if (error) {
      return {
        error: "Authentication service is temporarily unavailable.",
        status: 503,
      };
    }
    if (failed?.blocked) {
      return {
        error: "Too many failed attempts. Try again in 15 minutes.",
        status: 429,
      };
    }
    return { error: "The owner password is incorrect.", status: 401 };
  }
  const { error: resetError } = await supabase.rpc("trace_auth_attempt", {
    p_address_hash: addressHash,
    p_action: "success",
  });
  if (resetError) {
    return {
      error: "Authentication service is temporarily unavailable.",
      status: 503,
    };
  }
  return { session: await signSession(sessionSecret) };
}

async function summary(supabase: ReturnType<typeof createTraceClient>) {
  const [accounts, logins, conversations, notes, latest] = await Promise.all([
    supabase.from("mc_trace_accounts").select("uuid", {
      count: "exact",
      head: true,
    }),
    supabase.from("mc_trace_logins").select("id", {
      count: "exact",
      head: true,
    }),
    supabase.from("mc_trace_conversations").select("id", {
      count: "exact",
      head: true,
    }),
    supabase.from("mc_trace_notes").select("id", {
      count: "exact",
      head: true,
    }),
    supabase.from("mc_trace_logins").select("occurred").order("occurred", {
      ascending: false,
    }).limit(1).maybeSingle(),
  ]);
  const error = accounts.error || logins.error || conversations.error ||
    notes.error || latest.error;
  if (error) {
    return errorResponse(
      error,
      "Authorized trace records could not be loaded.",
    );
  }
  return {
    accounts: accounts.count || 0,
    logins: logins.count || 0,
    conversations: conversations.count || 0,
    notes: notes.count || 0,
    latest: latest.data?.occurred || null,
    server: "play.pika-network.net",
  };
}

async function search(
  supabase: ReturnType<typeof createTraceClient>,
  rawQuery: string,
) {
  const query = text(rawQuery, 40);
  if (query.length < 3) {
    return { error: "Enter a username or UUID.", status: 400 };
  }
  const uuidQuery = query.toLowerCase();
  if (!uuidPattern.test(uuidQuery) && !namePattern.test(query)) {
    return { error: "Enter a valid Minecraft username or UUID.", status: 400 };
  }
  const accountQuery = supabase.from("mc_trace_accounts").select(
    "uuid,username,first_seen,last_seen,updated",
  );
  const accountResult =
    await (uuidPattern.test(uuidQuery)
      ? accountQuery.eq("uuid", uuidQuery)
      : accountQuery.ilike("username", query))
      .limit(1)
      .maybeSingle();
  if (accountResult.error) {
    return errorResponse(
      accountResult.error,
      "Authorized trace records could not be loaded.",
    );
  }
  const account = accountResult.data;
  if (!account) {
    return {
      error: "No authorized record was found for this player.",
      status: 404,
    };
  }

  const uuid = String(account.uuid).toLowerCase();
  const [loginResult, noteResult, conversationResult] = await Promise.all([
    supabase.from("mc_trace_logins").select("occurred,ip_fingerprint,source")
      .eq("uuid", uuid).order("occurred", { ascending: false }).limit(200),
    supabase.from("mc_trace_notes").select("id,author,body,created").eq(
      "uuid",
      uuid,
    ).order("created", { ascending: false }).limit(100),
    supabase.from("mc_trace_conversations").select(
      "id,author,body,evidence,created",
    ).eq("uuid", uuid).order("created", { ascending: false }).limit(100),
  ]);
  const error = loginResult.error || noteResult.error ||
    conversationResult.error;
  if (error) {
    return errorResponse(error, "The player report could not be loaded.");
  }

  const ownLogins = loginResult.data || [];
  const fingerprints = [
    ...new Set(
      ownLogins.map((row) => row.ip_fingerprint).filter((
        value,
      ): value is string => Boolean(value)),
    ),
  ];
  let possibleAlts: JsonRecord[] = [];
  if (fingerprints.length) {
    const peersResult = await supabase.from("mc_trace_logins").select("uuid")
      .in("ip_fingerprint", fingerprints).neq("uuid", uuid).limit(5000);
    if (peersResult.error) {
      return errorResponse(
        peersResult.error,
        "Account correlations could not be loaded.",
      );
    }
    const peerUuids = [
      ...new Set((peersResult.data || []).map((row) => String(row.uuid))),
    ];
    if (peerUuids.length) {
      const [accountsResult, peerLoginsResult] = await Promise.all([
        supabase.from("mc_trace_accounts").select("uuid,username").in(
          "uuid",
          peerUuids,
        ).limit(50),
        supabase.from("mc_trace_logins").select("uuid,occurred,ip_fingerprint")
          .in("uuid", peerUuids)
          .gte("occurred", Date.now() - 90 * 86400000).order("occurred", {
            ascending: false,
          }).limit(3000),
      ]);
      if (accountsResult.error || peerLoginsResult.error) {
        return errorResponse(
          accountsResult.error || peerLoginsResult.error,
          "Account correlations could not be loaded.",
        );
      }
      const accountByUuid = new Map(
        (accountsResult.data || []).map(
          (row) => [String(row.uuid), String(row.username)],
        ),
      );
      const loginByUuid = new Map<string, typeof peerLoginsResult.data>();
      for (const row of peerLoginsResult.data || []) {
        const key = String(row.uuid);
        const rows = loginByUuid.get(key) || [];
        rows.push(row);
        loginByUuid.set(key, rows);
      }
      const ownRecent = ownLogins.filter((row) =>
        Number(row.occurred) >= Date.now() - 90 * 86400000
      );
      for (const peerUuid of peerUuids) {
        const matchingDays = new Set<string>();
        for (const own of ownRecent) {
          for (const other of loginByUuid.get(peerUuid) || []) {
            if (
              own.ip_fingerprint &&
              own.ip_fingerprint === other.ip_fingerprint &&
              Math.abs(Number(own.occurred) - Number(other.occurred)) <=
                30 * 60 * 1000 &&
              new Date(Number(own.occurred)).toISOString().slice(0, 10) ===
                new Date(Number(other.occurred)).toISOString().slice(0, 10)
            ) {
              matchingDays.add(
                new Date(Number(own.occurred)).toISOString().slice(0, 10),
              );
            }
          }
        }
        if (matchingDays.size >= 3 && accountByUuid.has(peerUuid)) {
          possibleAlts.push({
            uuid: peerUuid,
            username: accountByUuid.get(peerUuid),
            confidence: matchingDays.size >= 5 ? "MODERATE" : "LOW",
            matchingDays: matchingDays.size,
            evidence: [
              "Repeated shared-network fingerprint",
              `${matchingDays.size} separate days with logins within 30 minutes`,
            ],
            caution:
              "A possible lead only; household, campus, VPN, and shared-network use can explain overlap.",
          });
        }
      }
      possibleAlts.sort((a, b) =>
        Number(b.matchingDays) - Number(a.matchingDays)
      );
      possibleAlts = possibleAlts.slice(0, 10);
    }
  }

  return {
    account: {
      uuid,
      username: account.username,
      firstSeen: account.first_seen || null,
      lastSeen: account.last_seen || null,
      updated: account.updated || null,
      ipAddress: null,
    },
    logins: ownLogins.map((row) => ({
      occurred: row.occurred,
      networkFingerprint: row.ip_fingerprint
        ? "stored; address discarded"
        : null,
      source: row.source,
    })),
    notes: noteResult.data || [],
    conversations: conversationResult.data || [],
    possibleAlts,
  };
}

async function writeRecord(
  supabase: ReturnType<typeof createTraceClient>,
  path: string,
  data: JsonRecord,
) {
  const uuid = text(data.uuid, 40).toLowerCase();
  const body = text(data.body, path === "/notes" ? 3000 : 5000);
  if (!uuidPattern.test(uuid)) {
    return { error: "A valid player UUID is required.", status: 400 };
  }
  if (!body) {
    return { error: "Write a note or conversation record.", status: 400 };
  }
  const account = await supabase.from("mc_trace_accounts").select("uuid").eq(
    "uuid",
    uuid,
  ).maybeSingle();
  if (account.error) {
    return errorResponse(
      account.error,
      "The player record could not be verified.",
    );
  }
  if (!account.data) {
    return {
      error: "Import an authorized player record before adding linked records.",
      status: 404,
    };
  }
  const created = Date.now();
  const author = text(Deno.env.get("TRACE_OWNER_NAME") || "Owner", 60);
  const result = path === "/notes"
    ? await supabase.from("mc_trace_notes").insert({
      uuid,
      author,
      body,
      created,
    }).select("id").single()
    : await supabase.from("mc_trace_conversations").insert({
      uuid,
      author,
      body,
      evidence: text(data.evidence, 1000),
      created,
    }).select("id").single();
  if (result.error) {
    return errorResponse(
      result.error,
      "The private record could not be saved.",
    );
  }
  return { ok: true, id: result.data.id };
}

async function syncRecords(
  request: Request,
  supabase: ReturnType<typeof createTraceClient>,
) {
  const syncToken = Deno.env.get("TRACE_SYNC_TOKEN") || "";
  const fingerprintSecret = Deno.env.get("TRACE_FINGERPRINT_SECRET") || "";
  const authorization = request.headers.get("authorization") || "";
  if (
    !syncToken ||
    !equalSecret(authorization.replace(/^Bearer\s+/i, ""), syncToken)
  ) {
    return { error: "Unauthorized.", status: 401 };
  }
  if (!fingerprintSecret) {
    return { error: "Trace ingestion is not configured.", status: 503 };
  }
  const data = await readJson(request);
  if (!data || !Array.isArray(data.records) || data.records.length > 500) {
    return {
      error: "Provide up to 500 authorized player records.",
      status: 400,
    };
  }

  const now = Date.now();
  let loginCount = 0;
  const records: JsonValue[] = [];
  for (const value of data.records) {
    const item = record(value);
    const uuid = text(item?.uuid, 40).toLowerCase();
    const name = text(item?.name, 16);
    if (!item || !uuidPattern.test(uuid) || !namePattern.test(name)) {
      return {
        error: "Every record needs a valid Minecraft UUID and username.",
        status: 400,
      };
    }
    if (item.logins !== undefined && !Array.isArray(item.logins)) {
      return { error: "Login events must be an array.", status: 400 };
    }
    const logins = Array.isArray(item.logins) ? item.logins : [];
    if (logins.length > 100 || loginCount + logins.length > 2000) {
      return {
        error: "A sync may contain at most 2,000 login events.",
        status: 400,
      };
    }
    loginCount += logins.length;
    const normalizedLogins = [];
    for (const value of logins) {
      const login = record(value);
      const at = Number(login?.at);
      if (!Number.isSafeInteger(at) || at < 0 || at > now + 300_000) {
        return {
          error:
            "Login timestamps must be Unix milliseconds and cannot be in the future.",
          status: 400,
        };
      }
      let ipFingerprint = "";
      if (
        login?.ip !== undefined && login.ip !== null && String(login.ip).trim()
      ) {
        const address = normalizeIp(login.ip);
        if (!address) {
          return { error: "A login address is malformed.", status: 400 };
        }
        ipFingerprint = Array.from(
          await hmac(fingerprintSecret, `trace-ip:${address}`),
        )
          .map((byte) => byte.toString(16).padStart(2, "0")).join("");
      }
      normalizedLogins.push({
        at,
        ip_fingerprint: ipFingerprint,
        source: text(login?.source || "authorized bridge", 80),
      });
    }
    records.push({ uuid, name, logins: normalizedLogins });
  }
  const { data: result, error } = await supabase.rpc("trace_sync_records", {
    p_records: records,
  });
  if (error) {
    return errorResponse(error, "Could not store authorized trace records.");
  }
  return result ||
    { ok: true, accounts: records.length, loginEvents: loginCount };
}

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (!originAllowed(request)) {
    return reply(request, { error: "Origin is not allowed." }, 403);
  }
  if (!["GET", "POST"].includes(request.method)) {
    return reply(request, { error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ownerKey = Deno.env.get("TRACE_OWNER_KEY");
  const sessionSecret = Deno.env.get("TRACE_SESSION_SECRET");
  if (
    !supabaseUrl || !serviceRoleKey || !ownerKey || !sessionSecret ||
    sessionSecret.length < 32
  ) {
    return reply(request, {
      error:
        "Trace authentication is not configured. Contact the site administrator.",
    }, 503);
  }

  const supabase = createTraceClient(supabaseUrl, serviceRoleKey);
  const url = new URL(request.url);
  const suffix = url.pathname.split("/functions/v1/trace-api")[1] || "";
  const path = suffix.replace(/\/+$/, "") || "/";

  try {
    if (path === "/auth" && request.method === "POST") {
      const result = await authenticate(
        request,
        supabase,
        ownerKey,
        sessionSecret,
      );
      return reply(request, result, Number(result.status) || 200);
    }
    if (path === "/sync" && request.method === "POST") {
      const result = await syncRecords(request, supabase);
      return reply(request, result, Number(record(result)?.status) || 200);
    }

    const session = request.headers.get("x-owner-session") || "";
    if (!await validSession(sessionSecret, session)) {
      return reply(request, {
        error: "Your session is invalid or expired. Sign in again.",
      }, 401);
    }
    if (path === "/summary" && request.method === "GET") {
      const result = await summary(supabase);
      return reply(request, result, Number(record(result)?.status) || 200);
    }
    if (path === "/search" && request.method === "GET") {
      const result = await search(supabase, url.searchParams.get("q") || "");
      return reply(request, result, Number(record(result)?.status) || 200);
    }
    if (
      (path === "/notes" || path === "/conversations") &&
      request.method === "POST"
    ) {
      const data = await readJson(request, 16_384);
      if (!data) return reply(request, { error: "Invalid request body." }, 400);
      const result = await writeRecord(supabase, path, data);
      return reply(request, result, Number(record(result)?.status) || 200);
    }
    return reply(request, { error: "Not found." }, 404);
  } catch (error) {
    if (
      error instanceof Error && error.message === "Request body is too large."
    ) {
      return reply(request, { error: error.message }, 413);
    }
    console.error("Trace API request failed.");
    return reply(request, {
      error: "Trace service could not complete the request.",
    }, 500);
  }
});
