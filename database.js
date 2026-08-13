const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data.json');

function uuidv4() {
  return crypto.randomUUID();
}

function getDefaultData() {
  return {
    trailers: [],
    move_history: [],
    gps_logs: []
  };
}

function loadData() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading data file, resetting:', err.message);
  }
  // Initialize with seed data
  const data = getDefaultData();
  seedSampleData(data);
  saveData(data);
  return data;
}

function saveData(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function seedSampleData(data) {
  const now = new Date().toISOString();
  data.trailers = [
    {
      id: uuidv4(),
      trailer_name: 'MCT-001',
      trailer_type: 'Mobile Charging Trailer - 150kW',
      site_code: 'DDA2',
      site_name: 'DDA2 - Dallas, TX',
      latitude: 32.7767,
      longitude: -96.7970,
      status: 'Active',
      charger_count: 8,
      charger_type: 'Level 2 - 19.2kW',
      power_capacity_kw: 150,
      notes: 'Deployed for peak season support',
      gps_device_id: null,
      last_gps_update: null,
      created_at: now,
      updated_at: now
    },
    {
      id: uuidv4(),
      trailer_name: 'MCT-002',
      trailer_type: 'Mobile Charging Trailer - 100kW',
      site_code: 'DHO1',
      site_name: 'DHO1 - Houston, TX',
      latitude: 29.7604,
      longitude: -95.3698,
      status: 'Active',
      charger_count: 6,
      charger_type: 'Level 2 - 19.2kW',
      power_capacity_kw: 100,
      notes: 'Supporting new site ramp-up',
      gps_device_id: null,
      last_gps_update: null,
      created_at: now,
      updated_at: now
    },
    {
      id: uuidv4(),
      trailer_name: 'MCT-003',
      trailer_type: 'Mobile Charging Trailer - 150kW',
      site_code: 'DPH5',
      site_name: 'DPH5 - Phoenix, AZ',
      latitude: 33.4484,
      longitude: -112.0740,
      status: 'Active',
      charger_count: 8,
      charger_type: 'Level 2 - 19.2kW',
      power_capacity_kw: 150,
      notes: 'Summer demand coverage',
      gps_device_id: null,
      last_gps_update: null,
      created_at: now,
      updated_at: now
    },
    {
      id: uuidv4(),
      trailer_name: 'MCT-004',
      trailer_type: 'Mobile Charging Trailer - 100kW',
      site_code: 'DAT5',
      site_name: 'DAT5 - Atlanta, GA',
      latitude: 33.7490,
      longitude: -84.3880,
      status: 'In Transit',
      charger_count: 6,
      charger_type: 'Level 2 - 19.2kW',
      power_capacity_kw: 100,
      notes: 'Being relocated from DFL3',
      gps_device_id: null,
      last_gps_update: null,
      created_at: now,
      updated_at: now
    },
    {
      id: uuidv4(),
      trailer_name: 'MCT-005',
      trailer_type: 'Mobile Charging Trailer - 200kW',
      site_code: 'DLA9',
      site_name: 'DLA9 - Los Angeles, CA',
      latitude: 34.0522,
      longitude: -118.2437,
      status: 'Active',
      charger_count: 10,
      charger_type: 'Level 2 - 19.2kW',
      power_capacity_kw: 200,
      notes: 'Permanent deployment - high demand site',
      gps_device_id: null,
      last_gps_update: null,
      created_at: now,
      updated_at: now
    },
    {
      id: uuidv4(),
      trailer_name: 'MCT-006',
      trailer_type: 'Mobile Charging Trailer - 150kW',
      site_code: null,
      site_name: 'Storage Yard - Nashville, TN',
      latitude: 36.1627,
      longitude: -86.7816,
      status: 'Stored',
      charger_count: 8,
      charger_type: 'Level 2 - 19.2kW',
      power_capacity_kw: 150,
      notes: 'Available for deployment - maintenance complete',
      gps_device_id: null,
      last_gps_update: null,
      created_at: now,
      updated_at: now
    },
    {
      id: uuidv4(),
      trailer_name: 'MCT-007',
      trailer_type: 'Mobile Charging Trailer - 100kW',
      site_code: 'DDV1',
      site_name: 'DDV1 - Denver, CO',
      latitude: 39.7392,
      longitude: -104.9903,
      status: 'Maintenance',
      charger_count: 6,
      charger_type: 'Level 2 - 19.2kW',
      power_capacity_kw: 100,
      notes: 'Scheduled maintenance - charger #3 replacement',
      gps_device_id: null,
      last_gps_update: null,
      created_at: now,
      updated_at: now
    },
    {
      id: uuidv4(),
      trailer_name: 'MCT-008',
      trailer_type: 'Mobile Charging Trailer - 150kW',
      site_code: 'DSE4',
      site_name: 'DSE4 - Seattle, WA',
      latitude: 47.6062,
      longitude: -122.3321,
      status: 'Active',
      charger_count: 8,
      charger_type: 'Level 2 - 19.2kW',
      power_capacity_kw: 150,
      notes: 'Supporting EV fleet expansion',
      gps_device_id: null,
      last_gps_update: null,
      created_at: now,
      updated_at: now
    }
  ];
}

// Initialize on first require
let _data = loadData();

function getData() {
  return _data;
}

function persist() {
  saveData(_data);
}

module.exports = { getData, persist, uuidv4 };
