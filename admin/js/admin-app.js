// ===== STATE =====
let siteContent = {};

// ===== TOAST =====
function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2800);
}

function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== TAB NAVIGATION =====
const tabTitles = {
    dashboard: ['Dashboard', 'Welcome back, Administrator'],
    quotes: ['Quote Requests', 'Manage incoming quote requests'],
    settings: ['Settings', 'Configure website options — changes go live on save']
};

function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const target = document.getElementById(`tab-${tab}`);
    if (target) target.classList.add('active');
    const info = tabTitles[tab] || [tab, ''];
    document.getElementById('page-title').textContent = info[0];
    document.getElementById('page-subtitle').textContent = info[1];
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.style.display = tab === 'settings' ? 'inline-flex' : 'none';
    if (tab === 'quotes') loadQuotes();
}

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ===== LOAD CONTENT =====
async function loadContent() {
    try {
        const r = await fetch('/api/content', { cache: 'no-store' });
        if (r.status === 401) { window.location.href = '/admin/login.html'; return; }
        siteContent = await r.json();
        if (!siteContent.settings) siteContent.settings = {};
        populateSettings();
        updateDashboardStats();
    } catch (e) {
        console.error('Load error:', e);
        showToast('Failed to load content from server', 'error');
    }
}

// ===== POPULATE SETTINGS =====
function populateSettings() {
    const s = siteContent.settings || {};

    // Chat
    const chatEnabled = document.getElementById('chat-enabled');
    const chatCode = document.getElementById('chat-code');
    if (chatEnabled) chatEnabled.checked = !!(s.chat?.enabled);
    if (chatCode) chatCode.value = s.chat?.code || '';

    // WhatsApp
    const waEnabled = document.getElementById('wa-enabled');
    const waNumber = document.getElementById('wa-number');
    if (waEnabled) waEnabled.checked = s.whatsappEnabled !== false;
    if (waNumber) waNumber.value = s.whatsapp || '';

    // Social links
    const links = s.socialLinks || {};
    const li = document.getElementById('social-linkedin'); if (li) li.value = links.linkedin || '';
    const tw = document.getElementById('social-twitter');  if (tw) tw.value = links.twitter  || '';
    const fb = document.getElementById('social-facebook'); if (fb) fb.value = links.facebook || '';
    const ig = document.getElementById('social-instagram'); if (ig) ig.value = links.instagram || '';

    // Contact info
    const c = s.contact || siteContent.contact || {};
    const ca = document.getElementById('contact-address'); if (ca) ca.value = c.address || '';
    const cp = document.getElementById('contact-phone');   if (cp) cp.value = c.phone   || '';
    const ce = document.getElementById('contact-email');   if (ce) ce.value = c.email   || '';
}

// ===== DASHBOARD STATS =====
async function updateDashboardStats() {
    try {
        const r = await fetch('/api/admin/quotes');
        if (r.status === 401) return;
        const data = await r.json();
        if (!data.success) return;
        const quotes = data.quotes || [];
        const unread = quotes.filter(q => !q.read).length;

        const su = document.getElementById('stat-unread'); if (su) su.textContent = unread;
        const st = document.getElementById('stat-total');  if (st) st.textContent = quotes.length;

        // WhatsApp number preview on dashboard
        const waNum = siteContent.settings?.whatsapp;
        const waOn = siteContent.settings?.whatsappEnabled !== false;
        const swa = document.getElementById('stat-wa');
        if (swa) swa.textContent = waNum && waOn ? `+${waNum}` : (waNum ? 'Off' : 'Not set');

        // Chat status on dashboard
        const chatEl = document.getElementById('dash-chat-status');
        if (chatEl) {
            const chatOn = siteContent.settings?.chat?.enabled;
            chatEl.textContent = chatOn ? 'Active' : 'Inactive';
            chatEl.style.color = chatOn ? 'var(--success)' : 'var(--text-muted)';
        }

        // Nav badge
        const nb = document.getElementById('nav-unread-badge');
        if (nb) { nb.textContent = unread; nb.style.display = unread > 0 ? 'inline-flex' : 'none'; }
    } catch (e) { /* silent */ }
}

