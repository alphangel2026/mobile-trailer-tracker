// ========================================
// Mobile Charging Trailer Tracker - App.js
// ========================================

const API_BASE = '';  // Same origin
let map;
let markers = {};
let trailers = [];
let selectedTrailerId = null;
let placingMode = null; // 'add', 'move', or null

// Status colors for markers
const statusColors = {
  'Active': '#067d62',
  'In Transit': '#8b5cf6',
  'Stored': '#6b7280',
  'Maintenance': '#d97706'
};

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadTrailers();
  loadStats();
});

function initMap() {
  // Center on continental US
  map = L.map('map', {
    center: [37.5, -96.0],
    zoom: 5,
    zoomControl: true
  });

  // Add tile layer (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // Click on map to place marker (when in placing mode)
  map.on('click', async (e) => {
    if (placingMode === 'add') {
      document.getElementById('formLatitude').value = e.latlng.lat.toFixed(6);
      document.getElementById('formLongitude').value = e.latlng.lng.toFixed(6);
      // Reverse geocode to show address
      const address = await reverseGeocode(e.latlng.lat, e.latlng.lng);
      if (address) {
        document.getElementById('formAddress').value = address;
        showGeocodeResult('form', `Location set: ${address}`, 'success');
      } else {
        showGeocodeResult('form', `Location set at ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`, 'success');
      }
    } else if (placingMode === 'move') {
      document.getElementById('moveLatitude').value = e.latlng.lat.toFixed(6);
      document.getElementById('moveLongitude').value = e.latlng.lng.toFixed(6);
      // Reverse geocode to show address
      const address = await reverseGeocode(e.latlng.lat, e.latlng.lng);
      if (address) {
        document.getElementById('moveAddress').value = address;
        showGeocodeResult('move', `New location set: ${address}`, 'success');
      } else {
        showGeocodeResult('move', `New location set at ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`, 'success');
      }
    }
  });
}

// ========================================
// GEOCODING (Address <-> Coordinates)
// ========================================

