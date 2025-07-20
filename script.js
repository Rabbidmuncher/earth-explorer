// Initialize Leaflet map
var map = L.map('map').setView([20, 0], 2);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Add click handler to update Street View iframe
map.on('click', function(e) {
    var lat = e.latlng.lat;
    var lng = e.latlng.lng;
    var iframe = document.getElementById('street-view');
    var embedUrl = `https://www.google.com/maps/embed/v1/streetview?key=YOUR_GOOGLE_MAPS_API_KEY&location=AIzaSyB2CHeF6LOtV573Aef65UJJnySN4_g0iYk&heading=210&pitch=10&fov=75`;
    iframe.src = embedUrl;
});