// ===== SAVE SETTINGS =====
async function saveSettings() {
    if (!siteContent.settings) siteContent.settings = {};
    const s = siteContent.settings;

    // Chat
    s.chat = {
        enabled: document.getElementById('chat-enabled')?.checked || false,
        code: document.getElementById('chat-code')?.value || ''
    };

    // WhatsApp
    s.whatsappEnabled = document.getElementById('wa-enabled')?.checked !== false;
    s.whatsapp = (document.getElementById('wa-number')?.value || '').trim().replace(/\D/g, '');

    // Social Links
    s.socialLinks = {
        linkedin:  (document.getElementById('social-linkedin')?.value  || '').trim(),
        twitter:   (document.getElementById('social-twitter')?.value   || '').trim(),
        facebook:  (document.getElementById('social-facebook')?.value  || '').trim(),
        instagram: (document.getElementById('social-instagram')?.value || '').trim()
    };

    // Contact Info — store in settings AND top-level contact for backward compat
    const addr  = (document.getElementById('contact-address')?.value || '').trim();
    const phone = (document.getElementById('contact-phone')?.value   || '').trim();
    const email = (document.getElementById('contact-email')?.value   || '').trim();
    s.contact = { address: addr, phone, email };
    siteContent.contact = { ...siteContent.contact, address: addr, phone, email };

    try {
        const r = await fetch('/api/admin/update-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(siteContent)
        });
        const data = await r.json();
        if (data.success) {
            showToast('Settings saved! Changes are now live on the website.');
            document.getElementById('last-save').textContent = new Date().toLocaleTimeString();
            updateDashboardStats();
        } else {
            showToast(data.message || 'Save failed', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Connection error. Check server.', 'error');
    }
}

// ===== LOAD QUOTES =====
async function loadQuotes() {
    const el = document.getElementById('quotes-list');
    if (!el) return;
    el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>';

    try {
        const r = await fetch('/api/admin/quotes');
        if (r.status === 401) { window.location.href = '/admin/login.html'; return; }
        const data = await r.json();
        if (!data.success) { showToast(data.message || 'Failed to load', 'error'); return; }

        const quotes = data.quotes || [];
        const unread = quotes.filter(q => !q.read).length;

        const badge = document.getElementById('quotes-badge');
        if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'inline' : 'none'; }

        const nb = document.getElementById('nav-unread-badge');
        if (nb) { nb.textContent = unread; nb.style.display = unread > 0 ? 'inline-flex' : 'none'; }

        const markAllBtn = document.getElementById('mark-all-read-btn');
        if (markAllBtn) markAllBtn.style.display = unread > 0 ? 'inline-flex' : 'none';

        if (!quotes.length) {
            el.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No quote requests yet. They will appear here when visitors submit the contact form.</p></div>';
            return;
        }

        el.innerHTML = quotes.map(q => `
            <div class="quote-card ${q.read ? 'quote-read' : 'quote-unread'}">
                <div class="quote-header">
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                        <h4 style="margin:0;font-size:1rem">${esc(q.name)}</h4>
                        ${!q.read ? '<span class="badge-new">NEW</span>' : ''}
                    </div>
                    <span class="quote-time">${new Date(q.timestamp).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                </div>
                <div class="quote-meta">
                    <span><i class="fas fa-envelope"></i> ${esc(q.email)}</span>
                    <span><i class="fas fa-phone"></i> ${esc(q.phone)}</span>
                    <span><i class="fas fa-tag"></i> ${esc(q.service)}</span>
                </div>
                ${q.message ? `<p class="quote-message">${esc(q.message)}</p>` : ''}
                <div class="quote-actions">
                    <a href="mailto:${esc(q.email)}" class="btn btn-outline btn-sm" target="_blank">
                        <i class="fas fa-reply"></i> Reply
                    </a>
                    <a href="tel:${esc(q.phone)}" class="btn btn-outline btn-sm">
                        <i class="fas fa-phone"></i> Call
                    </a>
                    ${!q.read ? `<button class="btn btn-save btn-sm" onclick="markRead(${q.id})"><i class="fas fa-check"></i> Mark Read</button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteQuote(${q.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`).join('');
    } catch (e) {
        console.error(e);
        el.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load quotes. Check server connection.</p></div>';
    }
}

async function markRead(id) {
    try {
        await fetch(`/api/admin/quotes/${id}/read`, { method: 'PUT' });
        loadQuotes();
        updateDashboardStats();
    } catch(e) {}
}

async function markAllRead() {
    const el = document.getElementById('quotes-list');
    if (!el) return;
    const btns = el.querySelectorAll('[onclick^="markRead"]');
    const ids = [];
    btns.forEach(b => { const m = b.getAttribute('onclick').match(/markRead\((\d+)\)/); if (m) ids.push(+m[1]); });
    await Promise.all(ids.map(id => fetch(`/api/admin/quotes/${id}/read`, { method: 'PUT' }).catch(() => {})));
    loadQuotes();
    updateDashboardStats();
    showToast('All marked as read');
}

async function deleteQuote(id) {
    if (!confirm('Delete this quote request?')) return;
    try {
        await fetch(`/api/admin/quotes/${id}`, { method: 'DELETE' });
        loadQuotes();
        updateDashboardStats();
        showToast('Quote deleted');
    } catch(e) { showToast('Failed to delete', 'error'); }
}

// ===== INIT =====
loadContent();
loadQuotes();
