const { createClient } = require('@libsql/client');
const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

// Connect to Turso cloud database
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined
});

// Initialize tables
async function initializeDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS trailers (
      id TEXT PRIMARY KEY,
      trailer_name TEXT NOT NULL,
      trailer_type TEXT DEFAULT 'Iris Mobile Charging Trailer',
      site_code TEXT,
      site_name TEXT,
      address TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      status TEXT DEFAULT 'Active',
      charger_count INTEGER DEFAULT 0,
      charger_type TEXT,
      power_capacity_kw REAL,
      notes TEXT,
      gps_device_id TEXT,
      last_gps_update TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS move_history (
      id TEXT PRIMARY KEY,
      trailer_id TEXT NOT NULL,
      moved_by TEXT NOT NULL,
      moved_at TEXT DEFAULT (datetime('now')),
      from_site_code TEXT,
      from_site_name TEXT,
      from_address TEXT,
      from_latitude REAL,
      from_longitude REAL,
      to_site_code TEXT,
      to_site_name TEXT,
      to_address TEXT,
      to_latitude REAL NOT NULL,
      to_longitude REAL NOT NULL,
      reason TEXT,
      notes TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS gps_logs (
      id TEXT PRIMARY KEY,
      trailer_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      speed REAL,
      heading REAL,
      recorded_at TEXT DEFAULT (datetime('now')),
      source TEXT DEFAULT 'gps'
    )
  `);

  // Seed data if empty
  const result = await db.execute('SELECT COUNT(*) as cnt FROM trailers');
  if (result.rows[0].cnt === 0) {
    await seedData();
  }
}

async function seedData() {
  const now = new Date().toISOString();
  const trailers = [
    { name: '3CV1C2723R2661571', code: 'DII4', site: 'DII4 - Crown Point, IN', addr: 'Crown Point, IN', lat: 41.4170, lng: -87.3653, status: 'Active', count: 28, notes: 'In-use' },
    { name: '3CV1C2929R2661393', code: 'DOM2', site: 'DOM2 - Omaha, NE', addr: '9722 S 132nd ST, Omaha, NE', lat: 41.1887, lng: -96.0780, status: 'Stored', count: 28, notes: 'Packed' },
    { name: '3CVF82222R2665836', code: 'DDP3', site: 'DDP3 - Philadelphia, PA', addr: '6901 Elmwood Ave, Philadelphia, PA 19142', lat: 39.9199, lng: -75.2340, status: 'Stored', count: 28, notes: 'Packed' },
    { name: '3CVF82227R2665878', code: 'DDV3', site: 'DDV3 - Denver, CO', addr: '400 West 160th Avenue, Broomfield, CO', lat: 39.9528, lng: -105.0264, status: 'Stored', count: 28, notes: 'Packed' },
    { name: '3CV1C2929R2665928', code: 'DHX4', site: 'DHX4 - Houston, TX', addr: '22300 Northcrest Dr, Spring, TX 77389', lat: 30.0900, lng: -95.5128, status: 'Stored', count: 28, notes: 'Packed' },
    { name: '3CV1C2924R2665965', code: 'DTN8', site: 'DTN8 - Nashville, TN', addr: '1000 Richard Petty Way, Lebanon, TN 37090', lat: 36.1839, lng: -86.3455, status: 'Stored', count: 28, notes: 'Deployed WITHOUT generator' },
    { name: '3CV1C2926R2666082', code: 'DLV3', site: 'DLV3 - Reno, NV', addr: '9740 North Virginia Street, Reno, NV', lat: 39.5863, lng: -119.8114, status: 'Stored', count: 28, notes: 'Packed' },
    { name: '3CVF82229R2665879', code: 'DKY5', site: 'DKY5 - Lexington, KY', addr: '1180 Newtown Pike, Lexington, KY 40511', lat: 38.0689, lng: -84.5226, status: 'Maintenance', count: 28, notes: 'Troubleshooting prior to pack up' },
    { name: '3CV1C2929R2661846', code: 'DII5', site: 'DII5 - Elkhart, IN', addr: '2675 Aeroplex Drive, Elkhart, IN 46514', lat: 41.7200, lng: -85.9689, status: 'Stored', count: 28, notes: 'Packed' },
    { name: '3CVF82223R2665926', code: 'DDX7', site: 'DDX7 - Dallas, TX', addr: 'Highway 80 and Gateway Boulevard, Forney, TX', lat: 32.7482, lng: -96.4547, status: 'Active', count: 28, notes: 'In-Use' },
    { name: '3CVF8222XR2665793', code: 'DLF1', site: 'DLF1 - Fort Myers, FL', addr: '8270 Logistics Dr, Fort Myers, FL 33912', lat: 26.5836, lng: -81.8271, status: 'Stored', count: 28, notes: 'Packed - moved from DFL4' },
    { name: '3CVF82225R2665927', code: 'DYY9', site: 'DYY9 - New York, NY', addr: '200 Miller Pl, Syosset, NY 11791', lat: 40.8151, lng: -73.5021, status: 'Stored', count: 28, notes: 'Packed' },
    { name: '3CV1C2725R2661572', code: 'DFL5', site: 'DFL5 - Orlando, FL', addr: '3000 Shelby Industrial Dr, Apopka, FL 32703', lat: 28.7039, lng: -81.4756, status: 'Active', count: 28, notes: '' },
    { name: '3CV1C2920R2661394', code: 'DDX6', site: 'DDX6 - Dallas, TX', addr: '16399 Gateway Path, Frisco, TX', lat: 33.1507, lng: -96.8236, status: 'Stored', count: 24, notes: 'Packed - 4 chargers down' },
    { name: '3CV1C2924R2661396', code: 'DGE7', site: 'DGE7 - Atlanta, GA', addr: '2125 Anvil Block Rd, Forest Park, GA', lat: 33.6201, lng: -84.3710, status: 'Stored', count: 28, notes: 'Packed' },
    { name: '3CVF82228R2665792', code: 'DCL5', site: 'DCL5 - Toledo, OH', addr: '2040 S Reynolds Rd, Toledo, OH 43614', lat: 41.6186, lng: -83.6130, status: 'Active', count: 28, notes: 'Set up with NO generator' },
    { name: '3CVF82224R2665837', code: 'DLN4', site: 'DLN4 - Chicago, IL', addr: '10500 S Woodlawn Ave, Chicago, IL', lat: 41.7068, lng: -87.5965, status: 'Stored', count: 28, notes: 'Packed' },
    { name: '3CV1C2926R2665966', code: 'DWA5', site: 'DWA5 - Seattle, WA', addr: '23226 Witte Rd SE, Maple Valley, WA 98038', lat: 47.3590, lng: -122.0374, status: 'Stored', count: 28, notes: 'Packed' },
    { name: '3CV1C2928R2666083', code: 'DTU7', site: 'DTU7 - Phoenix, AZ', addr: '13201 N Litchfield Rd, Surprise, AZ', lat: 33.6292, lng: -112.3576, status: 'Stored', count: 28, notes: 'Packed' },
    { name: 'DML8-Iris', code: 'DML8', site: 'DML8 - Sturtevant, WI', addr: '1925 Grandview Pkwy, Sturtevant, WI 53177', lat: 42.7020, lng: -87.8945, status: 'Maintenance', count: 21, notes: 'Only 21 operable chargers; repairs pending' }
  ];

  for (const t of trailers) {
    await db.execute({
      sql: `INSERT INTO trailers (id, trailer_name, trailer_type, site_code, site_name, address, latitude, longitude, status, charger_count, charger_type, power_capacity_kw, notes, created_at, updated_at)
            VALUES (?, ?, 'Iris Mobile Charging Trailer', ?, ?, ?, ?, ?, ?, ?, 'Level 2 - 19.2kW', 150, ?, ?, ?)`,
      args: [uuidv4(), t.name, t.code, t.site, t.addr, t.lat, t.lng, t.status, t.count, t.notes, now, now]
    });
  }
  console.log(`  Seeded ${trailers.length} Iris trailers into database`);
}

// ============================================
// QUERY HELPERS
// ============================================

async function getAllTrailers(filters = {}) {
  let sql = 'SELECT * FROM trailers';
  const conditions = [];
  const args = [];

  if (filters.status && filters.status !== 'all') {
    conditions.push('status = ?');
    args.push(filters.status);
  }
  if (filters.search) {
    conditions.push("(trailer_name LIKE ? OR site_code LIKE ? OR site_name LIKE ?)");
    const s = `%${filters.search}%`;
    args.push(s, s, s);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY trailer_name ASC';

  const result = await db.execute({ sql, args });
  return result.rows;
}

async function getTrailerById(id) {
  const result = await db.execute({ sql: 'SELECT * FROM trailers WHERE id = ?', args: [id] });
  return result.rows[0] || null;
}

async function createTrailer(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO trailers (id, trailer_name, trailer_type, site_code, site_name, address, latitude, longitude, status, charger_count, charger_type, power_capacity_kw, notes, gps_device_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.trailer_name, data.trailer_type || 'Iris Mobile Charging Trailer', data.site_code, data.site_name, data.address, data.latitude, data.longitude, data.status || 'Active', data.charger_count || 0, data.charger_type || 'Level 2 - 19.2kW', data.power_capacity_kw, data.notes, data.gps_device_id, now, now]
  });
  return await getTrailerById(id);
}

async function updateTrailer(id, data) {
  const existing = await getTrailerById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE trailers SET trailer_name=?, trailer_type=?, site_code=?, site_name=?, address=?, latitude=?, longitude=?, status=?, charger_count=?, charger_type=?, power_capacity_kw=?, notes=?, gps_device_id=?, updated_at=? WHERE id=?`,
    args: [
      data.trailer_name !== undefined ? data.trailer_name : existing.trailer_name,
      data.trailer_type !== undefined ? data.trailer_type : existing.trailer_type,
      data.site_code !== undefined ? data.site_code : existing.site_code,
      data.site_name !== undefined ? data.site_name : existing.site_name,
      data.address !== undefined ? data.address : existing.address,
      data.latitude !== undefined ? data.latitude : existing.latitude,
      data.longitude !== undefined ? data.longitude : existing.longitude,
      data.status !== undefined ? data.status : existing.status,
      data.charger_count !== undefined ? data.charger_count : existing.charger_count,
      data.charger_type !== undefined ? data.charger_type : existing.charger_type,
      data.power_capacity_kw !== undefined ? data.power_capacity_kw : existing.power_capacity_kw,
      data.notes !== undefined ? data.notes : existing.notes,
      data.gps_device_id !== undefined ? data.gps_device_id : existing.gps_device_id,
      now, id
    ]
  });
  return await getTrailerById(id);
}

