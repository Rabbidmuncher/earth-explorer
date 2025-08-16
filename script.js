(async () => {
  // Firebase initialization
  const firebaseConfig = {
      apiKey: "AIzaSyAGfbHqXBlctPr0edOyXlhVr4RtlK37xmk",
      authDomain: "picture-the-world.firebaseapp.com",
      projectId: "picture-the-world",
      appId: "1:308871819729:web:867a0bd8ad9b3c2bc330f0"
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const auth = firebase.auth();

  // Sidebar toggle
  document.getElementById('sidebar-toggle').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Elements in the sidebar
  const signInBtn = document.getElementById('sign-in-btn');
  const signOutBtn = document.getElementById('sign-out-btn');
  const userInfo = document.getElementById('user-info');
  const userEmail = document.getElementById('user-email');

  // Listen for auth state changes
  auth.onAuthStateChanged(user => {
    if (user) {
      userEmail.textContent = user.email;
      userInfo.style.display = 'block';
      signInBtn.style.display = 'none';
    } else {
      userInfo.style.display = 'none';
      signInBtn.style.display = 'block';
    }
  });

  // Sign In function
  async function signIn() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (e) {
      console.error("Error signing in: ", e);
      alert('Failed to sign in. Please try again.');
    }
  }

  // Sign Out function
  async function signOut() {
    try {
      await auth.signOut();
      alert("You have been logged out.");
    } catch (e) {
      console.error("Error signing out: ", e);
      alert('Failed to log out. Please try again.');
    }
  }

  // Event listeners for Sign-In and Sign-Out buttons
  signInBtn.addEventListener('click', signIn);
  signOutBtn.addEventListener('click', signOut);

  // Map init + bounds
  const southWest = L.latLng(-85, -180);
  const northEast = L.latLng(85, 180);
  const bounds = L.latLngBounds(southWest, northEast);

  const map = L.map('map', { minZoom: 4, maxZoom: 16, maxBounds: bounds, maxBoundsViscosity: 1.0 }).setView([56.95, 24.1], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);

  // Layers
  const gridLayer = L.layerGroup().addTo(map);
  const selectedSquareLayer = L.layerGroup().addTo(map);
  const claimedLayer = L.layerGroup().addTo(map);

  // Grid constants (500 x 500 meters)
  const LAT_STEP = 0.0045; // ~500m N-S
  const ORIGIN_LAT = -85;
  const ORIGIN_LNG = -180;

  // Persistence (local storage for claimed squares)
  const claimedSquares = new Set(JSON.parse(localStorage.getItem('claimedSquares') || '[]'));
  function saveClaims() {
    localStorage.setItem('claimedSquares', JSON.stringify([...claimedSquares]));
  }

  // Land cache
  const landCache = new Map(); // key: squareId -> boolean

  // Message helpers
  function showMessage(text, { showBuy = true, onBuy = null, onCancel = null } = {}) {
    const box = document.getElementById('message-box');
    const msg = document.getElementById('message-text');
    const actions = document.getElementById('message-actions');
    msg.innerHTML = text;
    actions.innerHTML = '';

    if (showBuy) {
      const buyBtn = document.createElement('button');
      buyBtn.id = 'buy-btn';
      buyBtn.textContent = 'Buy now';
      buyBtn.onclick = () => { if (onBuy) onBuy(); hideMessage(); };
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'cancel-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = () => { if (onCancel) onCancel(); hideMessage(); };
      actions.appendChild(buyBtn);
      actions.appendChild(cancelBtn);
    } else {
      const okBtn = document.createElement('button');
      okBtn.id = 'ok-btn';
      okBtn.textContent = 'OK';
      okBtn.onclick = () => { if (onCancel) onCancel(); hideMessage(); };
      actions.appendChild(okBtn);
    }
    box.style.display = 'block';
  }

  function hideMessage() {
    document.getElementById('message-box').style.display = 'none';
  }

  // Land check for each square (Using OpenStreetMap's Nominatim API)
  async function isLand(lat, lng, squareId) {
    if (landCache.has(squareId)) return landCache.get(squareId);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      const land = !!data.address && !data.error;
      landCache.set(squareId, land);
      return land;
    } catch (e) {
      landCache.set(squareId, false);
      return false;
    }
  }

  // Render claimed squares
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

  // Function to get the bounds of a square from its ID
  function squareBoundsFromId(squareId) {
    const [latIdxStr, lngIdxStr] = squareId.split('_');
    const latIdx = parseInt(latIdxStr, 10);
    const lngIdx = parseInt(lngIdxStr, 10);
    const lat = ORIGIN_LAT + latIdx * LAT_STEP;
    const lng = ORIGIN_LNG + lngIdx * LAT_STEP;
    return [[lat, lng], [lat + LAT_STEP, lng + LAT_STEP]];
  }

  // Drawing the grid on the map
  function drawGrid() {
    gridLayer.clearLayers();
    selectedSquareLayer.clearLayers();
    if (map.getZoom() < 12) {
      claimedLayer.clearLayers();
      return;
    }

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const lngStep = LAT_STEP / Math.cos(56.95 * Math.PI / 180); // FIXED_LAT

    const minLatIndex = Math.floor((sw.lat - ORIGIN_LAT) / LAT_STEP);
    const maxLatIndex = Math.ceil((ne.lat - ORIGIN_LAT) / LAT_STEP);
    const minLngIndex = Math.floor((sw.lng - ORIGIN_LNG) / lngStep);
    const maxLngIndex = Math.ceil((ne.lng - ORIGIN_LNG) / lngStep);

    for (let latIdx = minLatIndex; latIdx < maxLatIndex; latIdx++) {
      for (let lngIdx = minLngIndex; lngIdx < maxLngIndex; lngIdx++) {
        const lat = ORIGIN_LAT + latIdx * LAT_STEP;
        const lng = ORIGIN_LNG + lngIdx * LAT_STEP;
        const squareId = `${latIdx}_${lngIdx}`;

        const square = L.rectangle([[lat, lng], [lat + LAT_STEP, lng + LAT_STEP]], { color: 'lightgray', weight: 0.5, dashArray: '2', fillOpacity: 0 });

        square.on('click', async () => onSquareClick(lat, lng, squareId));

        gridLayer.addLayer(square);
      }
    }

    renderClaimedInView();
  }

  // Square click event
  function onSquareClick(lat, lng, squareId) {
    selectedSquareLayer.clearLayers();
    const selected = L.rectangle([[lat, lng], [lat + LAT_STEP, lng + LAT_STEP]], {
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

    // Land check
    const land = await isLand(lat + LAT_STEP / 2, lng + (LAT_STEP / 2), squareId);
    if (!land) {
      showMessage(`This square <span class="id-chip">${squareId}</span> cannot be claimed.`, { showBuy: false });
      return;
    }

    // Offer to buy
    showMessage(`This square <span class="id-chip">${squareId}</span> is unclaimed. You can buy it!`, {
      showBuy: true,
      onBuy: () => {
        claimedSquares.add(squareId);
        saveClaims();
        renderClaimedInView();
      },
      onCancel: () => selectedSquareLayer.clearLayers()
    });
  }

  map.on('moveend zoomend', drawGrid);
  drawGrid();
})();
