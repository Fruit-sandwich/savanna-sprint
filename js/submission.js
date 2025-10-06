// submission.js
// Handles artwork submission and confirmation for Savanna Legacy Sprint.

import { AO_PROCESS_ID, validateBazarUrl, fetchAssetMetadata } from "./ao-utils.js";
import { getWalletAddress } from "./wallet-utils.js";

// -----------------------------
// Small UI helper
// -----------------------------
function setFeedback(message, color = "#ffe793ff") {
  const feedback = document.getElementById("submission-feedback");
  if (feedback) {
    feedback.innerHTML = message;
    feedback.style.color = color;
  }
}

// -----------------------------
// Dispatch-aware AO message sender
// -----------------------------
async function sendAoMessage(ao, submission, signer) {
  try {
    return await ao.message({
      process: AO_PROCESS_ID,
      signer,
      tags: [{ name: "Action", value: "submit" }],
      data: JSON.stringify(submission),
      dispatch: true
    });
  } catch (err) {
    console.warn("⚠️ Dispatch path failed, retrying without dispatch:", err);
    return await ao.message({
      process: AO_PROCESS_ID,
      signer,
      tags: [{ name: "Action", value: "submit" }],
      data: JSON.stringify(submission)
    });
  }
}

// -----------------------------
// Cache helpers (same keys as gallery.js)
// -----------------------------
const STORAGE_KEY = "savannaGalleryCache";
const TIMESTAMP_KEY = "savannaGalleryTimestamp";

function addSubmissionToCache(submission) {
  try {
    const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    cached.unshift(submission); // put newest first
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
    console.log("[Submission] ✅ Added to localStorage cache");
  } catch (err) {
    console.warn("[Submission] Failed to update cache:", err);
  }
}

// -----------------------------
// Confirmation logic with X-Reference
// -----------------------------
async function confirmSubmission(ao, sentMsg, selectedVirtue, txId, enrichedSubmission) {
  let confirmed = false;

  function successMessage() {
    return `
      🎉 Submission stored under "<strong>${selectedVirtue}</strong>"!<br>
      TX: <a href="https://arweave.net/${txId}" target="_blank">${txId}</a><br>

    `;
  }

  // 1. Try direct result with timeout
  try {
    const result = await Promise.race([
      ao.result({ message: txId, process: AO_PROCESS_ID }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 90000))
    ]);

    if (result && result.Messages && result.Messages.length > 0) {
      const reply = result.Messages[0];
      const xRef = reply.Tags?.find(t => t.name === "X-Reference")?.value;

      if (xRef === txId) {
        confirmed = true;
        let replyData;
        try {
          replyData = JSON.parse(reply.Data);
        } catch {
          replyData = { message: reply.Data };
        }

        if (replyData.status === "ok") {
          setFeedback(successMessage());
          addSubmissionToCache(enrichedSubmission); // ✅ add to gallery cache
        } else if (replyData.status === "duplicate") {
          setFeedback(`⚠️ Duplicate submission rejected.<br>TX: <code>${txId}</code>`, "#ff4d4d");
        } else {
          setFeedback(`⚠️ ${replyData.message || "Unknown reply"}<br>TX: <code>${txId}</code>`, "#ff4d4d");
        }
      }
    }
  } catch (err) {
    console.warn("Direct result() failed:", err.message);
  }

  // 2. Polling fallback
  if (!confirmed) {
    setFeedback(`⏳ Still waiting... checking for confirmation...<br>
      <a href="https://arweave.net/${txId}" target="_blank">${txId}</a>`, "#ffcc00");

    let polls = 6;
    while (polls-- > 0 && !confirmed) {
      try {
        const msgs = await ao.getMessages({
          processId: AO_PROCESS_ID,
          tags: [{ name: "Action", value: "submit_result" }],
          limit: 5
        });

        if (msgs && msgs.length > 0) {
          const reply = msgs.find(m => {
            const xRef = m.Tags?.find(t => t.name === "X-Reference")?.value;
            return xRef === txId;
          });

          if (reply) {
            confirmed = true;
            let replyData;
            try {
              replyData = JSON.parse(reply.Data);
            } catch {
              replyData = { message: reply.Data };
            }

            if (replyData.status === "ok") {
              setFeedback(successMessage());
              addSubmissionToCache(enrichedSubmission);
            } else if (replyData.status === "duplicate") {
              setFeedback(`⚠️ Duplicate submission rejected.<br>TX: <code>${txId}</code>`, "#ff4d4d");
            } else {
              setFeedback(`⚠️ ${replyData.message || "Unknown reply"}<br>TX: <code>${txId}</code>`, "#ff4d4d");
            }
            break;
          }
        }
      } catch (e) {
        console.warn("Polling failed:", e);
      }
      await new Promise(r => setTimeout(r, 10000));
    }

    if (!confirmed) {
      setFeedback(`⚠️ No confirmation received. Check transaction:
        <a href="https://arweave.net/${txId}" target="_blank">${txId}</a>`, "#ff4d4d");
    }
  }
}

