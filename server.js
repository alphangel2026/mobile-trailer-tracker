const express = require('express');
const cors = require('cors');
const path = require('path');
const { getData, persist, uuidv4 } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// TRAILER ENDPOINTS
// ============================================

// GET /api/trailers - Get all trailers
app.get('/api/trailers', (req, res) => {
  try {
    const data = getData();
    const { status, search } = req.query;
    
    let results = [...data.trailers];

    if (status && status !== 'all') {
      results = results.filter(t => t.status === status);
    }

    if (search) {
      const s = search.toLowerCase();
      results = results.filter(t => 
        (t.trailer_name && t.trailer_name.toLowerCase().includes(s)) ||
        (t.site_code && t.site_code.toLowerCase().includes(s)) ||
        (t.site_name && t.site_name.toLowerCase().includes(s))
      );
    }

    results.sort((a, b) => a.trailer_name.localeCompare(b.trailer_name));
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trailers/:id - Get a single trailer
app.get('/api/trailers/:id', (req, res) => {
  try {
    const data = getData();
    const trailer = data.trailers.find(t => t.id === req.params.id);
    if (!trailer) {
      return res.status(404).json({ success: false, error: 'Trailer not found' });
    }
    res.json({ success: true, data: trailer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/trailers - Create a new trailer
app.post('/api/trailers', (req, res) => {
  try {
    const data = getData();
    const {
      trailer_name, trailer_type, site_code, site_name,
      latitude, longitude, status, charger_count,
      charger_type, power_capacity_kw, notes, gps_device_id
    } = req.body;

    if (!trailer_name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'trailer_name, latitude, and longitude are required' 
      });
    }

    const now = new Date().toISOString();
    const trailer = {
      id: uuidv4(),
      trailer_name,
      trailer_type: trailer_type || 'Mobile Charging Trailer',
      site_code: site_code || null,
      site_name: site_name || null,
      address: req.body.address || null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      status: status || 'Active',
      charger_count: parseInt(charger_count) || 0,
      charger_type: charger_type || null,
      power_capacity_kw: power_capacity_kw ? parseFloat(power_capacity_kw) : null,
      notes: notes || null,
      gps_device_id: gps_device_id || null,
      last_gps_update: null,
      created_at: now,
      updated_at: now
    };

    data.trailers.push(trailer);
    persist();
    res.status(201).json({ success: true, data: trailer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/trailers/:id - Update a trailer
app.put('/api/trailers/:id', (req, res) => {
  try {
    const data = getData();
    const idx = data.trailers.findIndex(t => t.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Trailer not found' });
    }

    const existing = data.trailers[idx];
    const {
      trailer_name, trailer_type, site_code, site_name,
      latitude, longitude, status, charger_count,
      charger_type, power_capacity_kw, notes, gps_device_id
    } = req.body;

    data.trailers[idx] = {
      ...existing,
      trailer_name: trailer_name !== undefined ? trailer_name : existing.trailer_name,
      trailer_type: trailer_type !== undefined ? trailer_type : existing.trailer_type,
      site_code: site_code !== undefined ? site_code : existing.site_code,
      site_name: site_name !== undefined ? site_name : existing.site_name,
      address: req.body.address !== undefined ? req.body.address : existing.address,
      latitude: latitude !== undefined ? parseFloat(latitude) : existing.latitude,
      longitude: longitude !== undefined ? parseFloat(longitude) : existing.longitude,
      status: status !== undefined ? status : existing.status,
      charger_count: charger_count !== undefined ? parseInt(charger_count) : existing.charger_count,
      charger_type: charger_type !== undefined ? charger_type : existing.charger_type,
      power_capacity_kw: power_capacity_kw !== undefined ? (power_capacity_kw ? parseFloat(power_capacity_kw) : null) : existing.power_capacity_kw,
      notes: notes !== undefined ? notes : existing.notes,
      gps_device_id: gps_device_id !== undefined ? gps_device_id : existing.gps_device_id,
      updated_at: new Date().toISOString()
    };

    persist();
    res.json({ success: true, data: data.trailers[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/trailers/:id - Delete a trailer
app.delete('/api/trailers/:id', (req, res) => {
  try {
    const data = getData();
    const idx = data.trailers.findIndex(t => t.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Trailer not found' });
    }

    data.trailers.splice(idx, 1);
    persist();
    res.json({ success: true, message: 'Trailer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// MOVE TRAILER ENDPOINT
// ============================================

// POST /api/trailers/:id/move - Move a trailer to a new location
app.post('/api/trailers/:id/move', (req, res) => {
  try {
    const data = getData();
    const idx = data.trailers.findIndex(t => t.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Trailer not found' });
    }

    const trailer = data.trailers[idx];
    const { to_latitude, to_longitude, to_site_code, to_site_name, moved_by, reason, notes, status } = req.body;

    if (!to_latitude || !to_longitude || !moved_by) {
      return res.status(400).json({ 
        success: false, 
        error: 'to_latitude, to_longitude, and moved_by are required' 
      });
    }

    // Record the move in history
    const moveRecord = {
      id: uuidv4(),
      trailer_id: req.params.id,
      moved_by,
      moved_at: new Date().toISOString(),
      from_site_code: trailer.site_code,
      from_site_name: trailer.site_name,
      from_address: trailer.address || null,
      from_latitude: trailer.latitude,
      from_longitude: trailer.longitude,
      to_site_code: to_site_code || null,
      to_site_name: to_site_name || null,
      to_address: req.body.to_address || null,
      to_latitude: parseFloat(to_latitude),
      to_longitude: parseFloat(to_longitude),
      reason: reason || null,
      notes: notes || null
    };

    data.move_history.push(moveRecord);

    // Update trailer location
    data.trailers[idx] = {
      ...trailer,
      latitude: parseFloat(to_latitude),
      longitude: parseFloat(to_longitude),
      site_code: to_site_code || null,
      site_name: to_site_name || trailer.site_name,
      address: req.body.to_address || trailer.address,
      status: status || trailer.status,
      updated_at: new Date().toISOString()
    };

    persist();
    res.json({ success: true, data: data.trailers[idx], move_id: moveRecord.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// MOVE HISTORY ENDPOINTS
// ============================================

// GET /api/trailers/:id/history - Get move history for a trailer
app.get('/api/trailers/:id/history', (req, res) => {
  try {
    const data = getData();
    const history = data.move_history
      .filter(h => h.trailer_id === req.params.id)
      .sort((a, b) => new Date(b.moved_at) - new Date(a.moved_at));
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/history - Get all recent move history
app.get('/api/history', (req, res) => {
  try {
    const data = getData();
    const limit = parseInt(req.query.limit) || 50;
    const history = data.move_history
      .map(h => {
        const trailer = data.trailers.find(t => t.id === h.trailer_id);
        return { ...h, trailer_name: trailer ? trailer.trailer_name : 'Deleted' };
      })
      .sort((a, b) => new Date(b.moved_at) - new Date(a.moved_at))
      .slice(0, limit);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// GPS INTEGRATION ENDPOINTS
// ============================================

// POST /api/gps/update - Receive GPS update (for GPS device integration)
app.post('/api/gps/update', (req, res) => {
  try {
    const data = getData();
    const { device_id, latitude, longitude, speed, heading } = req.body;

    if (!device_id || !latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'device_id, latitude, and longitude are required' 
      });
    }

    // Find trailer by GPS device ID
    const idx = data.trailers.findIndex(t => t.gps_device_id === device_id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'No trailer found with this GPS device ID' });
    }

    // Log GPS data
    const log = {
      id: uuidv4(),
      trailer_id: data.trailers[idx].id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      speed: speed ? parseFloat(speed) : null,
      heading: heading ? parseFloat(heading) : null,
      recorded_at: new Date().toISOString(),
      source: 'gps'
    };
    data.gps_logs.push(log);

    // Keep only last 1000 GPS logs per trailer to prevent unbounded growth
    const trailerLogs = data.gps_logs.filter(l => l.trailer_id === data.trailers[idx].id);
    if (trailerLogs.length > 1000) {
      const toRemove = trailerLogs.slice(0, trailerLogs.length - 1000);
      data.gps_logs = data.gps_logs.filter(l => !toRemove.includes(l));
    }

    // Update trailer position
    data.trailers[idx] = {
      ...data.trailers[idx],
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      last_gps_update: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    persist();
    res.json({ success: true, message: 'GPS position updated', trailer_id: data.trailers[idx].id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/gps/logs/:trailerId - Get GPS logs for a trailer
app.get('/api/gps/logs/:trailerId', (req, res) => {
  try {
    const data = getData();
    const limit = parseInt(req.query.limit) || 100;
    const logs = data.gps_logs
      .filter(l => l.trailer_id === req.params.trailerId)
      .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
      .slice(0, limit);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// GEOCODING ENDPOINT (server-side, more reliable)
// ============================================

app.get('/api/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ success: false, error: 'address parameter is required' });
    }

    // Using Photon by Komoot - free, no API key, no rate limit issues
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1&lang=en`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MobileChargingTracker/1.0 (internal-fleet-tool)'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, error: 'Geocoding service unavailable' });
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [longitude, latitude] = feature.geometry.coordinates;
      const props = feature.properties;
      const display_name = [props.name, props.street, props.city, props.state, props.country]
        .filter(Boolean)
        .join(', ');

      res.json({
        success: true,
        data: {
          latitude,
          longitude,
          display_name: display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        }
      });
    } else {
      res.json({ success: false, error: 'Address not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Geocoding failed: ' + err.message });
  }
});

app.get('/api/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, error: 'lat and lon parameters are required' });
    }

    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&limit=1&lang=en`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MobileChargingTracker/1.0 (internal-fleet-tool)'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, error: 'Geocoding service unavailable' });
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const props = data.features[0].properties;
      const display_name = [props.name, props.street, props.city, props.state, props.country]
        .filter(Boolean)
        .join(', ');

      res.json({
        success: true,
        data: { display_name }
      });
    } else {
      res.json({ success: false, error: 'Location not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Reverse geocoding failed: ' + err.message });
  }
});

// ============================================
// STATS ENDPOINT
// ============================================

app.get('/api/stats', (req, res) => {
  try {
    const data = getData();
    const total = data.trailers.length;
    const active = data.trailers.filter(t => t.status === 'Active').length;
    const inTransit = data.trailers.filter(t => t.status === 'In Transit').length;
    const stored = data.trailers.filter(t => t.status === 'Stored').length;
    const maintenance = data.trailers.filter(t => t.status === 'Maintenance').length;
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentMoves = data.move_history.filter(h => h.moved_at > sevenDaysAgo).length;

    res.json({
      success: true,
      data: { total, active, inTransit, stored, maintenance, recentMoves }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve the frontend for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('  Mobile Charging Trailer Tracker');
  console.log('  ================================');
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log(`  API docs: http://localhost:${PORT}/api/trailers`);
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});
