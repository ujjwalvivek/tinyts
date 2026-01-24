/** Load an image from a URL, resolving with the `HTMLImageElement` once decoded. */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/** Fetch a URL and return its body as plain text. */
export function loadText(url: string): Promise<string> {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to load text: ${url} (${r.status})`);
    return r.text();
  });
}

/** Fetch a URL and parse its body as JSON. */
export function loadJson<T = unknown>(url: string): Promise<T> {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to load JSON: ${url} (${r.status})`);
    return r.json() as Promise<T>;
  });
}

/** Map of asset keys to URLs for batch loading. */
export interface AssetManifest {
  [key: string]: string;
}

/** Loaded asset bundle keyed by the same keys as the source manifest. */
export interface AssetBundle {
  [key: string]: HTMLImageElement | string | unknown;
}

/**
 * Load all assets in a manifest concurrently.
 *
 * File type is inferred from the URL extension: images (png/jpg/gif/webp),
 * JSON, or plain text.
 */
export async function loadAssets(
  manifest: AssetManifest,
): Promise<AssetBundle> {
  const entries = Object.entries(manifest);
  const results = await Promise.all(
    entries.map(async ([key, url]) => {
      const ext = url.split('.').pop()?.toLowerCase();
      if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'webp') {
        return [key, await loadImage(url)] as const;
      }
      if (ext === 'json') {
        return [key, await loadJson(url)] as const;
      }
      return [key, await loadText(url)] as const;
    }),
  );
  return Object.fromEntries(results);
}
