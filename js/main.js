//main.js


// Countdown timer

let timerInterval;

function startCountdown() {
    const deadline = new Date("2025-12-20T00:00:00Z").getTime();
    const timerElement = document.getElementById("timer");

    function updateTimer() {
        const now = new Date().getTime();
        const timeLeft = deadline - now;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerElement.textContent = "Deadline Reached";
            return;
        }

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        timerElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000); // 👈 remove const here
}


// Language toggle
function switchLanguage(lang) {
    const kizungu = document.querySelectorAll(".kizungu");
    const kiswahili = document.querySelectorAll(".kiswahili");
    const englishBtn = document.getElementById("english");
    const kiswahiliBtn = document.getElementById("kiswahili");

    if (lang === "english") {
        kizungu.forEach((el) => el.classList.add("active"));
        kiswahili.forEach((el) => el.classList.remove("active"));
        englishBtn.classList.add("active");
        kiswahiliBtn.classList.remove("active");
    } else {
        kizungu.forEach((el) => el.classList.remove("active"));
        kiswahili.forEach((el) => el.classList.add("active"));
        englishBtn.classList.remove("active");
        kiswahiliBtn.classList.add("active");
    }
}

// Load content from JSON
async function loadContent() {
  try {
    const response = await fetch('data/content.json');
    const content = await response.json();

    const map = [
      ["story-en", content.story.en],
      ["story-sw", content.story.sw],
      ["rules-en", content.rules.en],
      ["rules-sw", content.rules.sw],
      ["guidelines-en", content.guidelines.en],
      ["guidelines-sw", content.guidelines.sw]
    ];

    map.forEach(([id, html]) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    });
  } catch (err) {
    console.error("Error loading content.json:", err);
  }
}





// Initialize
window.onload = () => {
    loadSDKs();
    if (document.getElementById('timer')) startCountdown();
    loadContent();
    switchLanguage('english');


    // SVG badge hover effects
    const badges = ["sharing-symbol", "wisdom-symbol", "paw-symbol", "unity-symbol"];
    badges.forEach((id) => {
        const badge = document.getElementById(id);
        if (badge) {
            badge.addEventListener("mouseenter", () => {
                badge.setAttribute("fill", "#b29c86ff");
                badge.style.transition = "fill 0.3s ease";
            });
            badge.addEventListener("mouseleave", () => {
                badge.setAttribute("fill", "#3c2817");
            });
        }
    });
};

// Load Arweave SDK
const loadSDKs = () => {
    // Load Arweave SDK
    const arweaveScript = document.createElement('script');
    arweaveScript.src = 'https://unpkg.com/arweave@1.14.4/bundles/web.bundle.js';
    document.head.appendChild(arweaveScript);

    // Initialize Arweave after script loads
    arweaveScript.onload = () => {
        window.arweave = Arweave.init({
            host: 'arweave.net',
            port: 443,
            protocol: 'https'
        });
    };
};

// Submission Storage System
class SubmissionStorage {
    constructor() {
        this.storageKey = 'savannaLegacySubmissions';
    }

    // Get all submissions
    getSubmissions() {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : [];
    }

    // Add a new submission
    addSubmission(submission) {
        const submissions = this.getSubmissions();
        const newSubmission = {
            id: this.generateId(),
            assetId: submission.assetId,
            bazarUrl: submission.bazarUrl,
            submittedAt: new Date().toISOString(),
            ...submission
        };
        submissions.push(newSubmission);
        localStorage.setItem(this.storageKey, JSON.stringify(submissions));
        return newSubmission;
    }

    // Check if asset ID already exists
    assetExists(assetId) {
        const submissions = this.getSubmissions();
        return submissions.some(sub => sub.assetId === assetId);
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Remove submission (if needed for admin purposes)
    removeSubmission(id) {
        const submissions = this.getSubmissions();
        const filtered = submissions.filter(sub => sub.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    }
}

// Initialize submission storage
window.submissionStorage = new SubmissionStorage();
