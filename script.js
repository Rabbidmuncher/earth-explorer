// This is script.js content with fixes for claimed/selected squares behavior.

// Cancel button now unchecks the square
const cancelBtn = document.getElementById('cancel-btn');
cancelBtn.onclick = () => {
  selectedSquareLayer.clearLayers();
  hideMessage();
};

// Example click handler for squares
function onSquareClick(lat, lng, squareId) {
  selectedSquareLayer.clearLayers();
  const lngStep = LAT_STEP / Math.cos(FIXED_LAT * Math.PI / 180);
  const selected = L.rectangle([[lat, lng], [lat + LAT_STEP, lng + lngStep]], {
    color: 'yellow',
    weight: 0.5,
    fillColor: 'yellow',
    fillOpacity: 0.4,
    interactive: false
  });
  selectedSquareLayer.addLayer(selected);

  if (claimedSquares.has(squareId)) {
    showMessage(`This square <span class="id-chip">${squareId}</span> is already claimed.`, { showBuy: false });
    return;
  }

  // Land/water check here...

  showMessage(`This square <span class="id-chip">${squareId}</span> is unclaimed. You can buy it!`, {
    showBuy: true,
    onBuy: () => {
      claimedSquares.add(squareId);
      saveClaims();
      renderClaimedInView();
    }
  });
}

// When rendering claimed squares
function renderClaimedInView() {
  claimedLayer.clearLayers();
  const bounds = map.getBounds();
  for (const squareId of claimedSquares) {
    const b = squareBoundsFromId(squareId);
    if (bounds.intersects(L.latLngBounds(b))) {
      const rect = L.rectangle(b, {
        color: '#2e7d32',
        weight: 0.6,
        fillColor: '#4caf50',
        fillOpacity: 0.35,
        interactive: false
      });
      claimedLayer.addLayer(rect);
    }
  }
}
