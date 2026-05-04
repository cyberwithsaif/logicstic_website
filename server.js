const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory cache for content.json
let contentCache = null;
let contentCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/'), {
    extensions: ['html', 'htm'],
    maxAge: '7d',       // Cache static assets for 7 days in browser
    etag: true,
    lastModified: true
}));
app.use(session({
    secret: 'agl-secret-key-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

const CONTENT_FILE = path.join(__dirname, 'content.json');

// Initialize content.json if it doesn't exist
async function initContent() {
    if (!await fs.pathExists(CONTENT_FILE)) {
        const initialContent = {
            hero: {
                title: "Delivering Precision. Ensuring Safety. Building Trust.",
                subtitle: "India's Leading Specialist in Heavy & Over-Dimensional Cargo Logistics.",
                stats: [
                    { label: "Years of Experience", value: "15+" },
                    { label: "Successful Projects", value: "500+" },
                    { label: "Cities Covered", value: "2000+" },
                    { label: "Commitment to Safety", value: "100%" }
                ]
            },
            projects: [
                {
                    id: 1,
                    title: "Mega Transformer Transport",
                    category: "Heavy Haulage",
                    description: "Multi-axle transportation of 250MT transformer across 12 states.",
                    image: "images/secind.webp"
                },
                {
                    id: 2,
                    title: "Wind Turbine Logistics",
                    category: "Renewable Energy",
                    description: "Delivery of wind turbine blades to remote hilly terrains.",
                    image: "images/secind (1).webp"
                }
            ],
            contact: {
                address: "699/210 Laxman Vihar-II, G.No-1, Gurugram, Haryana 122001, India",
                phone: "+91 1234567890",
                email: "info@ashtamglobal.com"
            }
        };
        await fs.writeJson(CONTENT_FILE, initialContent, { spaces: 4 });
    }
}

initContent();

// Auth Middleware
const checkAuth = (req, res, next) => {
    if (req.session.authenticated) {
        next();
    } else {
        // If it's an API request, return JSON instead of redirecting
        if (req.path.startsWith('/api/admin/')) {
            return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
        }
        res.redirect('/admin/login.html');
    }
};

// API Endpoints
app.get('/api/content', async (req, res) => {
    const now = Date.now();
    // Serve from cache if fresh
    if (contentCache && (now - contentCacheTime) < CACHE_TTL) {
        res.set('Cache-Control', 'public, max-age=300');
        return res.json(contentCache);
    }
    const content = await fs.readJson(CONTENT_FILE);
    contentCache = content;
    contentCacheTime = now;
    res.set('Cache-Control', 'public, max-age=300');
    res.json(content);
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'agl2026') { // Default credentials
        req.session.authenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/admin/update-content', checkAuth, async (req, res) => {
    try {
        await fs.writeJson(CONTENT_FILE, req.body, { spaces: 4 });
        // Invalidate cache on update
        contentCache = null;
        contentCacheTime = 0;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login.html');
});

// Serve Admin Panel (Protected)
app.get('/admin', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
