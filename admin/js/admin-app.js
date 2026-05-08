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

// ===== DASHBOARD CLOCK =====
function startClock() {
    function tick() {
        const now = new Date();
        const hour = now.getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        const dtEl = document.getElementById('dash-datetime');
        const grEl = document.getElementById('dash-greeting');
        if (grEl) grEl.textContent = greet;
        if (dtEl) dtEl.textContent = now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
            + ' · ' + now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    }
    tick();
    setInterval(tick, 30000);
}

// ===== DASHBOARD STATS =====
async function updateDashboardStats() {
    // Update config overview from siteContent
    const s = siteContent.settings || {};

    // WhatsApp
    const waNum = s.whatsapp || '';
    const waOn  = s.whatsappEnabled !== false;
    const waTog = document.getElementById('dash-wa-toggle');
    const waNumEl = document.getElementById('dash-wa-number');
    const waStatEl = document.getElementById('dash-wa-status');
    if (waTog) waTog.checked = waOn && !!waNum;
    if (waNumEl) waNumEl.textContent = waNum ? `+${waNum}` : 'Number not configured';
    if (waStatEl) {
        waStatEl.textContent = waOn && waNum ? 'Active on website' : waNum ? 'Disabled' : 'Not configured';
        waStatEl.style.color = waOn && waNum ? 'var(--success)' : 'var(--danger)';
    }

    // Chat
    const chatOn   = !!(s.chat?.enabled);
    const chatCode = s.chat?.code || '';
    const chatTog  = document.getElementById('dash-chat-toggle');
    const chatStat = document.getElementById('dash-chat-status');
    const chatInfo = document.getElementById('dash-chat-info');
    if (chatTog) chatTog.checked = chatOn;
    if (chatStat) {
        chatStat.textContent = chatOn ? 'Active on website' : 'Inactive';
        chatStat.style.color = chatOn ? 'var(--success)' : 'var(--text-muted)';
    }
    if (chatInfo) chatInfo.textContent = chatCode ? 'Embed code configured' : 'No embed code set';

    // Social Links
    const sl = s.socialLinks || {};
    const platforms = [
        { key: 'linkedin', icon: 'fab fa-linkedin-in', color: '#0077b5', label: 'LinkedIn' },
        { key: 'twitter',  icon: 'fab fa-twitter',     color: '#1da1f2', label: 'Twitter' },
        { key: 'facebook', icon: 'fab fa-facebook-f',  color: '#1877f2', label: 'Facebook' },
        { key: 'instagram',icon: 'fab fa-instagram',   color: '#e1306c', label: 'Instagram' }
    ];
    const connectedPlatforms = platforms.filter(p => sl[p.key]);
    const socialEl = document.getElementById('dash-social-icons');
    const socialCount = document.getElementById('dash-social-count');
    if (socialEl) {
        if (connectedPlatforms.length) {
            socialEl.innerHTML = connectedPlatforms.map(p =>
                `<a href="${sl[p.key]}" target="_blank" class="dcc-social-pill" style="background:${p.color}20;color:${p.color};border-color:${p.color}40">
                    <i class="${p.icon}"></i> ${p.label}
                </a>`
            ).join('') + platforms.filter(p => !sl[p.key]).map(p =>
                `<span class="dcc-social-pill unset"><i class="${p.icon}"></i> ${p.label}</span>`
            ).join('');
        } else {
            socialEl.innerHTML = '<span style="color:var(--text-muted);font-size:0.82rem">No social links configured yet</span>';
        }
    }
    if (socialCount) {
        socialCount.textContent = `${connectedPlatforms.length} of ${platforms.length} connected`;
        socialCount.style.color = connectedPlatforms.length > 0 ? 'var(--success)' : 'var(--text-muted)';
    }

    // Contact Info
    const c = s.contact || siteContent.contact || {};
    const cPhone = document.getElementById('dash-c-phone');
    const cEmail = document.getElementById('dash-c-email');
    const cAddr  = document.getElementById('dash-c-addr');
    if (cPhone) cPhone.textContent = c.phone || 'Not set';
    if (cEmail) cEmail.textContent = c.email || 'Not set';
    if (cAddr)  cAddr.textContent  = c.address ? (c.address.length > 50 ? c.address.substring(0, 50) + '…' : c.address) : 'Not set';

    // Quote stats
    try {
        const r = await fetch('/api/admin/quotes');
        if (r.status === 401) return;
        const data = await r.json();
        if (!data.success) return;
        const quotes = data.quotes || [];
        const unread = quotes.filter(q => !q.read).length;

        const su = document.getElementById('stat-unread'); if (su) su.textContent = unread;
        const st = document.getElementById('stat-total');  if (st) st.textContent = quotes.length;

        // Nav badge
        const nb = document.getElementById('nav-unread-badge');
        if (nb) { nb.textContent = unread; nb.style.display = unread > 0 ? 'inline-flex' : 'none'; }

        // Unread card pulse
        const card = document.getElementById('dash-unread-card');
        if (card) card.classList.toggle('has-unread', unread > 0);

        // Recent quotes preview
        renderRecentQuotes(quotes.slice(0, 4));
    } catch (e) { /* silent */ }
}

