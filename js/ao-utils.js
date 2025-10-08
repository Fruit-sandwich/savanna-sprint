// ao-utils.js
// Shared utilities for AO process, validation, and metadata fetching.

export const AO_PROCESS_ID = "K5BulgZMCI0YDANG5YXlOpl0lGjY3gpwCL08EwTdAKc";

// --------------------------------------------
// Address helpers
// --------------------------------------------
export function formatAddress(addr) {
  if (!addr || addr === "Anonymous" || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// --------------------------------------------
// URL validation + parsing
// --------------------------------------------
export function extractAssetId(bazarUrl) {
  const match = bazarUrl.match(/\/asset\/([a-zA-Z0-9_-]{43,44})/);
  return match ? match[1] : null;
}

export function validateBazarUrl(url) {
  if (!url || typeof url !== "string")
    return { valid: false, error: "URL is required" };
  if (!url.includes("bazar.arweave.net"))
    return { valid: false, error: "Must be a Bazar URL (bazar.arweave.net)" };
  const assetId = extractAssetId(url);
  if (!assetId)
    return { valid: false, error: "Invalid Bazar asset URL format" };
  return { valid: true, assetId };
}

// --------------------------------------------
// Arweave GraphQL metadata fetch (normalized)
// --------------------------------------------
export async function fetchAssetMetadata(assetId) {
  try {
    const graphqlQuery = {
      query: `
        query GetTransaction($id: ID!) {
          transaction(id: $id) {
            id
            tags { name value }
            block { timestamp }
          }
        }`,
      variables: { id: assetId }
    };

    const response = await fetch("https://arweave.net/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphqlQuery)
    });

    if (!response.ok) throw new Error(`GraphQL request failed: ${response.status}`);
    const data = await response.json();
    if (!data.data || !data.data.transaction) throw new Error("Transaction not found");

    const tx = data.data.transaction;
    const tags = {};
    tx.tags.forEach(tag => (tags[tag.name] = tag.value));

    // Flexible fallbacks
    const title = tags.Title || tags["Asset-Name"] || tags["Bootloader-Name"] || "Untitled";
    const description = tags.Description || tags["Asset-Description"] || tags["Bootloader-Description"] || "";
    const virtue = tags.Virtue || tags["Asset-Virtue"] || tags["Bootloader-Virtue"] || "Unknown";
    const creator = tags.Creator || tags["Asset-Creator"] || tags["Bootloader-Creator"] || "Anonymous";

    const dateCreated = tx.block?.timestamp
      ? new Date(tx.block.timestamp * 1000).toLocaleDateString()
      : "";

    return {
      id: assetId,
      title,
      description,
      virtue,
      creator,
      creatorFormatted: formatAddress(creator),
      dateCreated,
      contentType: tags["Content-Type"] || "image/jpeg",
      imageUrl: `https://arweave.net/${assetId}`,
      arweaveUrl: `https://arweave.net/${assetId}`,
      bazarUrl: `https://bazar.arweave.net/#/asset/${assetId}`
    };
  } catch (err) {
    console.warn("[AO] Metadata fetch failed:", err);
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
  }
}

// --------------------------------------------
// AO: Fetch all submissions (read-only state)
// --------------------------------------------
export async function fetchSubmissionsFromAO() {
  // 1. Try HyperBEAM HTTP endpoint
  try {
    const res = await fetch(`https://su44.ao-testnet.xyz/${AO_PROCESS_ID}/state`, {
      headers: { "Accept": "application/json" }
    });

    if (res.ok) {
      const data = await res.json();
      const submissions = data.submissions || [];
      if (Array.isArray(submissions)) {
        console.log(`[AO] 🌐 HyperBEAM returned ${submissions.length} submissions`);
        return submissions.map(sub => normalizeSubmission(sub));
      }
    } else if (res.status === 404) {
      console.log("[AO] ℹ️ HyperBEAM not enabled. Falling back to dryrun.");
    } else {
      console.warn("[AO] ⚠️ HyperBEAM request failed:", res.status);
    }
  } catch (err) {
    console.log("[AO] ℹ️ HyperBEAM unavailable, falling back to dryrun.", err.message);
  }

  // 2. Fallback: aos dryrun
  try {
    const { connect } = window.AOconnect;
    if (!connect) throw new Error("AOconnect.connect is undefined");

    const ao = connect();
    const res = await ao.dryrun({
      process: AO_PROCESS_ID,
      tags: [{ name: "Action", value: "~patch@1.0" }]
    });

    console.log("[AO] 🛰️ Dryrun response:", res);

    let submissions = [];
    if (Array.isArray(res?.Messages) && res.Messages.length > 0) {
      try {
        const parsed = JSON.parse(res.Messages[0].Data || "{}");
        submissions = parsed.submissions || [];
      } catch (e) {
        console.warn("[AO] ⚠️ Failed to parse submissions:", e);
      }
    }

    if (!Array.isArray(submissions)) {
      console.warn("[AO] ⚠️ Submissions not an array:", submissions);
      return [];
    }

    console.log(`[AO] 🔎 Dryrun returned ${submissions.length} submissions`);
    return submissions.map(sub => normalizeSubmission(sub));
  } catch (err) {
    console.error("[AO] ❌ Error fetching submissions:", err);
    return [];
  }
}



// --------------------------------------------
// Internal helper: normalize backend → frontend
// --------------------------------------------
function normalizeSubmission(sub) {
  return {
    id: sub.AssetId,
    assetId: sub.AssetId,
    title: sub.Title || "Untitled",
    description: sub.Description || "",
    virtue: sub.Virtue || "Unknown",
    creator: sub.Creator || "Anonymous",
    creatorFormatted: formatAddress(sub.Creator || "Anonymous"),
    bazarUrl: sub.BazarUrl,
    submittedAt: (sub.Timestamp || 0) * 1000,
    contentType: sub.ContentType || "image/jpeg",
    sender: sub.Sender
  };
}
