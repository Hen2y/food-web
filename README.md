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

## Vercel 部署

把项目上传 GitHub 后导入 Vercel，在项目 Settings > Environment Variables 中添加：

- `MOONSHOT_API_KEY`：你的 Kimi API key（机密）
- `MOONSHOT_BASE_URL`：`https://api.moonshot.ai/v1`
- `MOONSHOT_MODEL`：`kimi-k2.5`，或控制台中支持图片理解的模型 ID

环境变量修改后需要重新部署。不要创建 `NEXT_PUBLIC_MOONSHOT_API_KEY`。

## 重要限制

大语言模型给出的食物、过敏原、异物和坐标都是视觉初筛，可能漏检或误检，不能代替食堂人员检查、食品检测或医疗建议。界面会保留“人工复核”提示。
