/**
 * Comprehensive utility for resolving, preloading, and embedding school logos,
 * signatures, and printable images to guarantee 100% reliable rendering in print & PDF previews.
 */

const imageCache = new Map<string, string>();

/**
 * Resolves any school logo reference (full URL, relative storage path, filename, or data URL)
 * into a valid, reachable URL.
 */
export const resolveSchoolLogoUrl = (logo: string | null | undefined): string => {
  if (!logo || typeof logo !== "string") return "";
  const trimmed = logo.trim();
  if (!trimmed) return "";

  // If already full http(s) URL or data URL, return directly
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  if (!supabaseUrl) return trimmed;

  // Clean any leading slashes or existing storage prefixes
  let clean = trimmed.replace(/^\/+/, "");
  clean = clean.replace(/^storage\/v1\/object\/public\//, "");
  clean = clean.replace(/^school-logos\//, "");

  return `${supabaseUrl}/storage/v1/object/public/school-logos/${clean}`;
};

/**
 * Resolves signature references into a valid reachable URL.
 */
export const resolveSignatureUrl = (sig: string | null | undefined, bucket = "signatures"): string => {
  if (!sig || typeof sig !== "string") return "";
  const trimmed = sig.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  if (!supabaseUrl) return trimmed;

  let clean = trimmed.replace(/^\/+/, "");
  clean = clean.replace(/^storage\/v1\/object\/public\//, "");
  clean = clean.replace(new RegExp(`^${bucket}/`), "");

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${clean}`;
};

/**
 * Preloads an image URL into a Base64 Data URL.
 * Embedding Base64 in print HTML prevents race conditions, network latency,
 * and popup cross-origin image omission by browser print engines.
 */
export const preloadImageAsDataUrl = async (url: string, timeoutMs = 3500): Promise<string> => {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("data:")) return trimmed;
  if (imageCache.has(trimmed)) {
    return imageCache.get(trimmed)!;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(trimmed, {
      signal: controller.signal,
      mode: "cors",
      cache: "force-cache",
    });
    clearTimeout(timer);

    if (!res.ok) {
      return trimmed;
    }

    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string" && reader.result.startsWith("data:image")) {
          resolve(reader.result);
        } else {
          resolve(trimmed);
        }
      };
      reader.onerror = () => resolve(trimmed);
      reader.readAsDataURL(blob);
    });

    if (dataUrl && dataUrl.startsWith("data:")) {
      imageCache.set(trimmed, dataUrl);
      return dataUrl;
    }
    return trimmed;
  } catch {
    // Graceful fallback to original URL
    return trimmed;
  }
};

/**
 * Scans an HTML string for <img> tags and converts remote http/https image sources
 * into Base64 Data URLs so the printed page has zero network dependencies.
 */
export const inlineHtmlImages = async (html: string, maxImages = 25): Promise<string> => {
  if (!html || typeof html !== "string") return html;

  const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const matches: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = imgRegex.exec(html)) !== null) {
    if (m[1] && !m[1].startsWith("data:") && !matches.includes(m[1])) {
      matches.push(m[1]);
      if (matches.length >= maxImages) break;
    }
  }

  if (matches.length === 0) return html;

  const urlMap = new Map<string, string>();
  await Promise.all(
    matches.map(async (src) => {
      try {
        const dataUrl = await preloadImageAsDataUrl(src, 3000);
        if (dataUrl && dataUrl.startsWith("data:")) {
          urlMap.set(src, dataUrl);
        }
      } catch {
        // ignore errors
      }
    })
  );

  if (urlMap.size === 0) return html;

  let processed = html;
  for (const [src, dataUrl] of urlMap.entries()) {
    // Replace all occurrences of this src in quotes
    processed = processed.split(`"${src}"`).join(`"${dataUrl}"`);
    processed = processed.split(`'${src}'`).join(`'${dataUrl}'`);
  }

  return processed;
};
