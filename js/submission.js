async function submitArtwork(assetUrl) {
    const feedback = document.getElementById("submission-feedback");
    try {
        if (!window.arweaveWallet) {
            throw new Error("Please connect your Arweave wallet.");
        }
        const assetId = assetUrl.match(/\/asset\/([a-zA-Z0-9_-]+)/)?.[1];
        if (!assetId) {
            throw new Error("Invalid Bazar asset URL.");
        }
        const { aos, createDataItemSigner } = window.AOConnect;
        const message = await aos.message({
            process: "UCM_PROCESS_ID",
            signer: createDataItemSigner(window.arweaveWallet),
            tags: [
                { name: "Action", value: "Submit-Asset" },
                { name: "Challenge", value: "SavannaLegacySprint" },
                { name: "Asset-ID", value: assetId }
            ],
            data: { assetUrl }
        });
        const result = await aos.result({ message, process: "UCM_PROCESS_ID" });
        if (result.error) {
            throw new Error(result.error);
        }
        feedback.innerHTML = `Artwork submitted successfully! <a href="gallery.html" target="_blank">View in Gallery</a> or <button class="lang-button" onclick="shareOnX('${assetUrl}')">Share on X</button>`;
        feedback.style.color = "#ffe793ff";
    } catch (error) {
        feedback.textContent = `Error: ${error.message}`;
        feedback.style.color = "#ff4d4d";
    }
}

document.getElementById("artwork-submission").addEventListener("submit", (e) => {
    e.preventDefault();
    const assetUrl = document.getElementById("asset-url").value;
    submitArtwork(assetUrl);
});