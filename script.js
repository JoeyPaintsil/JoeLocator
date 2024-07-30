// Initialize the map
var map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// Define custom icon for user's location
var userIcon = L.icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41],
    className: 'user-location-icon'
});

var userMarker;
var bufferCircle;

document.getElementById('getLocation').addEventListener('click', function() {
    navigator.geolocation.getCurrentPosition(function(position) {
        var lat = position.coords.latitude;
        var lon = position.coords.longitude;
        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lon;

        // Remove existing userMarker if it exists
        if (userMarker) {
            map.removeLayer(userMarker);
        }

        // Add the new userMarker
        userMarker = L.marker([lat, lon], { icon: userIcon }).addTo(map);
        userMarker.bindPopup('Your Location').openPopup();

        // Zoom to the user's location
        map.setView([lat, lon], 13);
    }, function(error) {
        alert('Error getting location: ' + error.message);
    });
});

document.getElementById('search').addEventListener('click', function() {
    var type = document.getElementById('type').value.toLowerCase();
    var lat = parseFloat(document.getElementById('latitude').value);
    var lon = parseFloat(document.getElementById('longitude').value);
    var buffer = document.getElementById('buffer').value || 5000;

    if (isNaN(lat) || isNaN(lon)) {
        alert("Please enter valid latitude and longitude.");
        return;
    }

    // Draw the buffer circle
    if (bufferCircle) {
        map.removeLayer(bufferCircle);
    }
    bufferCircle = L.circle([lat, lon], {
        color: 'green',
        fillColor: 'none',
        radius: buffer
    }).addTo(map);

    // Fetch data from Overpass API
    var overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="${type}"](around:${buffer},${lat},${lon});out;`;

    fetch(overpassUrl)
        .then(response => response.json())
        .then(data => {
            // Clear previous markers except the userMarker
            map.eachLayer(function(layer) {
                if (layer != userMarker && layer != bufferCircle && !!layer.toGeoJSON) {
                    map.removeLayer(layer);
                }
            });

            // Add markers to the map
            var markers = [];
            if (data.elements.length === 0) {
                alert("No information found. Please change parameters.");
            }
            data.elements.forEach(function(element) {
                if (element.lat && element.lon) {
                    var name = element.tags.name || "Unknown";
                    var marker = L.marker([element.lat, element.lon]).addTo(map);
                    marker.bindPopup(name);
                    markers.push({ name: name, lat: element.lat, lon: element.lon });
                }
            });

            // Store markers data
            window.markersData = markers;
        });
});

document.getElementById('downloadCSV').addEventListener('click', function() {
    if (window.markersData && window.markersData.length > 0) {
        var csv = Papa.unparse(window.markersData);
        var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, "buildings.csv");
    } else {
        alert("No data available to download.");
    }
});

document.getElementById('clearMap').addEventListener('click', function() {
    map.eachLayer(function(layer) {
        if (layer != userMarker && !!layer.toGeoJSON) {
            map.removeLayer(layer);
        }
    });

    if (bufferCircle) {
        map.removeLayer(bufferCircle);
        bufferCircle = null;
    }

    // Optionally clear input fields
    document.getElementById('type').value = '';
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
    document.getElementById('buffer').value = '';
});
