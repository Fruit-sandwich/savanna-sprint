async function fetchXPosts() {
    const xPosts = document.getElementById("x-posts");
    try {
        // Placeholder X API call (replace with actual bearer token and endpoint)
        const response = await fetch('https://api.x.com/2/tweets/search/recent?query=%23SavannaLegacySprint&max_results=10', {
            headers: {
                'Authorization': `Bearer ${process.env.X_API_BEARER_TOKEN}`
            }
        });
        const data = await response.json();
        const posts = data.data || [];
        xPosts.innerHTML = posts.map(post => `
            <div class="x-post">
                <p>${post.text}</p>
                <p><a href="https://x.com/i/web/status/${post.id}" target="_blank">View on X</a></p>
            </div>
        `).join("") || "<p>No recent posts found. Join the conversation with #SavannaLegacySprint!</p>";
    } catch (error) {
        console.error("X posts fetch error:", error);
        xPosts.innerHTML = "<p style='color: #ff4d4d; text-align: center;'>Failed to load X posts. Try again later.</p>";
    }
}

function shareOnX(assetUrl) {
    const tweetText = `Just submitted to #SavannaLegacySprint! Check my artwork: ${assetUrl}`;
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank');
}