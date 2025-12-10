// 版本號：改一次就會強制所有裝置切到新版 Cache
const CACHE_NAME = "daily-report-v3";

const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192-v2.png",
  "./icon-512-v2.png"
];

// 安裝：預先把重要檔案放進快取
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  // 讓新的 SW 安裝完就準備接手
  self.skipWaiting();
});

// 啟用：把舊版 cache 全部清掉
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // 立刻接管目前所有 clients（開著的分頁）
  self.clients.claim();
});

// 讀取策略：HTML 用 network-first，其它用 cache-first
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 1️⃣ 導航 / HTML 頁面：network-first（有網路就拿最新）
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then((response) => {
          // 把最新的頁面也更新進 cache，之後可離線用
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return response;
        })
        .catch(() => {
          // 若離線或 fetch 失敗，再退回 cache
          return caches.match(req);
        })
    );
    return;
  }

  // 2️⃣ 其他靜態資源：cache-first（先用快取，沒有再抓網路）
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return response;
      });
    })
  );
});
