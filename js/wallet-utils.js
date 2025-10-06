// wallet-utils.js
// Centralized wallet connection + state management for Savanna Legacy Sprint
// This file ensures a single source of truth for the connected wallet.
// Other modules (submission.js, gallery.js) can import functions from here.

console.log("Wallet utils loaded");

// ================= Internal State =================
let connectedWalletAddress = null;

// ================= Core Functions =================

/**
 * Connects to the Arweave wallet (Wander / ArConnect).
 * Requests required permissions, fetches the active address,
 * and updates UI if elements are present.
 */
export async function connectWallet() {
  try {
    if (!window.arweaveWallet) {
      alert("No Arweave wallet detected. Please install Wander (formerly ArConnect).");
      return null;
    }

    // Request permissions (including DISPATCH for AO futureproofing)
    const perms = ["ACCESS_ADDRESS", "SIGN_TRANSACTION", "DISPATCH"];

    try {
      await window.arweaveWallet.connect(perms);
    } catch (permErr) {
      console.warn("Some permissions may not be supported:", permErr);
      // Fallback: try without DISPATCH if wallet doesn’t support it
      if (perms.includes("DISPATCH")) {
        await window.arweaveWallet.connect(["ACCESS_ADDRESS", "SIGN_TRANSACTION"]);
      }
    }

    // Get active address
    connectedWalletAddress = await window.arweaveWallet.getActiveAddress();

    // Update UI if present
    updateWalletUI(connectedWalletAddress);

    return connectedWalletAddress;
  } catch (err) {
    console.error("Wallet connection failed:", err);
    alert("Failed to connect wallet: " + (err?.message || err));
    return null;
  }
}

/**
 * Returns the currently connected wallet address.
 */
export function getWalletAddress() {
  return connectedWalletAddress;
}

/**
 * Attempts to auto-restore an existing wallet session on page load.
 * If the wallet is already connected in the extension, reuse it.
 */
export async function restoreWalletSession() {
  try {
    if (window.arweaveWallet) {
      const address = await window.arweaveWallet.getActiveAddress();
      if (address) {
        connectedWalletAddress = address;
        updateWalletUI(address);
        console.log("Restored wallet session:", address);
      }
    }
  } catch (err) {
    console.warn("No previous wallet session found:", err);
  }
}

// ================= UI Helper =================

function formatWalletAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function updateWalletUI(address) {
  const connectWalletBtn = document.getElementById("connect-wallet-btn");
  const walletAddressEl = document.getElementById("wallet-address");

  if (walletAddressEl) {
    walletAddressEl.textContent = `Connected: ${formatWalletAddress(address)}`;
  }
  if (connectWalletBtn) {
    connectWalletBtn.disabled = true;
    connectWalletBtn.textContent = "Wallet Connected ✅";
  }
}

// ================= Auto-Wiring =================

// Wire up button click if present in DOM
window.addEventListener("DOMContentLoaded", () => {
  const connectWalletBtn = document.getElementById("connect-wallet-btn");
  if (connectWalletBtn) {
    connectWalletBtn.addEventListener("click", connectWallet);
  }
  restoreWalletSession();
});

// Expose for debugging
window.walletUtils = { connectWallet, getWalletAddress, restoreWalletSession };
