// wallet-utils.js
// Centralized wallet connection + state management for Savanna Legacy Sprint
// Enhanced for robustness, security, and AO compatibility

console.log("Wallet utils loaded");

// ================= Internal State =================
let connectedWalletAddress = null;
let isConnecting = false;

// ================= Constants =================
const REQUIRED_PERMS = ["ACCESS_ADDRESS", "SIGN_TRANSACTION"];
const OPTIONAL_PERMS = ["DISPATCH"];
const ARWEAVE_ADDRESS_REGEX = /^[a-zA-Z0-9_-]{43}$/;
const WALLET_POLL_INTERVAL = 500; // ms
const WALLET_POLL_TIMEOUT = 5000; // ms
const SESSION_STORAGE_KEY = "savannaWalletAddress";

// ================= Core Functions =================

/**
 * Waits for wallet extension to load with timeout.
 * @returns {Promise<boolean>} True if wallet is detected, false otherwise.
 */
async function waitForWallet() {
  console.debug("Waiting for Arweave wallet...");
  const start = Date.now();
  while (Date.now() - start < WALLET_POLL_TIMEOUT) {
    if (window.arweaveWallet) {
      console.debug("Arweave wallet detected");
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, WALLET_POLL_INTERVAL));
  }
  console.debug("No Arweave wallet detected after timeout");
  return false;
}

/**
 * Validates an Arweave address format.
 * @param {string} address - Wallet address to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidArweaveAddress(address) {
  const isValid = typeof address === "string" && ARWEAVE_ADDRESS_REGEX.test(address);
  console.debug("Validating address:", address, "Is valid:", isValid);
  return isValid;
}

/**
 * Checks the stored wallet session and validates it with ArConnect.
 * Updates the internal state and UI if the session is valid.
 * @returns {Promise<void>}
 */
