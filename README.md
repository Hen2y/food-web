# 盘安 SafePlate + Kimi

这是由现有单页前端改造的可部署项目。浏览器负责页面、过敏原档案和图片上传；`/api/analyze` 只负责在服务端安全调用 Kimi，API key 不会进入浏览器代码。

## 本地运行

1. 安装 Node.js 20 或更高版本。
2. 复制 `.env.example` 为 `.env.local`。
3. 在 `.env.local` 填写 `MOONSHOT_API_KEY`。不要把这个文件上传到 GitHub。
4. 运行：

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。先在“过敏原档案”登记学生，再到“AI 检测工作台”选择学生、上传餐盘照片并分析。

## 仪表板数据

总览仪表板不再使用固定演示数字。今日检测数、高风险提醒、过敏原命中和最近 7 天趋势都会根据实际完成的 AI 检测记录自动变化。

项目已接入 Supabase 数据库支持：

- 如果配置了 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`，检测记录会保存到 Supabase，所有用户共用同一份仪表板数据。
- 如果没有配置 Supabase，网站会自动退回浏览器本地 `localStorage`，方便本地演示，不会导致页面报错。

### Supabase 建表

进入 Supabase 项目 `food-web`，打开 **SQL Editor**，复制并运行仓库里的 `supabase-schema.sql`。

### Supabase 环境变量

在 Supabase 左侧进入 **Project Settings > API**，复制：

- `Project URL` → 填到 Render 的 `SUPABASE_URL`
- `service_role secret` → 填到 Render 的 `SUPABASE_SERVICE_ROLE_KEY`

注意：`SUPABASE_SERVICE_ROLE_KEY` 是高权限密钥，只能放在 Render Environment 里，不能写进前端代码，也不要提交到 GitHub。

## 自动过敏原扩展词库

服务端会在调用 Kimi 前自动扩展学生填写的过敏原。例如学生只输入“花生”，系统会同时提示模型检查花生酱、花生碎、花生油、沙爹酱、宫保类菜品、坚果碎和常见含花生甜点等相关风险。

当前内置覆盖：

- 花生
- 树坚果
- 牛奶/乳制品
- 鸡蛋
- 小麦/麸质
- 大豆
- 鱼类
- 甲壳类贝类，例如虾、蟹
- 软体贝类，例如蛤蜊、牡蛎、扇贝、鱿鱼
- 芝麻

词库文件在 `app/api/analyze/allergenLexicon.js`。它参考了 FDA 对主要食物过敏原的分类，并结合常见校园餐食、酱料、加工品和中文别名整理。模型提示词会要求 Kimi 区分“图片中明确看到的风险”和“酱料/隐藏成分可能含有的风险”：明确可见的可以标框；不确定的需要写“可能含有/需询问食堂确认”，不能说成确定。

## Render 部署

仓库根目录已提供 `render.yaml`。在 Render Dashboard 中选择 **New > Blueprint**，连接 GitHub 仓库 `Hen2y/food-web`，Render 会把它部署为 Node Web Service。

首次创建时，Render 会要求填写：

- `MOONSHOT_API_KEY`：你的 Kimi API key（机密）
- `SUPABASE_URL`：Supabase Project URL
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase service_role secret（机密）

以下两项已写入 `render.yaml`，通常无需手动填写：

- `MOONSHOT_BASE_URL`：`https://api.moonshot.cn/v1`
- `MOONSHOT_MODEL`：`kimi-k2.6`

Render 使用的命令：

```text
Build Command: npm install && npm run build
Start Command: npm start
```

如果你已经在 Render 手动创建了 Web Service，请在 **Environment** 中添加相同变量，并在保存后执行 **Manual Deploy > Deploy latest commit**。不要创建 `NEXT_PUBLIC_MOONSHOT_API_KEY`。

## 重要限制

大语言模型给出的食物、过敏原、异物和坐标都是视觉初筛，可能漏检或误检，不能代替食堂人员检查、食品检测或医疗建议。自动扩展词库也只是提高提醒覆盖面，不能确认隐藏配料或交叉接触。界面会保留“人工复核”提示。
