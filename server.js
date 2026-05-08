const express  = require('express');
const session   = require('express-session');
const bodyParser= require('body-parser');
const fs        = require('fs-extra');
const path      = require('path');
const http      = require('http');
const { Server }= require('socket.io');

const app  = express();
const httpServer = http.createServer(app);
const io   = new Server(httpServer, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

// ===== SESSION MIDDLEWARE (shared with Socket.IO) =====
const sessionMiddleware = session({
    secret: 'agl-secret-key-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
});

// ===== BODY PARSERS =====
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ===== STATIC FILES =====
app.use('/certificates', express.static(path.join(__dirname, 'certificates'), {
    setHeaders: (res) => {
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'inline');
    }
}));
app.use(express.static(path.join(__dirname, '/'), {
    extensions: ['html', 'htm'],
    maxAge: 0, etag: false, lastModified: false
}));

// ===== SESSION =====
app.use(sessionMiddleware);

// Share session with Socket.IO
io.use((socket, next) => sessionMiddleware(socket.request, socket.request.res || {}, next));

// ===== CONTENT CACHE =====
let contentCache = null, contentCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;
const CONTENT_FILE = path.join(__dirname, 'content.json');
const QUOTES_FILE  = path.join(__dirname, 'quotes.json');

// ===== CHAT STATE (in-memory) =====
const chatSessions = new Map(); // socketId → session object
const adminSockets = new Set(); // admin socket IDs

function generateUsername() {
    const adjs  = ['Swift','Bold','Bright','Quick','Smart','Calm','Brave','Sharp','Cool','Wise','Fast','Blue','Dark','Wild','Iron'];
    const nouns = ['Eagle','Tiger','Falcon','Wolf','Shark','Bear','Lion','Hawk','Fox','Cobra','Raven','Storm','River','Scout','Blaze'];
    const num   = Math.floor(Math.random() * 9000) + 1000;
    return adjs[Math.floor(Math.random()*adjs.length)] + nouns[Math.floor(Math.random()*nouns.length)] + '#' + num;
}

// ===== SOCKET.IO CHAT =====
io.on('connection', (socket) => {
    const rawIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || 'Unknown';
    const ip    = rawIp.split(',')[0].replace('::ffff:', '').trim();

    // ── VISITOR: join ──────────────────────────────────────────────────────────
    socket.on('visitor:join', (data) => {
        const saved = typeof data?.username === 'string' && /^[A-Za-z]+#\d{4}$/.test(data.username);
        const username = saved ? data.username : generateUsername();
        const session  = {
            id: socket.id, username, ip,
            page     : data.page || '/',
            messages : [],
            unread   : 0,
            joinedAt : new Date().toISOString(),
            active   : true
        };
        chatSessions.set(socket.id, session);
        socket.emit('visitor:ready', { username });
        io.to('admin-room').emit('chat:visitor-joined', session);
    });

    // ── VISITOR: send message ──────────────────────────────────────────────────
    socket.on('visitor:message', (text) => {
        const s = chatSessions.get(socket.id);
        if (!s || !text?.trim()) return;
        const msg = { from: 'visitor', text: text.trim(), ts: Date.now() };
        s.messages.push(msg);
        s.unread++;
        socket.emit('visitor:echo', msg);
        io.to('admin-room').emit('chat:new-message', { sessionId: socket.id, msg, unread: s.unread });
    });

    // ── VISITOR: typing indicator ──────────────────────────────────────────────
    socket.on('visitor:typing', (isTyping) => {
        io.to('admin-room').emit('chat:visitor-typing', { sessionId: socket.id, isTyping });
    });

    // ── ADMIN: authenticate via shared session ─────────────────────────────────
    socket.on('admin:auth', () => {
        if (!socket.request.session?.authenticated) {
            socket.emit('admin:auth-fail');
            return;
        }
        adminSockets.add(socket.id);
        socket.join('admin-room');
        socket.emit('admin:ready', { sessions: [...chatSessions.values()] });
    });

    // ── ADMIN: reply to visitor ────────────────────────────────────────────────
    socket.on('admin:reply', ({ sessionId, text }) => {
        if (!adminSockets.has(socket.id) || !text?.trim()) return;
        const s = chatSessions.get(sessionId);
        if (!s) { socket.emit('chat:error', 'Visitor session not found'); return; }
        const msg = { from: 'admin', text: text.trim(), ts: Date.now() };
        s.messages.push(msg);
        s.unread = 0;
        io.to(sessionId).emit('admin:message', msg);           // to visitor
        io.to('admin-room').emit('chat:reply-sent', { sessionId, msg }); // to all admins
    });

    // ── ADMIN: typing indicator to visitor ────────────────────────────────────
    socket.on('admin:typing', ({ sessionId, isTyping }) => {
        if (!adminSockets.has(socket.id)) return;
        io.to(sessionId).emit('admin:typing', isTyping);
    });

    // ── ADMIN: mark conversation read ─────────────────────────────────────────
    socket.on('admin:read', (sessionId) => {
        const s = chatSessions.get(sessionId);
        if (s) { s.unread = 0; }
        io.to('admin-room').emit('chat:session-read', sessionId);
    });

    // ── DISCONNECT ─────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        if (adminSockets.has(socket.id)) {
            adminSockets.delete(socket.id);
        } else {
            const s = chatSessions.get(socket.id);
            if (s) {
                s.active = false;
                io.to('admin-room').emit('chat:visitor-left', socket.id);
            }
        }
    });
});

