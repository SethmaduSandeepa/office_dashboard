const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /mp4|avi|mov|wmv|flv|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only video files are allowed!'));
  }
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sethmaduss_db_user:g4ZfAqWFTzgSyBGj@companyrating.jlyzepn.mongodb.net/?appName=companyrating';
console.log('Attempting to connect to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('Full error:', err);
  });

// Updated schema: add subcompany and video
const companySchema = new mongoose.Schema({
  name: { type: String, required: true },       // Main company
  subcompany: { type: String, required: true }, // Subcompany (e.g., department, branch)
  rating: { type: Number, required: true, min: 0, max: 5000 }, // LKR amount (0-5000)
  video: { type: String, required: false }      // Video URL (optional)
});

// Compound index to allow same company with different subcompanies
companySchema.index({ name: 1, subcompany: 1 }, { unique: true });

const Company = mongoose.model('Company', companySchema);

app.use(express.json());

// Sessions for login
const SESSION_SECRET = process.env.SESSION_SECRET || 'change_this_secret';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 12 } // 12 hours
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'auth required' });
}

// helper: escape regex special chars
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Auth routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    req.session.user = { username };
    return res.json({ success: true, user: { username } });
  }
  return res.status(401).json({ error: 'invalid credentials' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ authenticated: true, user: req.session.user });
  }
  return res.json({ authenticated: false });
});

// Gate admin pages
app.get(['/admin.html', '/add.html'], (req, res, next) => {
  if (req.session && req.session.user) return next();
  const nextUrl = encodeURIComponent(req.path);
  return res.redirect('/login.html?next=' + nextUrl);
});

// Static after gates
app.use(express.static(path.join(__dirname, 'public')));

// 🖥️ Dashboard API with limit/sort
app.get('/api/companies', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database not connected', 
        message: 'MongoDB connection is not ready. Please check MongoDB Atlas IP whitelist.' 
      });
    }

    const { limit, sort, order } = req.query;
    let limitN = parseInt(limit, 10);
    if (Number.isNaN(limitN) || limitN <= 0) limitN = 20; // default 20
    if (limitN > 200) limitN = 200; // safety cap

    // Allowed sort fields
    const allowedSort = new Set(['name', 'subcompany', 'rating']);
    let sortField = allowedSort.has(sort) ? sort : null;
    const sortOrder = (order === 'desc') ? -1 : 1; // default asc

    let sortObj;
    if (sortField) {
      sortObj = { [sortField]: sortOrder, name: 1, subcompany: 1 };
    } else {
      // default sort by name, subcompany
      sortObj = { name: 1, subcompany: 1 };
    }

    const companies = await Company.find()
      .sort(sortObj)
      .limit(limitN);
    res.json(companies);
  } catch (err) {
    console.error('Error fetching companies:', err);
    res.status(500).json({ error: 'Failed to fetch companies', message: err.message });
  }
});

// 📄 Single company details (by name + subcompany)
app.get('/api/company', async (req, res) => {
  try {
    const name = (req.query.name || '').toString();
    const subcompany = (req.query.subcompany || '').toString();
    if (!name || !subcompany) {
      return res.status(400).json({ error: 'name and subcompany are required' });
    }
    const company = await Company.findOne({ name, subcompany });
    if (!company) return res.status(404).json({ error: 'Not found' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// ✏️ Add/Update via UI
app.post('/api/update', requireAuth, async (req, res) => {
  const { name, subcompany, rating, video, originalName, originalSubcompany } = req.body || {};

  // Validate only if provided
  if (rating !== undefined && (typeof rating !== 'number' || rating < 0 || rating > 5000)) {
    return res.status(400).json({ error: 'Amount (LKR) must be between 0 and 5000 if provided.' });
  }
  if (!name && !subcompany && rating === undefined && !video) {
    return res.status(400).json({ error: 'At least one field must be provided.' });
  }

  try {
    // Support renaming company/subcompany by accepting original keys
    const lookup = {
      name: originalName ? String(originalName) : name,
      subcompany: originalSubcompany ? String(originalSubcompany) : subcompany
    };

    let company = await Company.findOne(lookup);
    if (!company) {
      // Fallback: try current pair (covers normal update without originals)
      company = await Company.findOne({ name, subcompany });
    }
    if (!company) {
      // Create new if none found
      company = new Company({ name, subcompany, rating, video: video || '' });
    } else {
      // Update existing, allow changing unique keys
      company.name = name;
      company.subcompany = subcompany;
      company.rating = rating;
      company.video = video || '';
    }
    await company.save();
    res.json({ success: true, company });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Target company + subcompany already exists.' });
    }
    res.status(500).json({ error: 'Failed to save' });
  }
});

// � Upload video file
app.post('/api/upload-video', requireAuth, upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const videoPath = '/uploads/' + req.file.filename;
    res.json({ success: true, videoPath });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// �🗑️ Delete a company + subcompany
app.post('/api/delete', requireAuth, async (req, res) => {
  try {
    const nameRaw = (req.body && req.body.name ? String(req.body.name) : '').trim();
    const subRawPresent = Object.prototype.hasOwnProperty.call(req.body || {}, 'subcompany');
    const subRaw = subRawPresent && req.body ? String(req.body.subcompany || '').trim() : '';

    if (!nameRaw) {
      return res.status(400).json({ error: 'name is required' });
    }

    const query = {
      name: new RegExp('^' + escapeRegex(nameRaw) + '$', 'i')
    };

    let result;
    if (subRawPresent && subRaw) {
      query.subcompany = new RegExp('^' + escapeRegex(subRaw) + '$', 'i');
      result = await Company.deleteOne(query);
    } else if (subRawPresent && !subRaw) {
      // explicit empty subcompany -> delete all subcompanies for this company
      result = await Company.deleteMany(query);
    } else {
      // subcompany not provided -> delete all subcompanies for this company
      result = await Company.deleteMany(query);
    }

    if (!result || result.deletedCount === 0) {
      return res.status(404).json({ error: 'Not found', deletedCount: 0 });
    }
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// 🔥 Optional: Clear all (for testing)
app.get('/clear', async (req, res) => {
  await Company.deleteMany({});
  res.send('✅ All entries cleared!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});