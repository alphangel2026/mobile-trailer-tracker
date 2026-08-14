const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// TRAILER ENDPOINTS
// ============================================

app.get('/api/trailers', async (req, res) => {
  try {
    const trailers = await db.getAllTrailers({ status: req.query.status, search: req.query.search });
    res.json({ success: true, data: trailers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/trailers/:id', async (req, res) => {
  try {
    const trailer = await db.getTrailerById(req.params.id);
    if (!trailer) return res.status(404).json({ success: false, error: 'Trailer not found' });
    res.json({ success: true, data: trailer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/trailers', async (req, res) => {
  try {
    const { trailer_name, latitude, longitude } = req.body;
    if (!trailer_name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'trailer_name, latitude, and longitude are required' });
    }
    const trailer = await db.createTrailer(req.body);
    res.status(201).json({ success: true, data: trailer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/trailers/:id', async (req, res) => {
  try {
    const trailer = await db.updateTrailer(req.params.id, req.body);
    if (!trailer) return res.status(404).json({ success: false, error: 'Trailer not found' });
    res.json({ success: true, data: trailer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/trailers/:id', async (req, res) => {
  try {
    const existing = await db.getTrailerById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Trailer not found' });
    await db.deleteTrailer(req.params.id);
    res.json({ success: true, message: 'Trailer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// MOVE TRAILER
// ============================================

app.post('/api/trailers/:id/move', async (req, res) => {
  try {
    const { to_latitude, to_longitude, moved_by } = req.body;
    if (!to_latitude || !to_longitude || !moved_by) {
      return res.status(400).json({ success: false, error: 'to_latitude, to_longitude, and moved_by are required' });
    }
    const result = await db.moveTrailer(req.params.id, req.body);
    if (!result) return res.status(404).json({ success: false, error: 'Trailer not found' });
    res.json({ success: true, data: result.trailer, move_id: result.move_id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// MOVE HISTORY
// ============================================

app.get('/api/trailers/:id/history', async (req, res) => {
  try {
    const history = await db.getTrailerHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await db.getAllHistory(limit);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// GPS INTEGRATION
// ============================================

app.post('/api/gps/update', async (req, res) => {
  try {
    const { device_id, latitude, longitude, speed, heading } = req.body;
    if (!device_id || !latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'device_id, latitude, and longitude are required' });
    }
    const trailerId = await db.updateGps(device_id, parseFloat(latitude), parseFloat(longitude), speed ? parseFloat(speed) : null, heading ? parseFloat(heading) : null);
    if (!trailerId) return res.status(404).json({ success: false, error: 'No trailer found with this GPS device ID' });
    res.json({ success: true, message: 'GPS position updated', trailer_id: trailerId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/gps/logs/:trailerId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await db.getGpsLogs(req.params.trailerId, limit);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// GEOCODING (server-side)
// ============================================

app.get('/api/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) return res.status(400).json({ success: false, error: 'address parameter is required' });

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1&lang=en`;
    const response = await fetch(url, { headers: { 'User-Agent': 'MobileChargingTracker/1.0' } });

    if (!response.ok) return res.status(502).json({ success: false, error: 'Geocoding service unavailable' });

    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [longitude, latitude] = feature.geometry.coordinates;
      const props = feature.properties;
      const display_name = [props.name, props.street, props.city, props.state, props.country].filter(Boolean).join(', ');
      res.json({ success: true, data: { latitude, longitude, display_name: display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` } });
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
    if (!lat || !lon) return res.status(400).json({ success: false, error: 'lat and lon parameters are required' });

    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&limit=1&lang=en`;
    const response = await fetch(url, { headers: { 'User-Agent': 'MobileChargingTracker/1.0' } });

    if (!response.ok) return res.status(502).json({ success: false, error: 'Geocoding service unavailable' });

    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const props = data.features[0].properties;
      const display_name = [props.name, props.street, props.city, props.state, props.country].filter(Boolean).join(', ');
      res.json({ success: true, data: { display_name } });
    } else {
      res.json({ success: false, error: 'Location not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Reverse geocoding failed: ' + err.message });
  }
});

// ============================================
// STATS
// ============================================

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server with database initialization
async function start() {
  await db.initializeDatabase();
  app.listen(PORT, () => {
    console.log('');
    console.log('  Mobile Charging Tracker');
    console.log('  ========================');
    console.log(`  Server running at: http://localhost:${PORT}`);
    console.log(`  Database: ${process.env.TURSO_DATABASE_URL ? 'Turso Cloud (persistent)' : 'Local SQLite'}`);
    console.log('');
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
