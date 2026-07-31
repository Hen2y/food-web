import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_TABLE = "scan_records";
const RECORD_LIST_COLUMNS = [
  "id",
  "date_iso",
  "time_label",
  "person",
  "result",
  "notice",
  "status",
  "risk",
  "score",
  "allergen_hit",
  "summary",
  "created_at",
].join(",");

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url, serviceRoleKey, configured: Boolean(url && serviceRoleKey) };
}

function supabaseHeaders(serviceRoleKey) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function toClientRecord(row) {
  const createdAt = row.created_at || new Date().toISOString();
  const date = new Date(createdAt);
  return {
    id: row.id,
    dateISO: row.date_iso || createdAt.slice(0, 10),
    time: row.time_label || date.toLocaleTimeString("zh-Hant", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" }),
    person: row.person || "访客模式",
    result: row.result || "分析完成",
    notice: row.notice || "無",
    status: row.status || "warn",
    risk: row.risk || "medium",
    score: Number(row.score) || 0,
    allergenHit: Boolean(row.allergen_hit),
    image: row.image_data || "",
    createdAt,
  };
}

function toDatabaseRecord(record) {
  return {
    date_iso: String(record.dateISO || "").slice(0, 10),
    time_label: String(record.time || "").slice(0, 20),
    person: String(record.person || "访客模式").slice(0, 120),
    result: String(record.result || "分析完成").slice(0, 200),
    notice: String(record.notice || "無").slice(0, 200),
    status: ["safe", "warn", "danger"].includes(record.status) ? record.status : "warn",
    risk: ["low", "medium", "high"].includes(record.risk) ? record.risk : "medium",
    score: Math.min(100, Math.max(0, Number(record.score) || 0)),
    allergen_hit: Boolean(record.allergenHit),
    summary: String(record.summary || "").slice(0, 500),
    image_data: String(record.image || "").slice(0, 900000),
  };
}

function databaseUnavailable(message = "Supabase 记录暂不可用，已使用本地记录。") {
  return NextResponse.json({
    configured: false,
    records: [],
    saved: false,
    warning: message,
  });
}

export async function GET() {
  try {
    const { url, serviceRoleKey, configured } = getSupabaseConfig();
    if (!configured) {
      return NextResponse.json({ configured: false, records: [] });
    }

    const response = await fetch(
      `${url}/rest/v1/${SUPABASE_TABLE}?select=${RECORD_LIST_COLUMNS}&order=created_at.desc&limit=50`,
      { headers: supabaseHeaders(serviceRoleKey), cache: "no-store" }
    );

    const payload = await response.json().catch(() => []);
    if (!response.ok) {
      return databaseUnavailable(payload?.message || "读取 Supabase 记录失败，已使用本地记录。");
    }

    return NextResponse.json({
      configured: true,
      records: Array.isArray(payload) ? payload.map(toClientRecord) : [],
    });
  } catch (error) {
    return databaseUnavailable(error?.message || "Supabase 记录读取异常，已使用本地记录。");
  }
}

export async function POST(request) {
  try {
    const { url, serviceRoleKey, configured } = getSupabaseConfig();
    if (!configured) {
      return NextResponse.json({ configured: false, saved: false });
    }

    const body = await request.json().catch(() => ({}));
    const record = toDatabaseRecord(body.record || body);

    const response = await fetch(`${url}/rest/v1/${SUPABASE_TABLE}`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(serviceRoleKey),
        Prefer: "return=representation",
      },
      body: JSON.stringify(record),
    });

    const payload = await response.json().catch(() => []);
    if (!response.ok) {
      return NextResponse.json({ configured: false, saved: false, warning: payload?.message || "保存 Supabase 记录失败，已保存在本机。" });
    }

    const saved = Array.isArray(payload) && payload[0] ? toClientRecord(payload[0]) : null;
    return NextResponse.json({ configured: true, saved: true, record: saved });
  } catch (error) {
    return NextResponse.json({ configured: false, saved: false, warning: error?.message || "Supabase 记录保存异常，已保存在本机。" });
  }
}
