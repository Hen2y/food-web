import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_TABLE = "allergy_profiles";

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

function toClientProfile(row) {
  return {
    id: row.profile_id,
    name: row.name || "未命名",
    allergens: Array.isArray(row.allergens) ? row.allergens.map(String).filter(Boolean) : [],
    sensitivity: row.sensitivity === "high" ? "high" : "normal",
  };
}

function toDatabaseProfile(profile) {
  const rawAllergens = Array.isArray(profile.allergens) ? profile.allergens : [];
  return {
    profile_id: String(profile.id || `p_${Date.now()}`).slice(0, 80),
    name: String(profile.name || "未命名").trim().slice(0, 120),
    allergens: rawAllergens.map((item) => String(item).trim()).filter(Boolean).slice(0, 40),
    sensitivity: profile.sensitivity === "high" ? "high" : "normal",
    updated_at: new Date().toISOString(),
  };
}

function getProviderError(payload) {
  const message = payload?.message || payload?.hint || payload?.details;
  if (/relation .* does not exist|schema cache|not found/i.test(String(message || ""))) {
    return "Supabase 还没有创建 allergy_profiles 表。请先运行更新后的 supabase-schema.sql。";
  }
  return message || "Supabase 档案操作失败";
}

export async function GET() {
  const { url, serviceRoleKey, configured } = getSupabaseConfig();
  if (!configured) {
    return NextResponse.json({ configured: false, profiles: [] });
  }

  const response = await fetch(
    `${url}/rest/v1/${SUPABASE_TABLE}?select=*&order=updated_at.desc`,
    { headers: supabaseHeaders(serviceRoleKey), cache: "no-store" }
  );

  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    return NextResponse.json({ error: getProviderError(payload) }, { status: 502 });
  }

  return NextResponse.json({
    configured: true,
    profiles: Array.isArray(payload) ? payload.map(toClientProfile) : [],
  });
}

export async function POST(request) {
  const { url, serviceRoleKey, configured } = getSupabaseConfig();
  if (!configured) {
    return NextResponse.json({ configured: false, saved: false });
  }

  const body = await request.json().catch(() => ({}));
  const profiles = Array.isArray(body.profiles) ? body.profiles : [body.profile || body];
  const rows = profiles.map(toDatabaseProfile).filter((profile) => profile.name);

  if (!rows.length) {
    return NextResponse.json({ error: "没有可保存的过敏原档案" }, { status: 400 });
  }

  const response = await fetch(`${url}/rest/v1/${SUPABASE_TABLE}?on_conflict=profile_id`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(serviceRoleKey),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });

  const payload = await response.json().catch(() => []);
  if (!response.ok) {
    return NextResponse.json({ error: getProviderError(payload) }, { status: 502 });
  }

  const savedProfiles = Array.isArray(payload) ? payload.map(toClientProfile) : [];
  return NextResponse.json({ configured: true, saved: true, profiles: savedProfiles });
}

export async function DELETE(request) {
  const { url, serviceRoleKey, configured } = getSupabaseConfig();
  if (!configured) {
    return NextResponse.json({ configured: false, deleted: false });
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "缺少档案 ID" }, { status: 400 });
  }

  const response = await fetch(`${url}/rest/v1/${SUPABASE_TABLE}?profile_id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...supabaseHeaders(serviceRoleKey),
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json({ error: getProviderError(payload) }, { status: 502 });
  }

  return NextResponse.json({ configured: true, deleted: true });
}
