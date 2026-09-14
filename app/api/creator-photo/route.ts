import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

const photoPath = `${process.cwd()}/app/hd-b&w-wobg.png`;

export async function GET() {
  const photo = await readFile(photoPath);

  return new NextResponse(photo, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
