const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dishes = require('./data/dishes');

const app = express();
const PORT = 3000;

// Ensure uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'pk-food-analyzer-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// --- Mock Users ---
const USERS = [
  { id: 1, username: 'admin', password: 'admin123', name: 'Chef Admin' },
  { id: 2, username: 'user', password: 'user123', name: 'Food Explorer' }
];

// --- Auth Middleware ---
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// --- AUTH ROUTES ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.userId = user.id;
  req.session.userName = user.name;
  res.json({ success: true, name: user.name });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  res.json({ name: req.session.userName });
});

// --- DISH ROUTES ---
app.get('/api/dishes', requireAuth, (req, res) => {
  const list = dishes.map(d => ({
    id: d.id, name: d.name, category: d.category,
    emoji: d.emoji, image: d.image, description: d.description
  }));
  res.json(list);
});

app.get('/api/dishes/:id', requireAuth, (req, res) => {
  const dish = dishes.find(d => d.id === parseInt(req.params.id));
  if (!dish) return res.status(404).json({ error: 'Dish not found' });
  res.json(dish);
});

// --- IMAGE ANALYSIS (filename-based matching) ---
app.post('/api/analyze', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const originalName = req.file.originalname.toLowerCase();
  // Remove extension and clean the filename
  const baseName = path.parse(originalName).name
    .replace(/[_\-\.]/g, ' ')
    .replace(/\d+/g, '')
    .trim();

  // Score each dish by keyword match
  let bestMatch = null;
  let bestScore = 0;

  for (const dish of dishes) {
    let score = 0;
    const nameLower = dish.name.toLowerCase();

    // Check exact name match
    if (baseName.includes(nameLower) || nameLower.includes(baseName)) {
      score += 10;
    }

    // Check each keyword
    for (const kw of dish.keywords) {
      if (baseName.includes(kw.toLowerCase())) {
        score += 5;
      }
      // Check individual words from the filename
      const words = baseName.split(/\s+/);
      for (const word of words) {
        if (word.length >= 3 && kw.toLowerCase().includes(word)) {
          score += 2;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = dish;
    }
  }

  if (bestMatch && bestScore >= 2) {
    res.json({
      matched: true,
      confidence: Math.min(bestScore * 10, 98),
      dish: bestMatch,
      analyzedFilename: req.file.originalname,
      uploadedPath: '/uploads/' + req.file.filename
    });
  } else {
    res.json({
      matched: false,
      confidence: 0,
      analyzedFilename: req.file.originalname,
      message: 'Could not identify the dish. Try naming your image like "biryani.jpg" or "burger.png".'
    });
  }
});

// --- Serve pages ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));

app.listen(PORT, () => {
  console.log(`\n🍛  Pakistani Food Analyzer is running!`);
  console.log(`   → http://localhost:${PORT}\n`);
  console.log(`   Login: admin / admin123`);
  console.log(`          user  / user123\n`);
});
