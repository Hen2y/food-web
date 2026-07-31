import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOB_TTL_MS = 10 * 60 * 1000;

function getJobStore() {
  if (!globalThis.__safeplateAnalyzeJobs) {
    globalThis.__safeplateAnalyzeJobs = new Map();
  }
  return globalThis.__safeplateAnalyzeJobs;
}

function cleanupJobs() {
  const jobs = getJobStore();
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
}

function getOrigin(request) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request) {
  cleanupJobs();
  try {
    const body = await request.json().catch(() => ({}));
    const payload = body.payload || body;
    const jobId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const jobs = getJobStore();
    jobs.set(jobId, {
      id: jobId,
      status: "running",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      result: null,
      error: "",
    });

    const origin = getOrigin(request);
    const payloadText = JSON.stringify(payload);
    fetch(`${origin}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SafePlate-Job": jobId,
      },
      body: payloadText,
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        const job = jobs.get(jobId);
        if (!job) return;
        job.updatedAt = Date.now();
        if (!response.ok) {
          job.status = "error";
          job.error = data?.error || `AI 分析失败（HTTP ${response.status}）`;
          return;
        }
        job.status = "done";
        job.result = data;
      })
      .catch((error) => {
        const job = jobs.get(jobId);
        if (!job) return;
        job.status = "error";
        job.updatedAt = Date.now();
        job.error = error?.message || "AI 后台任务失败";
      });

    return NextResponse.json({ jobId, status: "running" });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "无法创建 AI 识别任务" }, { status: 500 });
  }
}

export async function GET(request) {
  cleanupJobs();
  const id = new URL(request.url).searchParams.get("id") || "";
  const job = getJobStore().get(id);
  if (!job) {
    return NextResponse.json({ status: "missing", error: "AI 任务不存在或已过期" }, { status: 404 });
  }
  if (job.status === "done") {
    return NextResponse.json({ status: "done", result: job.result });
  }
  if (job.status === "error") {
    return NextResponse.json({ status: "error", error: job.error || "AI 后台任务失败" }, { status: 500 });
  }
  return NextResponse.json({ status: "running" });
}