// -----------------------------
// Submission entrypoint
// -----------------------------
async function submitArtwork(assetUrl, selectedVirtue) {
  const submitBtn = document.querySelector("#artwork-submission button[type=submit]");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const walletAddress = getWalletAddress();
    if (!walletAddress) throw new Error("Please connect your wallet first!");

    // 1. Validate URL
    const validation = validateBazarUrl(assetUrl);
    if (!validation.valid) throw new Error(validation.error);
    const assetId = validation.assetId;

    setFeedback("Submitting artwork...", "#ffcc00");

    // 2. Fetch metadata from Arweave
    const assetData = await fetchAssetMetadata(assetId);

    // 3. Prepare AO submission (what we store in process)
    const submission = {
      AssetId: assetId,
      BazarUrl: assetUrl,
      Virtue: selectedVirtue, // ✅ always preserved
      Title: assetData.title || "Untitled",
      Description: assetData.description || "",
      Creator: assetData.creator || walletAddress,
      ContentType: assetData.contentType || "image/jpeg",
      Timestamp: Math.floor(Date.now() / 1000)
    };

    // 4. Enriched object for gallery/cache (AO wins over Arweave if overlap)
    const enrichedSubmission = {
      ...assetData,
      ...submission, // ✅ AO values override (Virtue stays correct)
      id: assetId,
      assetId,
      creatorFormatted: walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4),
      dateCreated: new Date().toLocaleDateString(),
      imageUrl: assetData.imageUrl || `https://arweave.net/${assetId}`,
      arweaveUrl: `https://arweave.net/${assetId}`,
      bazarUrl: `https://bazar.arweave.net/#/asset/${assetId}`
    };

    // 5. Init AO signer + connection
    const { connect, createDataItemSigner } = window.AOconnect;
    const signer = createDataItemSigner(window.arweaveWallet);
    const ao = connect();

    // ✅ Send
    const sentMsg = await sendAoMessage(ao, submission, signer);

    const txId = sentMsg.id || sentMsg;
    setFeedback(`✅ Artwork submitted! Waiting for confirmation…<br>
      <a href="https://arweave.net/${txId}" target="_blank">View TX</a>`, "#4CAF50");

    // 6. Confirm submission
    await confirmSubmission(ao, sentMsg, selectedVirtue, txId, enrichedSubmission);

    // 7. Reset form
    document.getElementById("artwork-submission").reset();

  } catch (err) {
    console.error("Submission failed:", err);
    setFeedback(`⚠️ Error: ${err.message || err}`, "#ff4d4d");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// -----------------------------
// Attach form handler
// -----------------------------
window.addEventListener("load", () => {
  const form = document.getElementById("artwork-submission");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const assetUrl = document.getElementById("asset-url").value;
    const selectedVirtue = document.getElementById("artwork-virtue").value;
    submitArtwork(assetUrl, selectedVirtue);
  });
});

// -----------------------------
// Smooth scroll to new submission
// -----------------------------
window.scrollToSubmission = function (assetId) {
  const el = document.querySelector(`[data-asset-id="${assetId}"]`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlighted");
    setTimeout(() => el.classList.remove("highlighted"), 2000);
  } else {
    console.warn("Submission not found in gallery:", assetId);
  }
};
