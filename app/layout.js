export const metadata = {
  title: "盘安 SafePlate",
  description: "AI 餐盘过敏原与异物识别",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