// ===== INIT CONTENT =====
async function initContent() {
    if (!await fs.pathExists(CONTENT_FILE)) {
        await fs.writeJson(CONTENT_FILE, {
            hero: { title: "Delivering Precision. Ensuring Safety. Building Trust.", subtitle: "India's Leading Specialist in Heavy & Over-Dimensional Cargo Logistics.", stats: [{ label:"Years of Experience",value:"15+" },{ label:"Successful Projects",value:"500+" },{ label:"Cities Covered",value:"2000+" },{ label:"Commitment to Safety",value:"100%" }] },
            about: { title: "Excellence in Heavy Logistics", description1: "", description2: "", features: [] },
            projects: [], services: {}, industries: [],
            contact: { address: "", phone: "", email: "" },
            settings: { whatsapp: "", whatsappEnabled: true, chat: { enabled: false }, socialLinks: {}, contact: {} }
        }, { spaces: 4 });
    }
}
initContent();

// ===== AUTH MIDDLEWARE =====
const checkAuth = (req, res, next) => {
    if (req.session.authenticated) return next();
    if (req.path.startsWith('/api/admin/')) return res.status(401).json({ success: false, message: 'Session expired.' });
    res.redirect('/admin/login.html');
};

// ===== API: CONTENT =====
app.get('/api/content', async (req, res) => {
    const now = Date.now();
    if (contentCache && (now - contentCacheTime) < CACHE_TTL) {
        return res.set('Cache-Control','public,max-age=300').json(contentCache);
    }
    const content = await fs.readJson(CONTENT_FILE);
    contentCache = content; contentCacheTime = now;
    res.set('Cache-Control','public,max-age=300').json(content);
});

// ===== API: ADMIN AUTH =====
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'naveenagl' && password === 'Naveen@agl2026') {
        req.session.authenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/api/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/admin/login.html');
    });
});

// ===== API: CONTENT UPDATE =====
app.post('/api/admin/update-content', checkAuth, async (req, res) => {
    try {
        await fs.writeJson(CONTENT_FILE, req.body, { spaces: 4 });
        contentCache = null; contentCacheTime = 0;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ===== ADMIN PANEL ROUTE =====
app.get('/admin', checkAuth, (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ===== API: QUOTES =====
app.post('/api/contact/submit', async (req, res) => {
    try {
        const { name, email, phone, service, message } = req.body;
        if (!name || !email || !phone) return res.status(400).json({ success: false, message: 'Name, email, and phone are required.' });
        const quotes = (await fs.pathExists(QUOTES_FILE)) ? await fs.readJson(QUOTES_FILE) : [];
        quotes.push({ id: Date.now(), name, email, phone, service: service||'Not specified', message: message||'', timestamp: new Date().toISOString(), read: false });
        await fs.writeJson(QUOTES_FILE, quotes, { spaces: 4 });
        res.json({ success: true, message: 'Quote request submitted successfully!' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/admin/quotes', checkAuth, async (req, res) => {
    try {
        const quotes = (await fs.pathExists(QUOTES_FILE)) ? await fs.readJson(QUOTES_FILE) : [];
        res.json({ success: true, quotes: quotes.reverse() });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.delete('/api/admin/quotes/:id', checkAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        let quotes = (await fs.pathExists(QUOTES_FILE)) ? await fs.readJson(QUOTES_FILE) : [];
        quotes = quotes.filter(q => q.id !== id);
        await fs.writeJson(QUOTES_FILE, quotes, { spaces: 4 });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.put('/api/admin/quotes/:id/read', checkAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const quotes = (await fs.pathExists(QUOTES_FILE)) ? await fs.readJson(QUOTES_FILE) : [];
        const q = quotes.find(q => q.id === id);
        if (q) { q.read = true; await fs.writeJson(QUOTES_FILE, quotes, { spaces: 4 }); }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ===== START =====
httpServer.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
