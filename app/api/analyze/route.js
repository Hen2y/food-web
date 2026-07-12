import { NextResponse } from "next/server";
import { expandAllergens } from "./allergenLexicon.js";

export const runtime = "nodejs";

const MAX_IMAGE_LENGTH = 10 * 1024 * 1024;
const SYSTEM_PROMPT = `你是校园食堂的餐盘图像初筛助手。你的结果只能作为风险提示，不能代替人工检查或医疗诊断。
请根据图片识别：1. 可见食物/配料；2. 可能引发过敏的食材；3. 可能有害的异物（玻璃、金属、塑料、头发、昆虫、包装残留等）。
用户登记的过敏原会附带自动扩展词库。请同时检查过敏原本身、常见别名、酱料、加工品和常见含该成分的菜品。
如果图片中能明确看到相关食物/配料，可以给出较高 confidence 并标框；如果只是酱料或隐藏成分“可能含有”，请在 description 写明“可能含有/需询问食堂确认”，confidence 应偏低，box 可圈出可疑菜品区域。
仅返回 JSON，不要 Markdown。坐标采用相对图片的百分比，x/y 为左上角，width/height 为宽高，均为 0-100。看不清时降低 confidence，不得编造。
JSON 格式：{"risk":"low|medium|high","score":0,"summary":"中文摘要","foods":["食物"],"detections":[{"category":"allergen|foreign_object","label":"名称","description":"中文说明","confidence":0.0,"box":{"x":0,"y":0,"width":0,"height":0}}]}`;

function parseJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("模型未返回有效 JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function clamp(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

function normalize(result) {
  const detections = Array.isArray(result.detections) ? result.detections.slice(0, 12) : [];
  return {
    risk: ["low", "medium", "high"].includes(result.risk) ? result.risk : "medium",
    score: clamp(result.score),
    summary: String(result.summary || "分析完成，请人工复核。").slice(0, 500),
    foods: Array.isArray(result.foods) ? result.foods.map(String).slice(0, 30) : [],
    detections: detections.map((item) => ({
      category: item.category === "foreign_object" ? "foreign_object" : "allergen",
      label: String(item.label || "待确认风险").slice(0, 80),
      description: String(item.description || "请人工复核").slice(0, 300),
      confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0)),
      box: {
        x: clamp(item.box?.x), y: clamp(item.box?.y),
        width: clamp(item.box?.width), height: clamp(item.box?.height),
      },
    })),
  };
}

export async function POST(request) {
  try {
    if (!process.env.MOONSHOT_API_KEY) {
      return NextResponse.json({ error: "尚未配置 MOONSHOT_API_KEY" }, { status: 503 });
    }
    const { image, allergens = [] } = await request.json();
    if (typeof image !== "string" || !image.startsWith("data:image/") || image.length > MAX_IMAGE_LENGTH) {
      return NextResponse.json({ error: "请上传不超过约 7MB 的图片" }, { status: 400 });
    }
    const allergenContext = expandAllergens(allergens);

    const baseUrl = (process.env.MOONSHOT_BASE_URL || "https://api.moonshot.cn/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MOONSHOT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MOONSHOT_MODEL || "kimi-k2.6",
        thinking: { type: "disabled" },
        max_tokens: 1600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  `当前学生登记的过敏原：${allergenContext.originals.length ? allergenContext.originals.join("、") : "无"}。`,
                  `自动扩展后的检查词：${allergenContext.expandedTerms.length ? allergenContext.expandedTerms.join("、") : "无"}。`,
                  allergenContext.matched.length
                    ? `扩展说明：${allergenContext.matched.map((item) => `${item.input}→${item.note}`).join("；")}`
                    : "没有匹配到内置扩展词库时，请只按用户原始输入检查。",
                  "请优先标出与登记过敏原或扩展词相关的可见风险；对隐藏成分只给风险提示，不要把不确定内容说成确定。",
                ].join("\n"),
              },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(120000),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: payload.error?.message || `Kimi API 请求失败（${response.status}）` }, { status: 502 });
    }
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Kimi API 没有返回分析内容");
    return NextResponse.json(normalize(parseJson(content)));
  } catch (error) {
    const message = error?.name === "TimeoutError" ? "AI 分析超过 120 秒，请换一张较小的图片后重试" : (error?.message || "分析失败");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