// Convert address to lat/lng using OpenStreetMap Nominatim (free, no API key needed)
async function geocodeAddress(mode) {
  const inputId = mode === 'form' ? 'formAddress' : 'moveAddress';
  const address = document.getElementById(inputId).value.trim();

  if (!address) {
    showGeocodeResult(mode, 'Please enter an address', 'error');
    return;
  }

  showGeocodeResult(mode, 'Searching...', 'loading');

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`,
      { headers: { 'User-Agent': 'AMOC-Trailer-Tracker/1.0' } }
    );
    const results = await response.json();

    if (results.length > 0) {
      const result = results[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);

      if (mode === 'form') {
        document.getElementById('formLatitude').value = lat.toFixed(6);
        document.getElementById('formLongitude').value = lon.toFixed(6);
      } else {
        document.getElementById('moveLatitude').value = lat.toFixed(6);
        document.getElementById('moveLongitude').value = lon.toFixed(6);
      }

      // Zoom map to location
      map.setView([lat, lon], 14);

      showGeocodeResult(mode, `Found: ${result.display_name}`, 'success');
    } else {
      showGeocodeResult(mode, 'Address not found. Try a more specific address or click on the map.', 'error');
    }
  } catch (err) {
    showGeocodeResult(mode, 'Error searching address. Try clicking on the map instead.', 'error');
    console.error('Geocoding error:', err);
  }
}

// Convert lat/lng back to a readable address
async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'User-Agent': 'AMOC-Trailer-Tracker/1.0' } }
    );
    const result = await response.json();
    if (result && result.display_name) {
      // Shorten the display name a bit
      const parts = result.display_name.split(', ');
      if (parts.length > 4) {
        return parts.slice(0, 4).join(', ');
      }
      return result.display_name;
    }
  } catch (err) {
    console.error('Reverse geocode error:', err);
  }
  return null;
}

function showGeocodeResult(mode, message, type) {
  const el = document.getElementById(mode === 'form' ? 'formGeocodeResult' : 'moveGeocodeResult');
  el.textContent = message;
  el.className = `geocode-result ${type}`;
}

// ========================================
// DATA LOADING
// ========================================

async function loadTrailers() {
  try {
    const search = document.getElementById('searchInput').value;
    const status = document.getElementById('statusFilter').value;
    
    let url = `${API_BASE}/api/trailers?`;
    if (status !== 'all') url += `status=${status}&`;
    if (search) url += `search=${encodeURIComponent(search)}`;

    const res = await fetch(url);
    const data = await res.json();
    
    if (data.success) {
      trailers = data.data;
      renderTrailerList();
      updateMapMarkers();
    }
  } catch (err) {
    console.error('Error loading trailers:', err);
    showToast('Error loading trailers', 'error');
  }
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    const data = await res.json();
    
    if (data.success) {
      document.getElementById('statTotal').textContent = data.data.total;
      document.getElementById('statActive').textContent = data.data.active;
      document.getElementById('statTransit').textContent = data.data.inTransit;
      document.getElementById('statStored').textContent = data.data.stored;
      document.getElementById('statMaintenance').textContent = data.data.maintenance;
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// ========================================
// MAP MARKERS
// ========================================

function updateMapMarkers() {
  // Remove existing markers
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};

  // Add new markers
  trailers.forEach(trailer => {
    const color = statusColors[trailer.status] || '#6b7280';
    
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      "><i class="fas fa-bolt" style="
        color: white;
        font-size: 12px;
        transform: rotate(45deg);
      "></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    const marker = L.marker([trailer.latitude, trailer.longitude], { icon, draggable: false })
      .addTo(map)
      .bindPopup(createPopupContent(trailer));

    marker.on('click', () => {
      selectTrailer(trailer.id);
    });

    markers[trailer.id] = marker;
  });
}

function createPopupContent(trailer) {
  const statusClass = `status-${trailer.status.toLowerCase().replace(' ', '-')}`;
  return `
    <div class="trailer-popup">
      <h4>${trailer.trailer_name}</h4>
      <span class="trailer-card-status ${statusClass}">${trailer.status}</span>
      <div class="popup-info">
        <div><strong>Site:</strong> ${trailer.site_name || 'N/A'}</div>
        ${trailer.address ? `<div><strong>Address:</strong> ${trailer.address}</div>` : ''}
        <div><strong>Type:</strong> ${trailer.trailer_type}</div>
        <div><strong>Chargers:</strong> ${trailer.charger_count} (${trailer.charger_type || 'N/A'})</div>
        <div><strong>Capacity:</strong> ${trailer.power_capacity_kw || 'N/A'} kW</div>
        ${trailer.notes ? `<div><strong>Notes:</strong> ${trailer.notes}</div>` : ''}
        ${trailer.last_gps_update ? `<div><strong>Last GPS:</strong> ${new Date(trailer.last_gps_update).toLocaleString()}</div>` : ''}
      </div>
      <div class="popup-actions">
        <button class="btn btn-move btn-sm" onclick="openMoveModal('${trailer.id}')">
          <i class="fas fa-truck-moving"></i> Move
        </button>
        <button class="btn btn-history btn-sm" onclick="openHistoryModal('${trailer.id}')">
          <i class="fas fa-history"></i> History
        </button>
        <button class="btn btn-secondary btn-sm" onclick="openEditModal('${trailer.id}')">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteTrailer('${trailer.id}', '${trailer.trailer_name}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

function fitAllMarkers() {
  if (trailers.length === 0) return;
  const bounds = L.latLngBounds(trailers.map(t => [t.latitude, t.longitude]));
  map.fitBounds(bounds, { padding: [50, 50] });
}

// ========================================
// TRAILER LIST
// ========================================

function renderTrailerList() {
  const container = document.getElementById('trailerList');
  
  if (trailers.length === 0) {
    container.innerHTML = `
      <div class="no-history">
        <i class="fas fa-truck-loading"></i>
        <p>No trailers found</p>
      </div>
    `;
    return;
  }

  container.innerHTML = trailers.map(trailer => {
    const statusClass = `status-${trailer.status.toLowerCase().replace(' ', '-')}`;
    const isSelected = trailer.id === selectedTrailerId;
    return `
      <div class="trailer-card ${isSelected ? 'selected' : ''}" onclick="selectTrailer('${trailer.id}')">
        <div class="trailer-card-header">
          <span class="trailer-card-name">${trailer.trailer_name}</span>
          <span class="trailer-card-status ${statusClass}">${trailer.status}</span>
        </div>
        <div class="trailer-card-info">
          <span><i class="fas fa-map-marker-alt"></i> ${trailer.site_name || 'Unknown location'}</span>
          ${trailer.address ? `<span><i class="fas fa-road"></i> ${trailer.address}</span>` : ''}
          <span><i class="fas fa-bolt"></i> ${trailer.charger_count} chargers | ${trailer.power_capacity_kw || '?'} kW</span>
          ${trailer.site_code ? `<span><i class="fas fa-building"></i> ${trailer.site_code}</span>` : ''}
        </div>
        <div class="trailer-card-actions">
          <button class="btn btn-move btn-sm" onclick="event.stopPropagation(); openMoveModal('${trailer.id}')">
            <i class="fas fa-truck-moving"></i> Move
          </button>
          <button class="btn btn-history btn-sm" onclick="event.stopPropagation(); openHistoryModal('${trailer.id}')">
            <i class="fas fa-history"></i> History
          </button>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openEditModal('${trailer.id}')">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteTrailer('${trailer.id}', '${trailer.trailer_name}')" title="Delete trailer">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function selectTrailer(id) {
  selectedTrailerId = id;
  renderTrailerList();
  
  const trailer = trailers.find(t => t.id === id);
  if (trailer && markers[id]) {
    map.setView([trailer.latitude, trailer.longitude], 10);
    markers[id].openPopup();
  }
}

function filterTrailers() {
  loadTrailers();
}

// ========================================
// ADD / EDIT TRAILER
// ========================================

function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Add New Trailer';
  document.getElementById('trailerForm').reset();
  document.getElementById('formTrailerId').value = '';
  document.getElementById('formLatitude').value = '';
  document.getElementById('formLongitude').value = '';
  document.getElementById('formGeocodeResult').className = 'geocode-result';
  document.getElementById('formGeocodeResult').textContent = '';
  placingMode = 'add';
  openModal('trailerModal');
  showToast('Enter an address or click on the map to set location', 'info');
}

function openEditModal(id) {
  const trailer = trailers.find(t => t.id === id);
  if (!trailer) return;

  document.getElementById('modalTitle').textContent = `Edit: ${trailer.trailer_name}`;
  document.getElementById('formTrailerId').value = trailer.id;
  document.getElementById('formTrailerName').value = trailer.trailer_name;
  document.getElementById('formTrailerType').value = trailer.trailer_type;
  document.getElementById('formSiteCode').value = trailer.site_code || '';
  document.getElementById('formSiteName').value = trailer.site_name || '';
  document.getElementById('formAddress').value = trailer.address || trailer.site_name || '';
  document.getElementById('formLatitude').value = trailer.latitude;
  document.getElementById('formLongitude').value = trailer.longitude;
  document.getElementById('formStatus').value = trailer.status;
  document.getElementById('formChargerCount').value = trailer.charger_count;
  document.getElementById('formChargerType').value = trailer.charger_type || '';
  document.getElementById('formPowerCapacity').value = trailer.power_capacity_kw || '';
  document.getElementById('formGpsDeviceId').value = trailer.gps_device_id || '';
  document.getElementById('formNotes').value = trailer.notes || '';
  
  showGeocodeResult('form', `Current location loaded`, 'success');
  placingMode = 'add';
  openModal('trailerModal');
}

async function saveTrailer() {
  const id = document.getElementById('formTrailerId').value;
  const lat = parseFloat(document.getElementById('formLatitude').value);
  const lng = parseFloat(document.getElementById('formLongitude').value);
  const address = document.getElementById('formAddress').value.trim();

  if (!document.getElementById('formTrailerName').value) {
    showToast('Please enter a trailer name', 'error');
    return;
  }

  if (!lat || !lng) {
    if (address) {
      // Try to geocode first
      showToast('Looking up address...', 'info');
      await geocodeAddress('form');
      // Check again after geocoding
      const newLat = parseFloat(document.getElementById('formLatitude').value);
      const newLng = parseFloat(document.getElementById('formLongitude').value);
      if (!newLat || !newLng) {
        showToast('Could not find address. Please try a different address or click on the map.', 'error');
        return;
      }
    } else {
      showToast('Please enter an address or click on the map to set a location', 'error');
      return;
    }
  }

  const data = {
    trailer_name: document.getElementById('formTrailerName').value,
    trailer_type: document.getElementById('formTrailerType').value,
    site_code: document.getElementById('formSiteCode').value || null,
    site_name: document.getElementById('formSiteName').value,
    address: document.getElementById('formAddress').value,
    latitude: parseFloat(document.getElementById('formLatitude').value),
    longitude: parseFloat(document.getElementById('formLongitude').value),
    status: document.getElementById('formStatus').value,
    charger_count: parseInt(document.getElementById('formChargerCount').value) || 0,
    charger_type: document.getElementById('formChargerType').value,
    power_capacity_kw: parseFloat(document.getElementById('formPowerCapacity').value) || null,
    gps_device_id: document.getElementById('formGpsDeviceId').value || null,
    notes: document.getElementById('formNotes').value
  };

  try {
    const url = id ? `${API_BASE}/api/trailers/${id}` : `${API_BASE}/api/trailers`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    
    if (result.success) {
      closeModal('trailerModal');
      placingMode = null;
      showToast(id ? 'Trailer updated successfully!' : 'Trailer added successfully!', 'success');
      await loadTrailers();
      await loadStats();
    } else {
      showToast(result.error || 'Error saving trailer', 'error');
    }
  } catch (err) {
    showToast('Error saving trailer: ' + err.message, 'error');
  }
}

// ========================================
// MOVE TRAILER
// ========================================

function openMoveModal(id) {
  const trailer = trailers.find(t => t.id === id);
  if (!trailer) return;

  document.getElementById('moveTrailerName').textContent = trailer.trailer_name;
  document.getElementById('moveTrailerId').value = trailer.id;
  document.getElementById('moveForm').reset();
  document.getElementById('moveLatitude').value = '';
  document.getElementById('moveLongitude').value = '';
  document.getElementById('moveGeocodeResult').className = 'geocode-result';
  document.getElementById('moveGeocodeResult').textContent = '';

  placingMode = 'move';
  openModal('moveModal');
  showToast('Enter the new address or click on the map', 'info');
}

async function submitMove() {
  const trailerId = document.getElementById('moveTrailerId').value;
  let lat = parseFloat(document.getElementById('moveLatitude').value);
  let lng = parseFloat(document.getElementById('moveLongitude').value);
  const address = document.getElementById('moveAddress').value.trim();

  if (!lat || !lng) {
    if (address) {
      // Try to geocode first
      showToast('Looking up address...', 'info');
      await geocodeAddress('move');
      lat = parseFloat(document.getElementById('moveLatitude').value);
      lng = parseFloat(document.getElementById('moveLongitude').value);
      if (!lat || !lng) {
        showToast('Could not find address. Please try a different address or click on the map.', 'error');
        return;
      }
    } else {
      showToast('Please enter a new address or click on the map', 'error');
      return;
    }
  }

  if (!document.getElementById('moveMovedBy').value) {
    showToast('Please enter your name / alias', 'error');
    return;
  }

  const data = {
    to_latitude: lat,
    to_longitude: lng,
    to_address: address,
    to_site_code: document.getElementById('moveSiteCode').value || null,
    to_site_name: document.getElementById('moveSiteName').value || null,
    moved_by: document.getElementById('moveMovedBy').value,
    status: document.getElementById('moveStatus').value || null,
    reason: document.getElementById('moveReason').value,
    notes: document.getElementById('moveNotes').value
  };

  try {
    const res = await fetch(`${API_BASE}/api/trailers/${trailerId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    
    if (result.success) {
      closeModal('moveModal');
      placingMode = null;
      showToast('Trailer moved successfully!', 'success');
      await loadTrailers();
      await loadStats();
    } else {
      showToast(result.error || 'Error moving trailer', 'error');
    }
  } catch (err) {
    showToast('Error moving trailer: ' + err.message, 'error');
  }
}

// ========================================
// MOVE HISTORY
// ========================================

async function openHistoryModal(id) {
  const trailer = trailers.find(t => t.id === id);
  if (!trailer) return;

  document.getElementById('historyTrailerName').textContent = trailer.trailer_name;
  document.getElementById('historyContent').innerHTML = '<div class="loading">Loading history...</div>';
  openModal('historyModal');

  try {
    const res = await fetch(`${API_BASE}/api/trailers/${id}/history`);
    const data = await res.json();

    if (data.success && data.data.length > 0) {
      document.getElementById('historyContent').innerHTML = `
        <table class="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Moved By</th>
              <th>From</th>
              <th>To</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${data.data.map(h => `
              <tr>
                <td>${new Date(h.moved_at).toLocaleDateString()} ${new Date(h.moved_at).toLocaleTimeString()}</td>
                <td>${h.moved_by}</td>
                <td>${h.from_address || h.from_site_name || `${h.from_latitude?.toFixed(4)}, ${h.from_longitude?.toFixed(4)}`}</td>
                <td>${h.to_address || h.to_site_name || `${h.to_latitude.toFixed(4)}, ${h.to_longitude.toFixed(4)}`}</td>
                <td>${h.reason || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      document.getElementById('historyContent').innerHTML = `
        <div class="no-history">
          <i class="fas fa-route"></i>
          <p>No move history recorded yet</p>
        </div>
      `;
    }
  } catch (err) {
    document.getElementById('historyContent').innerHTML = '<p>Error loading history</p>';
  }
}

// ========================================
// UI UTILITIES
// ========================================

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  if (id === 'trailerModal' || id === 'moveModal') {
    placingMode = null;
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('hidden');
  setTimeout(() => map.invalidateSize(), 300);
}

function refreshData() {
  loadTrailers();
  loadStats();
  showToast('Data refreshed!', 'info');
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Close modals on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    placingMode = null;
  }
});

// Allow Enter key to trigger geocoding in address fields
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (e.target.id === 'formAddress') {
      e.preventDefault();
      geocodeAddress('form');
    } else if (e.target.id === 'moveAddress') {
      e.preventDefault();
      geocodeAddress('move');
    }
  }
});

