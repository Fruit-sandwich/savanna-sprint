// gallery.js
// Savanna Gallery Script

import { fetchSubmissionsFromAO, fetchAssetMetadata } from "./ao-utils.js";
import { checkWalletSession } from "./wallet-utils.js";

// --------------------------------------------
// Global State
// --------------------------------------------
let currentPage = 1;
let allAssets = [];
let allAssetsWithData = []; // Cache of enriched assets

// Caches
const assetDataCache = new Map();
const pendingAssetRequests = new Map();

// LocalStorage keys
const STORAGE_KEY = "savannaGalleryCache";
const TIMESTAMP_KEY = "savannaGalleryTimestamp";

// --------------------------------------------
// Helpers for LocalStorage
// --------------------------------------------
function saveCacheToLocalStorage(assets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
  } catch (err) {
    console.warn("[Gallery] Failed to save cache:", err);
  }
}

function loadCacheFromLocalStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const timestamp = localStorage.getItem(TIMESTAMP_KEY);
    if (data && timestamp) {
      const ageMinutes = (Date.now() - parseInt(timestamp, 10)) / 60000;
      if (ageMinutes < 30) return JSON.parse(data);
    }
  } catch (err) {
    console.warn("[Gallery] Failed to load cache:", err);
  }
  return null;
}

// --------------------------------------------
// Asset metadata wrapper
// --------------------------------------------
async function fetchAssetFromArweave(assetId) {
  if (assetDataCache.has(assetId)) return assetDataCache.get(assetId);
  if (pendingAssetRequests.has(assetId)) return pendingAssetRequests.get(assetId);

  const assetPromise = fetchAssetMetadata(assetId).then(metadata => {
    assetDataCache.set(assetId, metadata);
    pendingAssetRequests.delete(assetId);
    return metadata;
  }).catch(err => {
    console.error(`[Gallery] Error fetching asset ${assetId}:`, err);
    pendingAssetRequests.delete(assetId);
    return {
      id: assetId,
      title: "Untitled",
      description: "",
      virtue: "Unknown",
      creator: "Anonymous",
      creatorFormatted: "Anonymous",
      dateCreated: "",
      contentType: "image/jpeg",
      imageUrl: `https://arweave.net/${assetId}`,
      arweaveUrl: `https://arweave.net/${assetId}`,
      bazarUrl: `https://bazar.arweave.net/#/asset/${assetId}`
    };
  });

  pendingAssetRequests.set(assetId, assetPromise);
  return assetPromise;
}

// --------------------------------------------
// Gallery loading with caching
// --------------------------------------------
async function loadGallery(page = 1, limit = 10) {
  const gallery = document.getElementById("gallery");

  if (page === 1) {
    gallery.innerHTML = "<p style='color: #ffe793ff; text-align: center;'>Loading gallery...</p>";
    allAssets = [];
  }

  try {
    let submissions = [];

    // Cached submissions
    if (page === 1) {
      const cached = loadCacheFromLocalStorage();
      if (cached) {
        submissions = cached;
        console.log("[Gallery] 📦 Loaded from cache");
      }
    }

    // Live fetch
    let liveSubmissions = [];
    try {
      liveSubmissions = await fetchSubmissionsFromAO();
    } catch (err) {
      console.error("[Gallery] ❌ AO fetch error:", err);
      if (!submissions.length) {
        gallery.innerHTML = `<div class="empty-message">❌ Could not connect to AO.</div>`;
        return;
      }
    }

    if (liveSubmissions?.length > 0) {
      submissions = liveSubmissions;
      saveCacheToLocalStorage(liveSubmissions);
      console.log(`[Gallery] ✅ Refreshed: ${liveSubmissions.length} items`);
    }

    if (!submissions.length) {
      gallery.innerHTML = `<div class="empty-message">No submissions found.</div>`;
      return;
    }

    // Paginate
    const startIndex = (page - 1) * limit;
    const pageSubmissions = submissions.slice(startIndex, startIndex + limit);

    if (!pageSubmissions.length && page > 1) {
      gallery.innerHTML += "<p style='color: #ffe793ff; text-align: center;'>No more submissions.</p>";
      return;
    }

    // Merge AO + Arweave (AO virtue preserved)
    const assetsWithData = await Promise.all(
      pageSubmissions.map(async sub => {
        const arweaveData = await fetchAssetFromArweave(sub.assetId);
        return { ...arweaveData, ...sub }; // AO submission fields override Arweave
      })
    );

    const validAssets = assetsWithData.filter(a => a && a.imageUrl);
    allAssets.push(...validAssets);

    if (page === 1) {
      allAssetsWithData = [];
      gallery.innerHTML = "";
    }
    allAssetsWithData.push(...validAssets);

    renderGalleryItems(validAssets, gallery);

    // Load More visibility
    const loadMore = document.getElementById("load-more");
    if (loadMore) loadMore.style.display = (startIndex + limit < submissions.length) ? "block" : "none";

    currentPage = page;
  } catch (err) {
    console.error("[Gallery] ❌ Load error:", err);
    gallery.innerHTML = `<p style='color: #ff4d4d; text-align: center;'>Something went wrong.</p>`;
  }
}

