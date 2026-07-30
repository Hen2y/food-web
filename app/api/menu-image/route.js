import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MENU_IMAGE_FILES = {
  menu_chicken_tofu: "menu_chicken_tofu.jpg",
  menu_kungpao: "menu_kungpao.jpg",
  menu_mapo_tofu: "menu_mapo_tofu.jpg",
  menu_wonton_noodle: "menu_wonton_noodle.jpg",
  menu_steamed_fish: "menu_steamed_fish.jpg",
  menu_tomato_egg: "menu_tomato_egg.jpg",
  menu_salad: "menu_salad.jpg",
  menu_cream_soup: "menu_cream_soup.jpg",
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id") || "").trim();
    const filename = MENU_IMAGE_FILES[id];
    if (!filename) {
      return NextResponse.json({ error: "未知菜单图片" }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), "public", "images", "menu", filename);
    const file = await readFile(filePath);
    return NextResponse.json({
      id,
      mime: "image/jpeg",
      dataUrl: `data:image/jpeg;base64,${file.toString("base64")}`,
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "菜单图片读取失败" }, { status: 500 });
  }
}
