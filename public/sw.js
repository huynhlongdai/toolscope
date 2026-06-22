const CACHE_NAME = "toolscope-v2";
const I18N_CACHE = "toolscope-i18n-v1";
const STATIC_ASSETS = ["/", "/favicon.ico"];

// Cache TTLs
const I18N_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for translation data
const ASSET_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for static assets

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([CACHE_NAME, I18N_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET and cross-origin
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  // Network-first for API/supabase calls (except translation queries)
  if (
    (request.url.includes("/rest/") || request.url.includes("/auth/") || request.url.includes("/functions/")) &&
    !isTranslationQuery(request.url)
  ) {
    return;
  }

  // Cache-first for translation API calls (30min TTL)
  if (isTranslationQuery(request.url)) {
    event.respondWith(handleTranslationFetch(request));
    return;
  }

  // Stale-while-revalidate for static assets (JS/CSS/images/fonts)
  if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Stale-while-revalidate for pages
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const fetched = fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});

/**
 * Check if request is a translation query
 */
function isTranslationQuery(url) {
  return (
    url.includes("entity_type=eq.system") ||
    url.includes("translations") ||
    url.includes("translate-")
  );
}

/**
 * Check if request is a static asset (JS, CSS, images, fonts)
 */
function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|ico|webp)(\?|$)/.test(url);
}

/**
 * Cache-first with TTL for translation data
 */
async function handleTranslationFetch(request) {
  const cache = await caches.open(I18N_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    // Check if still within TTL
    const cachedTime = cached.headers.get("sw-cached-at");
    if (cachedTime && Date.now() - parseInt(cachedTime, 10) < I18N_CACHE_TTL) {
      // Background revalidate
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const headers = new Headers(response.headers);
            headers.set("sw-cached-at", String(Date.now()));
            const body = response.clone().blob();
            body.then((b) => {
              cache.put(request, new Response(b, { status: response.status, headers }));
            });
          }
        })
        .catch(() => {});
      return cached;
    }
  }

  // Fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      const body = await cloned.blob();
      const headers = new Headers(cloned.headers);
      headers.set("sw-cached-at", String(Date.now()));
      cache.put(request, new Response(body, { status: cloned.status, headers }));
    }
    return response;
  } catch {
    return cached || new Response("Offline", { status: 503 });
  }
}

/**
 * Cache-first with long TTL for static assets
 */
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response("Offline", { status: 503 });
  }
}
