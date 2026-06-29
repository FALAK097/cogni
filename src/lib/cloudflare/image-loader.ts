import type { ImageLoaderProps } from "next/image";

function normalizeSrc(src: string) {
  return src.startsWith("/") ? src.slice(1) : src;
}

export default function cloudflareImageLoader({ src, width, quality }: ImageLoaderProps) {
  const params = [`width=${width}`, "format=auto"];

  if (quality) {
    params.push(`quality=${quality}`);
  }

  if (process.env.NODE_ENV === "development") {
    return `${src}?${params.join("&")}`;
  }

  return `/cdn-cgi/image/${params.join(",")}/${normalizeSrc(src)}`;
}