function renderRecentQuotes(quotes) {
    const el = document.getElementById('dash-recent-quotes');
    if (!el) return;
    if (!quotes.length) {
        el.innerHTML = '<div class="empty-state" style="padding:40px 20px"><i class="fas fa-inbox"></i><p>No quote requests yet</p></div>';
        return;
    }
    el.innerHTML = quotes.map(q => `
        <div class="dash-recent-row ${q.read ? '' : 'dash-recent-unread'}">
            <div class="drr-avatar">${esc(q.name).charAt(0).toUpperCase()}</div>
            <div class="drr-info">
                <div class="drr-name">${esc(q.name)} ${!q.read ? '<span class="badge-new">NEW</span>' : ''}</div>
                <div class="drr-meta"><i class="fas fa-tag"></i> ${esc(q.service)} &nbsp;·&nbsp; <i class="fas fa-phone"></i> ${esc(q.phone)}</div>
            </div>
            <div class="drr-time">${new Date(q.timestamp).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</div>
            <div class="drr-actions">
                <a href="mailto:${esc(q.email)}" class="drr-btn" title="Reply"><i class="fas fa-reply"></i></a>
                ${!q.read ? `<button class="drr-btn success" onclick="markRead(${q.id})" title="Mark Read"><i class="fas fa-check"></i></button>` : ''}
            </div>
        </div>`).join('') +
        `<div style="padding:14px 20px;border-top:1px solid var(--border);text-align:center">
            <button class="btn btn-outline btn-sm" onclick="switchTab('quotes')"><i class="fas fa-list"></i> View All Requests</button>
        </div>`;
}

// ===== QUICK TOGGLES (Dashboard) =====
async function quickToggleWA(enabled) {
    if (!siteContent.settings) siteContent.settings = {};
    siteContent.settings.whatsappEnabled = enabled;
    await quickSave();
    const el = document.getElementById('dash-wa-status');
    const waNum = siteContent.settings.whatsapp;
    if (el) {
        el.textContent = enabled && waNum ? 'Active on website' : 'Disabled';
        el.style.color = enabled && waNum ? 'var(--success)' : 'var(--danger)';
    }
}

async function quickToggleChat(enabled) {
    if (!siteContent.settings) siteContent.settings = {};
    if (!siteContent.settings.chat) siteContent.settings.chat = { code: '' };
    siteContent.settings.chat.enabled = enabled;
    await quickSave();
    const el = document.getElementById('dash-chat-status');
    if (el) { el.textContent = enabled ? 'Active on website' : 'Inactive'; el.style.color = enabled ? 'var(--success)' : 'var(--text-muted)'; }
}

async function quickSave() {
    try {
        const r = await fetch('/api/admin/update-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(siteContent)
        });
        const data = await r.json();
        if (data.success) {
            showToast('Saved — changes are live!');
            const ls = document.getElementById('last-save');
            if (ls) ls.textContent = 'Saved at ' + new Date().toLocaleTimeString();
        } else {
            showToast('Save failed', 'error');
        }
    } catch(e) { showToast('Connection error', 'error'); }
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
            const ls = document.getElementById('last-save');
            if (ls) ls.textContent = 'Saved at ' + new Date().toLocaleTimeString();
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
startClock();
loadContent();
loadQuotes();
