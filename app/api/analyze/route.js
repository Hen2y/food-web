import { NextResponse } from "next/server";
import { expandAllergens } from "./allergenLexicon.js";
import { addDishDerivedDetections, buildDishKnowledge } from "./dishKnowledge.js";

export const runtime = "nodejs";

const MAX_IMAGE_LENGTH = 10 * 1024 * 1024;
const SYSTEM_PROMPT = `你是校园食堂的餐盘图像初筛助手。你的结果只能作为风险提示，不能代替人工检查或医疗诊断。
请根据图片识别：1. 可见食物/配料；2. 可能引发过敏的食材；3. 可能有害的异物（玻璃、金属、硬塑料、头发、苍蝇/蟑螂等昆虫、包装残留、清洁用品残留等）。
过敏原和有害异物是同等重要的两类任务。必须完整检查整个餐盘，不能因为发现了过敏原就停止寻找异物，也不能只在用户登记了过敏原时才检查异物。
对玻璃、金属尖片、昆虫、头发、硬塑料等非食用物，即使没有登记任何过敏原，也必须作为 foreign_object 返回并标框。明显位于餐盘外、食物外的背景物体不要报告。
用户登记的过敏原会附带自动扩展词库。请同时检查过敏原本身、常见别名、酱料、加工品和常见含该成分的菜品。
请先尽量识别菜品名称，再用菜品常识推断隐藏过敏源。比如鸡豆花外观像豆腐/豆花，但常由鸡肉/鸡蓉、蛋清、高汤和淀粉制成；如果判断为鸡豆花，不要仅凭外观当作豆腐或大豆制品，应提示鸡肉/蛋类等隐藏成分风险。
如果图片中能明确看到相关食物/配料，可以给出较高 confidence 并标框；如果只是酱料或隐藏成分“可能含有”，请在 description 写明“可能含有/需询问食堂确认”，confidence 应偏低，box 可圈出可疑菜品区域。
请加入食堂餐盘场景常识判断：热饭、热菜、汤面或常温餐盘中一般不应出现冰块；如果在米饭或菜品里看到透明、反光、尖锐或不规则硬物，不要轻易标为“冰块”，应优先标为“疑似透明异物”，并在 description 中写“可能是玻璃、硬塑料或其他透明异物，需人工确认”。除非图片明确显示冷饮、冰品或冰镇场景，否则不要把餐盘中的透明异物判断为冰块。
对不合常理的识别要保守：不要把明显不该出现在餐盘里的物体解释成正常食材；也不要武断说一定是玻璃。请用“疑似/可能/需人工确认”表达不确定性。
也要避免把正常餐饮场景误报成异物：盘子/碗/勺子/杯子/桌面反光、酱汁油光、餐盘边缘、餐桌上的菜单牌或背景餐具，如果不在食物内部或没有明显污染食物，不应作为 foreign_object。
常见菜品识别请更具体：肉丸、菇类、辣椒、葱花、青菜、云吞/馄饨、面条、红烧肉/卤肉、整鱼、鱼皮、鱼头、鱼尾、鱼骨、香菜、酱汁或汤汁都属于正常可见食物/配料。整鱼中的鱼头、鱼尾、鱼骨和鱼皮一般是菜品本身；只有发现非食物硬物、包装残留、头发、昆虫、金属或玻璃等才标为 foreign_object。
如果画面像从相册、纸质照片或屏幕中拍摄的餐食图片，请仍然按可见餐食内容分析，但不要把纸张边框、屏幕反光、照片反光当作餐盘异物。
score 必须和 risk 一致：low 通常 0-34，medium 通常 35-69，high 通常 70-100。只要返回 medium 或 high，就不要给 0-10 这种极低分。
安全分级规则：与登记过敏原匹配且 confidence>=0.88 时必须 high；玻璃、金属、昆虫、硬塑料等明确有害异物 confidence>=0.82 时才必须 high。不能把 95% 确认的过敏原或有害异物评为中风险。
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

function normalizeDetection(item) {
  const category = item.category === "foreign_object" ? "foreign_object" : "allergen";
  let label = String(item.label || "待确认风险").slice(0, 80);
  let description = String(item.description || "请人工复核").slice(0, 300);
  const combined = `${label} ${description}`;

  if (category === "foreign_object" && /冰块|冰粒|ice cube|ice/i.test(combined)) {
    label = "疑似透明异物";
    description = "餐盘热饭热菜中通常不应出现冰块；该透明/反光区域可能是玻璃、硬塑料或其他透明异物，需人工确认。";
  }

  return {
    category,
    label,
    description,
    confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0)),
    box: {
      x: clamp(item.box?.x), y: clamp(item.box?.y),
      width: clamp(item.box?.width), height: clamp(item.box?.height),
    },
  };
}

function isStrongForeignObject(item) {
  const text = `${item.label || ""} ${item.description || ""}`;
  return /玻璃|金属|铁丝|刀片|尖片|硬塑料|塑料片|昆虫|苍蝇|蟑螂|虫|头发|毛发|包装|清洁剂|洗涤剂|异物|foreign|glass|metal|plastic|insect|hair/i.test(text);
}

function deriveRiskAndScore(risk, score, detections) {
  let calibrated = clamp(score);
  const allergenDetections = detections.filter((item) => item.category === "allergen");
  const foreignDetections = detections.filter((item) => item.category === "foreign_object");
  const maxAllergenConfidence = allergenDetections.reduce((max, item) => Math.max(max, Number(item.confidence) || 0), 0);
  const maxForeignConfidence = foreignDetections.reduce((max, item) => Math.max(max, Number(item.confidence) || 0), 0);
  const maxStrongForeignConfidence = foreignDetections
    .filter(isStrongForeignObject)
    .reduce((max, item) => Math.max(max, Number(item.confidence) || 0), 0);
  const maxConfidence = Math.max(maxAllergenConfidence, maxForeignConfidence);
  let derivedRisk = risk;

  if (detections.length) calibrated = Math.max(calibrated, 12);
  if (allergenDetections.length) calibrated = Math.max(calibrated, maxAllergenConfidence >= 0.65 ? 38 : 26);
  if (foreignDetections.length) calibrated = Math.max(calibrated, maxStrongForeignConfidence >= 0.65 ? 48 : 32);

  // Only clear evidence should become high risk. Uncertain hidden ingredients,
  // reflections, sauce shine, or low-confidence guesses stay in medium so the
  // cafeteria can review them without blocking every plate.
  if (maxAllergenConfidence >= 0.88) {
    derivedRisk = "high";
    calibrated = Math.max(calibrated, 82, Math.round(maxAllergenConfidence * 94));
  }
  if (maxStrongForeignConfidence >= 0.82) {
    derivedRisk = "high";
    calibrated = Math.max(calibrated, 80, Math.round(maxStrongForeignConfidence * 94));
  }
  if (derivedRisk === "high" && maxAllergenConfidence < 0.88 && maxStrongForeignConfidence < 0.82) {
    derivedRisk = "medium";
    calibrated = Math.min(calibrated || 62, 68);
  }
  if (derivedRisk === "low" && maxConfidence >= 0.45) {
    derivedRisk = "medium";
    calibrated = Math.max(calibrated, 40);
  }
  if (derivedRisk !== "high" && maxConfidence >= 0.65) {
    derivedRisk = "medium";
    calibrated = Math.max(calibrated, 45);
  }

  if (derivedRisk === "medium") calibrated = Math.max(35, Math.min(calibrated, 69));
  if (derivedRisk === "high") calibrated = Math.max(calibrated, 70);
  if (derivedRisk === "low") calibrated = Math.min(calibrated, 34);

  return { risk: derivedRisk, score: Math.round(clamp(calibrated)) };
}

function normalize(result) {
  const detections = Array.isArray(result.detections) ? result.detections.slice(0, 12) : [];
  const normalizedDetections = detections.map(normalizeDetection);
  const modelRisk = ["low", "medium", "high"].includes(result.risk) ? result.risk : "medium";
  const calibrated = deriveRiskAndScore(modelRisk, result.score, normalizedDetections);
  return {
    risk: calibrated.risk,
    score: calibrated.score,
    summary: String(result.summary || "分析完成，请人工复核。").slice(0, 500),
    foods: Array.isArray(result.foods) ? result.foods.map(String).slice(0, 30) : [],
    detections: normalizedDetections,
  };
}

function getProviderErrorMessage(payload, status) {
  const raw = String(payload?.error?.message || payload?.message || "");
  if (/quota|exceeded|insufficient|余额|额度|用量|欠费/i.test(raw)) {
    return "Kimi API 额度已用完或余额不足。请到 Kimi 控制台充值、提高额度，或更换新的 MOONSHOT_API_KEY。";
  }
  if (/rate.?limit|too many requests|429|频率|限流/i.test(raw) || status === 429) {
    return "Kimi API 请求过于频繁，已被限流。请稍等一会儿再试，或降低自动模式检测频率。";
  }
  if (/auth|api.?key|unauthorized|invalid/i.test(raw) || status === 401 || status === 403) {
    return "Kimi API Key 无效或没有权限。请检查 Render 环境变量 MOONSHOT_API_KEY 是否正确。";
  }
  return raw || `Kimi API 请求失败（${status}）`;
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
    const dishKnowledge = buildDishKnowledge([...allergenContext.originals, ...allergenContext.expandedTerms]);
    const dishKnowledgeText = dishKnowledge.length
      ? dishKnowledge.map((item) => `${item.dish}：${item.note}`).join("\n")
      : "无特别匹配的菜品知识；仍需按常见菜品和配料推断隐藏过敏源。";

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
        max_tokens: 900,
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
                  `内置菜品知识库：\n${dishKnowledgeText}`,
                  "请优先标出与登记过敏原或扩展词相关的可见风险；对隐藏成分只给风险提示，不要把不确定内容说成确定。",
                  "识别菜品名时要考虑同形不同料：鸡豆花看起来像白色豆腐/豆花，但通常不是豆腐，而是鸡肉/蛋清制成；如果画面是白色细嫩块状物浸在清汤里、带红色点缀和绿叶装饰，应把鸡豆花作为候选菜名，并检查鸡肉/蛋清隐藏过敏源。",
                  "请用常识复核结果：若透明/反光物位于米饭、热菜、汤菜中，不要标为冰块；应作为疑似透明异物处理，并提醒人工确认是否为玻璃、塑料或其他异物。",
                  "若看到正常餐饮元素，例如碗盘边缘、汤勺、杯子、桌面反光、酱汁油光、纸质照片边框、背景菜单牌，不要把它们当成餐盘异物。",
                  "请正确识别常见菜品：肉丸/菇类/青菜/云吞/面条/红烧或卤肉/整鱼/香菜/汤汁等。整鱼的鱼头、鱼骨、鱼尾通常属于菜品本身；只有登记鱼类过敏时才作为 allergen 风险提示。",
                  "过敏原和有害异物必须分别完整检查；即使已经发现过敏原，也继续检查玻璃、金属、硬塑料、头发、苍蝇/蟑螂等昆虫和包装残留。",
                  "请保持风险分一致：low=0-34，medium=35-69，high=70-100。过敏原 confidence>=0.88 或明确有害异物 confidence>=0.82 时必须 high，不能仍给中风险。",
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
      return NextResponse.json({ error: getProviderErrorMessage(payload, response.status) }, { status: 502 });
    }
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Kimi API 没有返回分析内容");
    const parsed = addDishDerivedDetections(parseJson(content), [...allergenContext.originals, ...allergenContext.expandedTerms]);
    return NextResponse.json(normalize(parsed));
  } catch (error) {
    const message = error?.name === "TimeoutError" ? "AI 分析超过 120 秒，请换一张较小的图片后重试" : (error?.message || "分析失败");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
