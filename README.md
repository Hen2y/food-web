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

## Render 部署

仓库根目录已提供 `render.yaml`。在 Render Dashboard 中选择 **New > Blueprint**，连接 GitHub 仓库 `Hen2y/food-web`，Render 会把它部署为 Node Web Service。

首次创建时，Render 会要求填写：

- `MOONSHOT_API_KEY`：你的 Kimi API key（机密）

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

大语言模型给出的食物、过敏原、异物和坐标都是视觉初筛，可能漏检或误检，不能代替食堂人员检查、食品检测或医疗建议。界面会保留“人工复核”提示。