async function deleteTrailer(id) {
  await db.execute({ sql: 'DELETE FROM trailers WHERE id = ?', args: [id] });
}

async function moveTrailer(id, moveData) {
  const trailer = await getTrailerById(id);
  if (!trailer) return null;

  const moveId = uuidv4();
  const now = new Date().toISOString();

  // Record history
  await db.execute({
    sql: `INSERT INTO move_history (id, trailer_id, moved_by, moved_at, from_site_code, from_site_name, from_address, from_latitude, from_longitude, to_site_code, to_site_name, to_address, to_latitude, to_longitude, reason, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [moveId, id, moveData.moved_by, now, trailer.site_code, trailer.site_name, trailer.address, trailer.latitude, trailer.longitude, moveData.to_site_code, moveData.to_site_name, moveData.to_address, moveData.to_latitude, moveData.to_longitude, moveData.reason, moveData.notes]
  });

  // Update trailer
  await db.execute({
    sql: `UPDATE trailers SET latitude=?, longitude=?, site_code=?, site_name=?, address=?, status=?, updated_at=? WHERE id=?`,
    args: [moveData.to_latitude, moveData.to_longitude, moveData.to_site_code, moveData.to_site_name || trailer.site_name, moveData.to_address || trailer.address, moveData.status || trailer.status, now, id]
  });

  return { trailer: await getTrailerById(id), move_id: moveId };
}

async function getTrailerHistory(trailerId) {
  const result = await db.execute({ sql: 'SELECT * FROM move_history WHERE trailer_id = ? ORDER BY moved_at DESC', args: [trailerId] });
  return result.rows;
}

async function getAllHistory(limit = 50) {
  const result = await db.execute({
    sql: `SELECT mh.*, t.trailer_name FROM move_history mh LEFT JOIN trailers t ON mh.trailer_id = t.id ORDER BY mh.moved_at DESC LIMIT ?`,
    args: [limit]
  });
  return result.rows;
}

async function getStats() {
  const total = (await db.execute('SELECT COUNT(*) as cnt FROM trailers')).rows[0].cnt;
  const active = (await db.execute("SELECT COUNT(*) as cnt FROM trailers WHERE status = 'Active'")).rows[0].cnt;
  const inTransit = (await db.execute("SELECT COUNT(*) as cnt FROM trailers WHERE status = 'In Transit'")).rows[0].cnt;
  const stored = (await db.execute("SELECT COUNT(*) as cnt FROM trailers WHERE status = 'Stored'")).rows[0].cnt;
  const maintenance = (await db.execute("SELECT COUNT(*) as cnt FROM trailers WHERE status = 'Maintenance'")).rows[0].cnt;
  const recentMoves = (await db.execute("SELECT COUNT(*) as cnt FROM move_history WHERE moved_at > datetime('now', '-7 days')")).rows[0].cnt;
  return { total, active, inTransit, stored, maintenance, recentMoves };
}

// GPS functions
async function updateGps(deviceId, latitude, longitude, speed, heading) {
  const trailerResult = await db.execute({ sql: 'SELECT * FROM trailers WHERE gps_device_id = ?', args: [deviceId] });
  if (trailerResult.rows.length === 0) return null;

  const trailer = trailerResult.rows[0];
  const logId = uuidv4();
  const now = new Date().toISOString();

  await db.execute({
    sql: 'INSERT INTO gps_logs (id, trailer_id, latitude, longitude, speed, heading, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [logId, trailer.id, latitude, longitude, speed, heading, now]
  });

  await db.execute({
    sql: 'UPDATE trailers SET latitude=?, longitude=?, last_gps_update=?, updated_at=? WHERE id=?',
    args: [latitude, longitude, now, now, trailer.id]
  });

  return trailer.id;
}

async function getGpsLogs(trailerId, limit = 100) {
  const result = await db.execute({ sql: 'SELECT * FROM gps_logs WHERE trailer_id = ? ORDER BY recorded_at DESC LIMIT ?', args: [trailerId, limit] });
  return result.rows;
}

module.exports = {
  initializeDatabase,
  getAllTrailers,
  getTrailerById,
  createTrailer,
  updateTrailer,
  deleteTrailer,
  moveTrailer,
  getTrailerHistory,
  getAllHistory,
  getStats,
  updateGps,
  getGpsLogs
};
