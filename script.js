// Initialize Leaflet map
var map = L.map('map').setView([20, 0], 2);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Updated script.js to fix interactions:
// 1. Cancel button unchecks selected square.
// 2. Already claimed squares trigger pop-up again.
// 3. Claimed and selected squares are non-interactive so clicks pass through.

cancelBtn.onclick = () => {
  selectedSquareLayer.clearLayers();
  hideMessage();
};

if (claimedSquares.has(squareId)) {
  showMessage(`This square <span class="id-chip">${squareId}</span> is already claimed.`, { showBuy: false });
  return;
}

const rect = L.rectangle(b, { color: '#2e7d32', weight: 0.6, fillColor: '#4caf50', fillOpacity: 0.35, interactive: false });

const selected = L.rectangle([[lat, lng], [lat + LAT_STEP, lng + lngStep]], { color: 'yellow', weight: 0.5, fillColor: 'yellow', fillOpacity: 0.4, interactive: false });
