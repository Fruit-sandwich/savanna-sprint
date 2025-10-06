//stamps.js
async function addStamp(assetId) {
    const feedback = document.getElementById("submission-feedback");
    try {
        const { stamp } = window.StampJS;
        await stamp(assetId, window.AOConnect.createDataItemSigner(window.arweaveWallet));
        feedback.textContent = "Stamped successfully!";
        feedback.style.color = "#ffe793ff";
        loadGallery(currentPage, 10);
    } catch (error) {
        feedback.textContent = `Error stamping: ${error.message}`;
        feedback.style.color = "#ff4d4d";
    }
}
