const DISH_KNOWLEDGE = [
  {
    dish: "鸡豆花",
    aliases: ["鸡豆花", "四川鸡豆花", "清汤鸡豆花", "鸡茸豆花", "鸡蓉豆花", "chicken tofu", "jidouhua"],
    ingredients: ["鸡胸肉", "鸡肉", "蛋清", "鸡蛋", "高汤", "鸡汤", "淀粉"],
    allergenTerms: ["鸡肉", "鸡", "禽肉", "蛋", "鸡蛋", "蛋清", "小麦", "淀粉"],
    note: "鸡豆花外观像豆腐或豆花，但通常由鸡胸肉/鸡蓉、蛋清、高汤和淀粉制成；不要仅凭外观把它当成豆腐或大豆制品。若登记鸡肉/禽肉或蛋类过敏，应提示隐藏成分风险。",
  },
  {
    dish: "宫保鸡丁",
    aliases: ["宫保鸡丁", "宫保", "kung pao chicken"],
    ingredients: ["鸡肉", "花生", "辣椒", "酱油"],
    allergenTerms: ["鸡肉", "鸡", "花生", "坚果", "大豆", "小麦"],
    note: "宫保鸡丁常含鸡肉、花生和酱油；花生或鸡肉过敏需要重点提示，酱油可能涉及大豆/小麦。",
  },
  {
    dish: "鱼香肉丝",
    aliases: ["鱼香肉丝", "鱼香"],
    ingredients: ["猪肉", "木耳", "豆瓣酱", "酱油"],
    allergenTerms: ["猪肉", "大豆", "小麦"],
    note: "鱼香肉丝通常不含鱼，但常含豆瓣酱和酱油；不要因为“鱼香”二字直接判定鱼类过敏，需关注大豆/小麦调味风险。",
  },
  {
    dish: "麻婆豆腐",
    aliases: ["麻婆豆腐", "mapo tofu"],
    ingredients: ["豆腐", "大豆", "豆瓣酱", "肉末", "花椒"],
    allergenTerms: ["大豆", "豆腐", "猪肉", "牛肉", "小麦"],
    note: "麻婆豆腐主要涉及大豆/豆腐，豆瓣酱或酱油也可能涉及大豆/小麦，肉末种类需按现场确认。",
  },
  {
    dish: "云吞/馄饨",
    aliases: ["云吞", "馄饨", "抄手", "wonton"],
    ingredients: ["小麦面皮", "猪肉", "虾仁", "鸡蛋"],
    allergenTerms: ["小麦", "麸质", "猪肉", "虾", "甲壳类", "蛋", "鸡蛋"],
    note: "云吞/馄饨外皮通常含小麦，馅料可能含猪肉、虾仁或蛋；图像无法确认馅料时应提示询问食堂。",
  },
  {
    dish: "虾饺/烧卖",
    aliases: ["虾饺", "烧卖", "烧麦", "点心", "dim sum"],
    ingredients: ["虾", "猪肉", "小麦/澄粉外皮", "蛋"],
    allergenTerms: ["虾", "甲壳类", "猪肉", "小麦", "蛋", "鸡蛋"],
    note: "部分点心外观只看到面皮，但馅料可能含虾、猪肉或蛋；甲壳类过敏需谨慎。",
  },
  {
    dish: "蛋糕/面包甜点",
    aliases: ["蛋糕", "面包", "甜点", "糕点", "饼干", "蛋挞", "布丁"],
    ingredients: ["鸡蛋", "牛奶", "奶油", "小麦粉", "坚果"],
    allergenTerms: ["蛋", "鸡蛋", "牛奶", "乳制品", "小麦", "麸质", "坚果", "花生"],
    note: "糕点甜品常有隐藏蛋、奶、小麦和坚果；如果只从图片不能确认，应提示可能含有并需询问。",
  },
  {
    dish: "沙拉/凉拌菜",
    aliases: ["沙拉", "凉拌菜", "拌菜", "凉皮", "麻酱凉面"],
    ingredients: ["芝麻酱", "花生碎", "蛋黄酱", "酱油"],
    allergenTerms: ["芝麻", "花生", "坚果", "蛋", "大豆", "小麦"],
    note: "凉菜和沙拉常通过酱料带入芝麻、花生、蛋黄酱、酱油等隐藏过敏源。",
  },
  {
    dish: "海鲜汤/海鲜炒饭",
    aliases: ["海鲜汤", "海鲜炒饭", "海鲜炒面", "海鲜粥", "海鲜酱"],
    ingredients: ["虾", "蟹", "贝类", "鱼", "鱿鱼"],
    allergenTerms: ["虾", "蟹", "甲壳类", "贝类", "鱼", "鱿鱼", "软体贝类"],
    note: "混合海鲜菜可能同时含甲壳类、鱼类和软体贝类，不要只识别最显眼的一种。",
  },
  {
    dish: "奶油汤/白酱菜",
    aliases: ["奶油汤", "白酱", "奶油蘑菇汤", "芝士焗饭", "奶酪焗菜"],
    ingredients: ["牛奶", "奶油", "黄油", "芝士", "小麦粉"],
    allergenTerms: ["牛奶", "乳制品", "小麦", "麸质"],
    note: "白色浓汤或焗菜常含牛奶/奶油/芝士，也可能用小麦粉增稠。",
  },
];

function normalizeTerm(term) {
  return String(term || "").trim().toLowerCase();
}

function unique(items) {
  return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
}

export function buildDishKnowledge(allergenTerms = []) {
  const normalizedAllergens = unique(allergenTerms).map(normalizeTerm);
  const relevant = DISH_KNOWLEDGE.filter((entry) => {
    const searchable = [...entry.allergenTerms, ...entry.ingredients, ...entry.aliases].map(normalizeTerm);
    return !normalizedAllergens.length || normalizedAllergens.some((term) =>
      searchable.some((item) => item.includes(term) || term.includes(item))
    );
  });

  return relevant.slice(0, 12);
}

export function addDishDerivedDetections(result, allergenTerms = []) {
  const normalizedAllergens = unique(allergenTerms).map(normalizeTerm);
  if (!normalizedAllergens.length) return result;

  const foods = Array.isArray(result.foods) ? result.foods.map(String) : [];
  const detections = Array.isArray(result.detections) ? [...result.detections] : [];
  const visibleText = [
    ...foods,
    ...detections.flatMap((item) => [item.label, item.description]),
    result.summary,
  ].join(" ");
  const normalizedVisibleText = normalizeTerm(visibleText);

  for (const entry of DISH_KNOWLEDGE) {
    const dishSeen = entry.aliases.some((alias) => normalizedVisibleText.includes(normalizeTerm(alias)));
    if (!dishSeen) continue;

    const matchedAllergens = entry.allergenTerms.filter((term) => {
      const normalized = normalizeTerm(term);
      return normalizedAllergens.some((allergen) => normalized.includes(allergen) || allergen.includes(normalized));
    });

    if (!matchedAllergens.length) continue;
    const alreadyPresent = detections.some((item) => normalizeTerm(`${item.label} ${item.description}`).includes(normalizeTerm(entry.dish)));
    if (alreadyPresent) continue;

    detections.push({
      category: "allergen",
      label: `${entry.dish}隐藏成分`,
      description: `${entry.note} 命中过敏源：${unique(matchedAllergens).join("、")}。`,
      confidence: 0.72,
      box: { x: 18, y: 18, width: 64, height: 64 },
    });
  }

  return {
    ...result,
    detections,
  };
}