async function checkWalletSession() {
  console.debug("Checking wallet session...");
  console.debug("Current sessionStorage:", sessionStorage.getItem(SESSION_STORAGE_KEY));
  try {
    const storedAddress = sessionStorage.getItem(SESSION_STORAGE_KEY);
    console.debug("Stored address:", storedAddress);
    if (!storedAddress || !isValidArweaveAddress(storedAddress)) {
      console.debug("No valid stored address found.");
      connectedWalletAddress = null;
      updateWalletUI(null);
      return;
    }

    if (!(await waitForWallet())) {
      console.debug("No wallet extension detected.");
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      connectedWalletAddress = null;
      updateWalletUI(null);
      showFeedback("No Arweave wallet detected. Please install <a href='https://www.arconnect.io/' target='_blank' style='color: #4CAF50; text-decoration: none;'>ArConnect</a>.", "#ff4d4d");
      return;
    }

    // Validate stored address against current ArConnect session with retries
    let currentAddress;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        currentAddress = await window.arweaveWallet.getActiveAddress();
        console.debug("Current ArConnect address (attempt", attempt, "):", currentAddress);
        if (isValidArweaveAddress(currentAddress)) break;
        throw new Error("Invalid address format");
      } catch (err) {
        console.debug("Error fetching ArConnect address (attempt", attempt, "):", err);
        if (attempt === 3) {
          console.debug("Failed to fetch valid address after retries.");
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          connectedWalletAddress = null;
          updateWalletUI(null);
          showFeedback("Wallet session expired. Please reconnect.", "#ff4d4d");
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (currentAddress === storedAddress) {
      connectedWalletAddress = storedAddress;
      updateWalletUI(storedAddress);
      console.debug("Wallet session restored successfully:", storedAddress);
    } else {
      console.debug("Stored address does not match current address.");
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      connectedWalletAddress = null;
      updateWalletUI(null);
      showFeedback("Wallet session invalid. Please reconnect.", "#ff4d4d");
    }
  } catch (err) {
    console.debug("Error checking wallet session:", err);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    connectedWalletAddress = null;
    updateWalletUI(null);
  }
}

/**
 * Connects to the Arweave wallet (Wander / ArConnect).
 * Requests required permissions, fetches the active address,
 * and updates UI if elements are present.
 * @returns {Promise<string|null>} Connected wallet address or null on failure.
 */
async function connectWallet() {
  if (isConnecting) {
    console.debug("Connect wallet already in progress");
    return connectedWalletAddress;
  }
  isConnecting = true;
  setWalletLoadingState(true);

  try {
    // Check for wallet extension
    if (!(await waitForWallet())) {
      showFeedback("No Arweave wallet detected. Please install <a href='https://www.arconnect.io/' target='_blank' style='color: #4CAF50; text-decoration: none;'>ArConnect</a>.", "#ff4d4d");
      return null;
    }

    // Request permissions
    const permsToRequest = [...REQUIRED_PERMS, ...OPTIONAL_PERMS];
    let grantedPerms = [];
    try {
      await window.arweaveWallet.connect(permsToRequest);
      grantedPerms = permsToRequest;
      console.debug("Permissions granted:", permsToRequest);
    } catch (permErr) {
      console.debug("Full permission set failed:", permErr);
      // Fallback to required permissions only
      try {
        await window.arweaveWallet.connect(REQUIRED_PERMS);
        grantedPerms = REQUIRED_PERMS;
        console.debug("Fallback permissions granted:", REQUIRED_PERMS);
      } catch (fallbackErr) {
        showFeedback("Failed to connect wallet: Permission denied.", "#ff4d4d");
        throw fallbackErr;
      }
    }

    // Validate granted permissions
    if (!REQUIRED_PERMS.every(p => grantedPerms.includes(p))) {
      showFeedback("Wallet connection lacks required permissions.", "#ff4d4d");
      return null;
    }

    // Get active address with retry
    let address;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        address = await window.arweaveWallet.getActiveAddress();
        if (isValidArweaveAddress(address)) break;
        throw new Error("Invalid address format");
      } catch (err) {
        if (attempt === 3) {
          showFeedback("Failed to fetch wallet address after retries.", "#ff4d4d");
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Store and update UI
    connectedWalletAddress = address;
    sessionStorage.setItem(SESSION_STORAGE_KEY, address);
    console.debug("Wallet address stored in sessionStorage:", address);
    updateWalletUI(address);
    showFeedback("Wallet connected successfully!", "#4CAF50");

    return address;
  } catch (err) {
    console.error("Wallet connection failed:", err);
    showFeedback(`Failed to connect wallet: ${err.message || "Unknown error"}`, "#ff4d4d");
    return null;
  } finally {
    isConnecting = false;
    setWalletLoadingState(false);
  }
}

/**
 * Disconnects the wallet, clears the session, and updates UI.
 * @returns {Promise<void>}
 */
async function disconnectWallet() {
  try {
    if (window.arweaveWallet) {
      await window.arweaveWallet.disconnect();
      console.debug("Wallet disconnected from ArConnect");
    }
    connectedWalletAddress = null;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    console.debug("Session storage cleared");
    updateWalletUI(null);
    showFeedback("Wallet disconnected.", "#ffcc00");
  } catch (err) {
    console.debug("Failed to disconnect wallet:", err);
    showFeedback("Failed to disconnect wallet.", "#ff4d4d");
  }
}

/**
 * Returns the currently connected wallet address.
 * @returns {string|null} Connected address or null if not connected.
 */
function getWalletAddress() {
  console.debug("Getting wallet address:", connectedWalletAddress);
  return connectedWalletAddress;
}

// ================= UI Helpers =================

/**
 * Formats an Arweave address for display.
 * @param {string} address - Wallet address.
 * @returns {string} Formatted address or empty string if invalid.
 */
function formatWalletAddress(address) {
  if (!address || !isValidArweaveAddress(address)) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Updates wallet-related UI elements.
 * @param {string|null} address - Connected wallet address or null if disconnected.
 */
function updateWalletUI(address) {
  console.debug("Updating wallet UI with address:", address);
  const connectWalletBtn = document.getElementById("connect-wallet-btn");
  const walletAddressEl = document.getElementById("wallet-address");

  if (walletAddressEl) {
    walletAddressEl.textContent = address ? `Connected: ${formatWalletAddress(address)}` : "";
  }
  if (connectWalletBtn) {
    if (address) {
      connectWalletBtn.disabled = false;
      connectWalletBtn.textContent = "Disconnect Wallet";
      connectWalletBtn.onclick = disconnectWallet;
    } else {
      connectWalletBtn.disabled = false;
      connectWalletBtn.textContent = "Connect Wallet";
      connectWalletBtn.onclick = connectWallet;
    }
  }
}

/**
 * Sets loading state for wallet UI.
 * @param {boolean} isLoading - Whether to show loading state.
 */
function setWalletLoadingState(isLoading) {
  const connectWalletBtn = document.getElementById("connect-wallet-btn");
  if (connectWalletBtn) {
    connectWalletBtn.disabled = isLoading;
    connectWalletBtn.textContent = isLoading ? "Connecting..." : (connectedWalletAddress ? "Disconnect Wallet" : "Connect Wallet");
    connectWalletBtn.onclick = isLoading ? null : (connectedWalletAddress ? disconnectWallet : connectWallet);
  }
}

/**
 * Displays user feedback in the submission feedback area.
 * Skips if the feedback element is not found to avoid alerts.
 * @param {string} message - Feedback message (can include HTML).
 * @param {string} color - Hex color for text.
 */
function showFeedback(message, color) {
  console.debug("Showing feedback:", message, color);
  const feedbackEl = document.getElementById("submission-feedback");
  if (feedbackEl) {
    feedbackEl.innerHTML = message;
    feedbackEl.style.color = color;
  } else {
    console.debug("Submission feedback element not found, skipping feedback display");
  }
}

// ================= Auto-Wiring =================

function initializeWallet() {
  console.debug("Initializing wallet...");
  const connectWalletBtn = document.getElementById("connect-wallet-btn");
  if (connectWalletBtn) {
    connectWalletBtn.addEventListener("click", () => {
      if (connectedWalletAddress) {
        disconnectWallet();
      } else {
        connectWallet();
      }
    });
  }
  checkWalletSession();
}

// Run immediately
console.debug("Running initial wallet session check");
checkWalletSession();

// Run on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  console.debug("DOMContentLoaded triggered");
  initializeWallet();
});

// Fallback for late DOM loading
window.addEventListener("load", () => {
  console.debug("Window load triggered");
  if (!connectedWalletAddress) {
    initializeWallet();
  }
});

// ================= Exports =================
export { connectWallet, disconnectWallet, getWalletAddress, showFeedback, isValidArweaveAddress, checkWalletSession };
window.walletUtils = { connectWallet, disconnectWallet, getWalletAddress, showFeedback, isValidArweaveAddress, checkWalletSession };
