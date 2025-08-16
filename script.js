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
(async () => {
  // Firebase initialization
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    appId: "YOUR_APP_ID"
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
      // If user is signed in, show email and Sign-out button
      userEmail.textContent = user.email;
      userInfo.style.display = 'block';
      signInBtn.style.display = 'none';
    } else {
      // If user is not signed in, show Sign-in button
      userInfo.style.display = 'none';
      signInBtn.style.display = 'block';
    }
  });

  // Sign In function (using Google Sign-In for simplicity)
  async function signIn() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (e) {
      console.error("Error signing in: ", e);
    }
  }

  // Sign Out function
  async function signOut() {
    try {
      await auth.signOut();
      alert("You have been logged out.");
    } catch (e) {
      console.error("Error signing out: ", e);
    }
  }

  // Event listeners for Sign-In and Sign-Out buttons
  signInBtn.addEventListener('click', signIn);
  signOutBtn.addEventListener('click', signOut);
})();
