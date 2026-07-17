const ALLERGEN_LEXICON = [
  {
    id: "peanut",
    names: ["花生", "peanut", "落花生"],
    expanded: [
      "花生", "落花生", "花生酱", "花生碎", "花生粉", "花生油", "花生糖", "花生露",
      "花生饼干", "花生酥", "花生汤圆", "坚果碎", "混合坚果", "含坚果甜点",
      "沙爹酱", "satay", "宫保", "宫保鸡丁", "拌面酱", "凉拌菜酱料",
    ],
    note: "花生可能以花生酱、花生碎、沙爹酱、宫保类菜品或甜点坚果碎形式出现；如果只靠图片看不出酱料成分，应提示可能风险。",
  },
  {
    id: "tree_nut",
    names: ["坚果", "树坚果", "tree nut", "tree nuts", "杏仁", "核桃", "腰果", "开心果", "榛子", "松子", "碧根果", "夏威夷果"],
    expanded: [
      "坚果", "树坚果", "杏仁", "核桃", "腰果", "开心果", "榛子", "松子", "碧根果", "山核桃",
      "夏威夷果", "巴西坚果", "栗子", "坚果碎", "坚果酱", "杏仁粉", "杏仁奶", "腰果酱",
      "核桃酥", "坚果面包", "坚果蛋糕", "含坚果甜点", "混合坚果",
    ],
    note: "树坚果常出现在甜点、面包、坚果碎、坚果酱和混合坚果中；花生不是树坚果，但加工和摆放时可能交叉接触。",
  },
  {
    id: "milk",
    names: ["牛奶", "奶", "乳制品", "乳", "milk", "dairy"],
    expanded: [
      "牛奶", "乳制品", "奶粉", "奶油", "黄油", "芝士", "奶酪", "起司", "酸奶", "炼乳",
      "乳清", "乳清蛋白", "酪蛋白", "奶盖", "奶茶", "奶油汤", "奶油酱", "白酱",
      "冰淇淋", "布丁", "蛋糕奶油", "含奶甜点",
    ],
    note: "牛奶过敏需要关注奶油、黄油、芝士、乳清、酪蛋白、奶茶、白酱和甜点中的隐藏乳成分。",
  },
  {
    id: "egg",
    names: ["鸡蛋", "蛋", "蛋黄", "蛋白", "蛋清", "egg", "eggs"],
    expanded: [
      "鸡蛋", "鸭蛋", "蛋液", "蛋黄", "蛋白", "蛋粉", "蛋清", "煎蛋", "炒蛋", "蒸蛋",
      "蛋包饭", "蛋糕", "面包", "饼干", "蛋挞", "布丁", "美乃滋", "蛋黄酱", "沙拉酱",
      "裹粉炸物", "天妇罗", "鸡豆花", "鸡茸豆花", "鸡蓉豆花", "清汤鸡豆花",
    ],
    note: "蛋类可能直接可见，也可能存在于蛋糕、面包、蛋黄酱、沙拉酱、裹粉炸物和鸡豆花等菜品中。",
  },
  {
    id: "wheat_gluten",
    names: ["小麦", "麸质", "面筋", "gluten", "wheat"],
    expanded: [
      "小麦", "麸质", "面筋", "面粉", "面条", "拉面", "意面", "馒头", "包子", "饺子",
      "馄饨", "面包", "蛋糕", "饼干", "披萨", "炸物裹粉", "面糊", "酱油", "麦芽",
      "啤酒", "燕麦交叉接触",
    ],
    note: "小麦/麸质常见于面食、面包、糕点、裹粉炸物、部分酱油和麦芽制品中。",
  },
  {
    id: "soy",
    names: ["大豆", "黄豆", "豆腐", "豆浆", "soy", "soybean"],
    expanded: [
      "大豆", "黄豆", "豆腐", "豆浆", "豆皮", "腐竹", "豆干", "豆瓣酱", "黄豆酱",
      "味噌", "纳豆", "毛豆", "酱油", "素肉", "植物蛋白", "大豆蛋白", "卵磷脂",
    ],
    note: "大豆可能出现在豆制品、酱油、豆瓣酱、味噌、素肉和植物蛋白中。",
  },
  {
    id: "fish",
    names: ["鱼", "鱼类", "鱼片", "鱼肉", "三文鱼", "鳕鱼", "金枪鱼", "fish"],
    expanded: [
      "鱼", "鱼肉", "鱼片", "鱼丸", "鱼饼", "鱼露", "鱼酱", "鱼汤", "鱼干", "柴鱼",
      "鲣鱼", "鲑鱼", "三文鱼", "金枪鱼", "鳕鱼", "鳗鱼", "沙丁鱼", "凤尾鱼",
    ],
    note: "鱼类可能以鱼片、鱼丸、鱼汤、鱼露、鱼干、柴鱼或调味酱形式出现。",
  },
  {
    id: "crustacean_shellfish",
    names: ["虾", "虾仁", "虾皮", "虾米", "蟹", "螃蟹", "甲壳类", "甲壳贝类", "shellfish", "crustacean"],
    expanded: [
      "虾", "虾仁", "虾米", "虾皮", "虾酱", "虾油", "虾滑", "虾丸", "龙虾", "小龙虾",
      "蟹", "螃蟹", "蟹棒", "蟹肉", "蟹黄", "甲壳类", "海鲜酱", "海鲜汤", "海鲜炒饭",
    ],
    note: "甲壳类过敏要关注虾、蟹、虾皮、虾酱、蟹棒、海鲜汤和海鲜酱等隐藏来源。",
  },
  {
    id: "mollusk_shellfish",
    names: ["贝类", "贝壳类", "蛤", "蚝", "牡蛎", "扇贝", "鱿鱼", "章鱼", "mollusk"],
    expanded: [
      "贝类", "蛤蜊", "花甲", "牡蛎", "蚝", "扇贝", "鲍鱼", "贻贝", "淡菜",
      "鱿鱼", "章鱼", "墨鱼", "海鲜汤", "海鲜酱", "海鲜炒面",
    ],
    note: "贝类/软体贝类可能存在于海鲜汤、海鲜酱、炒面、火锅和混合海鲜菜中。",
  },
  {
    id: "sesame",
    names: ["芝麻", "sesame"],
    expanded: [
      "芝麻", "白芝麻", "黑芝麻", "芝麻酱", "麻酱", "芝麻油", "香油", "芝麻粉",
      "芝麻糊", "芝麻球", "烧饼", "凉皮", "麻酱面", "拌面酱", "沙拉酱", "tahini",
    ],
    note: "芝麻常见于表面撒料、芝麻酱/麻酱、香油、凉菜、面食和部分甜点中。",
  },
  {
    id: "chicken_poultry",
    names: ["鸡", "鸡肉", "鸡胸肉", "鸡丁", "鸡汤", "禽肉", "poultry", "chicken"],
    expanded: [
      "鸡", "鸡肉", "鸡胸肉", "鸡丁", "鸡蓉", "鸡茸", "鸡汤", "鸡高汤", "禽肉",
      "鸡豆花", "清汤鸡豆花", "鸡茸豆花", "鸡蓉豆花", "宫保鸡丁", "鸡排", "鸡柳",
      "鸡丸", "鸡肉肠", "鸡肉馅", "云吞鸡汤", "鸡汁调味",
    ],
    note: "鸡肉/禽肉可能以鸡丁、鸡蓉、鸡汤、高汤、鸡丸、鸡肉馅或鸡豆花等形式出现；鸡豆花外观像豆腐但通常含鸡肉。",
  },
];

function normalizeTerm(term) {
  return String(term || "").trim().toLowerCase();
}

function unique(items) {
  return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
}

export function expandAllergens(allergens) {
  const originals = unique(Array.isArray(allergens) ? allergens : []);
  const matched = [];
  const expandedTerms = [];

  for (const original of originals) {
    const normalized = normalizeTerm(original);
    const entry = ALLERGEN_LEXICON.find((candidate) =>
      candidate.names.some((name) => {
        const key = normalizeTerm(name);
        return normalized === key || (key.length >= 2 && normalized.includes(key)) || (normalized.length >= 2 && key.includes(normalized));
      })
    );

    if (entry) {
      matched.push({
        input: original,
        group: entry.names[0],
        expanded: entry.expanded,
        note: entry.note,
      });
      expandedTerms.push(...entry.expanded);
    } else {
      expandedTerms.push(original);
    }
  }

  return {
    originals,
    expandedTerms: unique(expandedTerms).slice(0, 120),
    matched,
  };
}