// --------------------------------------------
// Filters
// --------------------------------------------
async function filterGallery(virtue) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "<p style='color: #ffe793ff; text-align: center;'>Filtering...</p>";

  try {
    const submissions = (loadCacheFromLocalStorage() || await fetchSubmissionsFromAO());
    const filtered = virtue === "All"
      ? submissions
      : submissions.filter(sub => (sub.virtue || "").toLowerCase() === virtue.toLowerCase());

    if (!filtered.length) {
      gallery.innerHTML = `<div class='empty-message'>No submissions for virtue: ${virtue}</div>`;
      return;
    }

    const assetsWithData = await Promise.all(
      filtered.map(async sub => {
        const arweaveData = await fetchAssetFromArweave(sub.assetId);
        return { ...arweaveData, ...sub };
      })
    );

    // Add .filtering class to disable transitions
    gallery.classList.add("filtering");
    gallery.innerHTML = assetsWithData.map(a => createAssetHtml(a)).join("");
    // Remove .filtering class after rendering
    setTimeout(() => gallery.classList.remove("filtering"), 0);

    const loadMore = document.getElementById("load-more");
    if (loadMore) loadMore.style.display = "none";
  } catch (err) {
    console.error("[Gallery] Filter error:", err);
    gallery.innerHTML = "<p style='color: #ff4d4d; text-align: center;'>Filter failed.</p>";
  }
}

// --------------------------------------------
// Rendering helpers
// --------------------------------------------
function renderGalleryItems(assets, gallery) {
  gallery.innerHTML += assets.map(createAssetHtml).join("");
}

function createAssetHtml(asset) {
  const virtueHtml = asset.virtue ? `<span class="virtue-badge">${asset.virtue}</span>` : "";
  return `
    <div class="gallery-item" data-asset-id="${asset.id}">
      <div class="asset-image">
        <img src="${asset.imageUrl}" alt="${asset.title}" loading="lazy"
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0IyOUM4NiIvPg=='; this.style.objectFit='contain';">
      </div>
      <div class="asset-info">
        <h3><a href="${asset.bazarUrl}" target="_blank">${asset.title}</a></h3>
        <div class="asset-description">${asset.description || ""}</div>
        <div class="asset-metadata">
          ${virtueHtml ? `<div><strong>Virtue:</strong> ${virtueHtml}</div>` : ""}
          <div><strong>Creator:</strong> ${asset.creatorFormatted}</div>
          ${asset.dateCreated ? `<div><strong>Created:</strong> ${asset.dateCreated}</div>` : ""}
        </div>
        <div class="asset-links">
          <a href="${asset.arweaveUrl}" target="_blank">Arweave</a>
          <a href="${asset.bazarUrl}" target="_blank">Bazar</a>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------
// Pagination
// --------------------------------------------
function loadMoreAssets() {
  loadGallery(currentPage + 1, 10);
}

// --------------------------------------------
// Init
// --------------------------------------------
window.addEventListener("load", () => {
  checkWalletSession(); // Ensure wallet state is initialized
  setTimeout(() => loadGallery(1, 10), 500);
});

window.filterGallery = filterGallery;
window.loadMoreAssets = loadMoreAssets;