// ========================================
// DELETE TRAILER
// ========================================

async function deleteTrailer(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"?\n\nThis cannot be undone.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/trailers/${id}`, {
      method: 'DELETE'
    });

    const result = await res.json();

    if (result.success) {
      showToast(`"${name}" deleted successfully`, 'success');
      await loadTrailers();
      await loadStats();
    } else {
      showToast(result.error || 'Error deleting trailer', 'error');
    }
  } catch (err) {
    showToast('Error deleting trailer: ' + err.message, 'error');
  }
}

// ========================================
// BULK IMPORT
// ========================================

function openBulkImportModal() {
  document.getElementById('bulkImportData').value = '';
  document.getElementById('bulkImportStatus').innerHTML = '';
  openModal('bulkImportModal');
}

async function submitBulkImport() {
  const raw = document.getElementById('bulkImportData').value.trim();
  const defaultType = document.getElementById('bulkTrailerType').value;
  
  if (!raw) {
    showToast('Please paste trailer data first', 'error');
    return;
  }

  const lines = raw.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    showToast('No valid lines found', 'error');
    return;
  }

  const statusEl = document.getElementById('bulkImportStatus');
  const btn = document.getElementById('bulkImportBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';
  
  let success = 0;
  let failed = 0;
  let errors = [];

  statusEl.innerHTML = `
    <div class="bulk-import-progress">
      <span>Importing 0 / ${lines.length}...</span>
      <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
    </div>
  `;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const parts = line.split('|').map(p => p.trim());

    // Format: Name | Address | Site Code | Status | Charger Count | Notes
    if (parts.length < 2) {
      failed++;
      errors.push(`Line ${i + 1}: Not enough fields (need at least Name | Address)`);
      continue;
    }

    const trailerName = parts[0];
    const address = parts[1];
    const siteCode = parts[2] || null;
    const status = parts[3] || 'Active';
    const chargerCount = parseInt(parts[4]) || 8;
    const notes = parts[5] || null;

    // Geocode the address
    try {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`,
        { headers: { 'User-Agent': 'AMOC-Trailer-Tracker/1.0' } }
      );
      const geoResults = await geoResponse.json();

      if (geoResults.length === 0) {
        failed++;
        errors.push(`Line ${i + 1} (${trailerName}): Address not found - "${address}"`);
        continue;
      }

      const lat = parseFloat(geoResults[0].lat);
      const lng = parseFloat(geoResults[0].lon);

      // Create the trailer
      const res = await fetch(`${API_BASE}/api/trailers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trailer_name: trailerName,
          trailer_type: defaultType,
          site_code: siteCode,
          site_name: siteCode ? `${siteCode} - ${address.split(',').slice(-2).join(',').trim()}` : address,
          address: address,
          latitude: lat,
          longitude: lng,
          status: status,
          charger_count: chargerCount,
          charger_type: 'Level 2 - 19.2kW',
          notes: notes
        })
      });

      const result = await res.json();
      if (result.success) {
        success++;
      } else {
        failed++;
        errors.push(`Line ${i + 1} (${trailerName}): ${result.error}`);
      }
    } catch (err) {
      failed++;
      errors.push(`Line ${i + 1} (${trailerName}): ${err.message}`);
    }

    // Update progress
    const pct = Math.round(((i + 1) / lines.length) * 100);
    statusEl.innerHTML = `
      <div class="bulk-import-progress">
        <span>Importing ${i + 1} / ${lines.length}... (${success} added, ${failed} failed)</span>
        <div class="progress-bar"><div class="progress-fill" style="width: ${pct}%"></div></div>
      </div>
    `;

    // Small delay to respect geocoding rate limits (1 request/second for Nominatim)
    await new Promise(resolve => setTimeout(resolve, 1100));
  }

  // Final status
  let resultHtml = `<div class="bulk-import-progress" style="margin-top: 12px;">
    <strong>Import Complete:</strong> ${success} added successfully, ${failed} failed.
  </div>`;
  
  if (errors.length > 0) {
    resultHtml += `<div style="margin-top: 8px; font-size: 12px; color: #991b1b; max-height: 100px; overflow-y: auto;">
      <strong>Errors:</strong><br>
      ${errors.join('<br>')}
    </div>`;
  }

  statusEl.innerHTML = resultHtml;
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-file-import"></i> Import All';

  if (success > 0) {
    showToast(`Successfully imported ${success} trailer(s)!`, 'success');
    await loadTrailers();
    await loadStats();
  }
}
