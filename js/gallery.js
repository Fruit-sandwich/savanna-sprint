let currentPage = 1;

async function loadGallery(page = 1, limit = 10) {
    try {
        const { aos } = window.AOConnect;
        const message = await aos.message({
            process: "UCM_PROCESS_ID",
            tags: [
                { name: "Action", value: "Get-Assets" },
                { name: "Challenge", value: "SavannaLegacySprint" },
                { name: "Page", value: page.toString() },
                { name: "Limit", value: limit.toString() }
            ]
        });
        const result = await aos.result({ message, process: "UCM_PROCESS_ID" });
        const assets = result.data || [];
        const gallery = document.getElementById("gallery");
        if (page === 1) {
            gallery.innerHTML = "";
        }
        gallery.innerHTML += assets.map(asset => `
            <div class="gallery-item">
                <iframe src="https://bazar.arweave.net/#/asset/${asset.id}" width="200" height="200" frameborder="0"></iframe>
                <p><a href="https://bazar.arweave.net/#/asset/${asset.id}">${asset.title}</a></p>
                <p>Virtue: ${asset.virtue}</p>
                <p>Artist: <a href="https://bazar.arweave.net/#/profile/${asset.profileId}">${asset.artist}</a></p>
                <button class="lang-button" onclick="addStamp('${asset.id}')">Stamp</button>
                <p>Stamps: ${asset.stampCount || 0}</p>
            </div>
        `).join("");
        currentPage = page;
        const loadMore = document.getElementById("load-more");
        loadMore.style.display = assets.length === limit ? "block" : "none";
    } catch (error) {
        console.error("Gallery load error:", error);
        document.getElementById("gallery").innerHTML = "<p style='color: #ff4d4d; text-align: center;'>Failed to load gallery. Please try again.</p>";
    }
}

async function filterGallery(virtue) {
    try {
        const { aos } = window.AOConnect;
        const tags = [
            { name: "Action", value: "Get-Assets" },
            { name: "Challenge", value: "SavannaLegacySprint" }
        ];
        if (virtue !== "All") {
            tags.push({ name: "Virtue", value: virtue });
        }
        const message = await aos.message({
            process: "UCM_PROCESS_ID",
            tags
        });
        const result = await aos.result({ message, process: "UCM_PROCESS_ID" });
        const assets = result.data || [];
        const gallery = document.getElementById("gallery");
        gallery.innerHTML = assets.map(asset => `
            <div class="gallery-item">
                <iframe src="https://bazar.arweave.net/#/asset/${asset.id}" width="200" height="200" frameborder="0"></iframe>
                <p><a href="https://bazar.arweave.net/#/asset/${asset.id}">${asset.title}</a></p>
                <p>Virtue: ${asset.virtue}</p>
                <p>Artist: <a href="https://bazar.arweave.net/#/profile/${asset.profileId}">${asset.artist}</a></p>
                <button class="lang-button" onclick="addStamp('${asset.id}')">Stamp</button>
                <p>Stamps: ${asset.stampCount || 0}</p>
            </div>
        `).join("");
        document.getElementById("load-more").style.display = "none";
    } catch (error) {
        console.error("Filter error:", error);
        document.getElementById("gallery").innerHTML = "<p style='color: #ff4d4d; text-align: center;'>Failed to load filtered gallery. Please try again.</p>";
    }
}

// Initialize gallery
window.addEventListener('load', () => {
    loadGallery(1, 10);
});