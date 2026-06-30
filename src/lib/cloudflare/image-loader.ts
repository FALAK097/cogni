import type { ImageLoaderProps } from "next/image";

function normalizeSrc(src: string) {
  return src.startsWith("/") ? src.slice(1) : src;
}

function isSvgSrc(src: string) {
  try {
    return new URL(src, "https://example.com").pathname.endsWith(".svg");
  } catch {
    return src.split("?")[0]?.endsWith(".svg") ?? false;
  }
}

export default function cloudflareImageLoader({ src, width, quality }: ImageLoaderProps) {
  if (isSvgSrc(src)) {
    return src;
  }

  const params = [`width=${width}`, "format=auto"];

  if (quality) {
    params.push(`quality=${quality}`);
  }

  if (process.env.NODE_ENV === "development") {
    return `${src}?${params.join("&")}`;
  }

  return `/cdn-cgi/image/${params.join(",")}/${normalizeSrc(src)}`;
}
