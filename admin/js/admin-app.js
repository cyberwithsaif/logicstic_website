// ===== STATE =====
let siteContent = {};

// ===== ADMIN LIVE CHAT STATE =====
let adminSocket     = null;
let chatSessions    = {};        // sessionId → session object
let activeChatId    = null;      // currently open conversation
let totalChatUnread = 0;
let adminTypingTimer= null;

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
    quotes:    ['Quote Requests', 'Manage incoming quote requests'],
    chat:      ['Live Chat', 'Real-time chat with website visitors'],
    clients:   ['Client Logos', 'Manage the marquee of client logos shown on the homepage'],
    projects:  ['Project Portfolio', 'Manage case studies and project showcase on the website'],
    settings:  ['Settings', 'Configure website options — changes go live on save']
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
    if (tab === 'quotes')   loadQuotes();
    if (tab === 'chat')     initAdminChat();
    if (tab === 'clients')  renderClientRows(siteContent.clients || []);
    if (tab === 'projects') renderProjectRows(siteContent.projects || []);
    // Persist active tab so page refresh stays on same tab
    history.replaceState(null, '', '#' + tab);
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
        // Restore tab AFTER content is loaded so data is available
        const valid = ['dashboard','quotes','chat','clients','settings'];
        const hash = location.hash.slice(1);
        if (hash && valid.includes(hash)) switchTab(hash);
    } catch (e) {
        console.error('Load error:', e);
        showToast('Failed to load content from server', 'error');
    }
}

// ===== POPULATE SETTINGS =====
function populateSettings() {
    const s = siteContent.settings || {};

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

    // Pre-render list tabs so data is ready when user switches to them
    renderClientRows(siteContent.clients || []);
    renderProjectRows(siteContent.projects || []);
}

// ===== CLIENTS MANAGEMENT =====
let _editingClientIdx = -1;

function renderClientRows(clients) {
    const el = document.getElementById('clients-list');
    if (!el) return;
    if (!clients.length) {
        el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:12px 0">No clients yet. Click <strong>Add Client</strong> to add one.</p>';
        return;
    }
    el.innerHTML = clients.map((c, i) => `
        <div class="client-admin-row" data-index="${i}">
            <div class="car-preview">
                <img src="${esc(c.logo)}" alt="" class="car-logo-img" onerror="this.style.opacity=0.2">
            </div>
            <input type="hidden" class="car-logo" value="${esc(c.logo)}">
            <input type="hidden" class="car-name" value="${esc(c.name)}">
            <div class="car-info">
                <div class="car-name-display">${esc(c.name)}</div>
                <div class="car-logo-display">${esc(c.logo)}</div>
            </div>
            <button class="btn btn-outline btn-sm car-edit-btn" onclick="openClientEdit(${i})">
                <i class="fas fa-pen"></i> Edit
            </button>
        </div>`).join('');
}

function addClientRow() {
    const el = document.getElementById('clients-list');
    if (!el) return;
    const empty = el.querySelector('p');
    if (empty) empty.remove();
    // Open modal for a new (empty) entry
    _editingClientIdx = -1;
    document.getElementById('cme-logo').value = '';
    document.getElementById('cme-name').value = '';
    const prev = document.getElementById('cme-preview');
    prev.src = ''; prev.style.opacity = '0.2';
    document.getElementById('client-modal').style.display = 'flex';
    document.getElementById('cme-name').focus();
}

function openClientEdit(index) {
    _editingClientIdx = index;
    const rows = document.querySelectorAll('#clients-list .client-admin-row');
    const row = rows[index];
    if (!row) return;
    const logo = row.querySelector('.car-logo').value;
    const name = row.querySelector('.car-name').value;
    document.getElementById('cme-logo').value = logo;
    document.getElementById('cme-name').value = name;
    const prev = document.getElementById('cme-preview');
    prev.src = logo || ''; prev.style.opacity = logo ? '1' : '0.2';
    document.getElementById('client-modal').style.display = 'flex';
}

function closeClientModal() {
    document.getElementById('client-modal').style.display = 'none';
    _editingClientIdx = -1;
}

function saveClientFromModal() {
    const logo = document.getElementById('cme-logo').value.trim();
    const name = document.getElementById('cme-name').value.trim();
    if (!logo || !name) { showToast('Logo URL and name are required', 'error'); return; }
    const el = document.getElementById('clients-list');
    if (_editingClientIdx >= 0) {
        // Update existing row
        const rows = el.querySelectorAll('.client-admin-row');
        const row = rows[_editingClientIdx];
        if (row) {
            row.querySelector('.car-logo').value = logo;
            row.querySelector('.car-name').value = name;
            row.querySelector('.car-logo-img').src = logo;
            row.querySelector('.car-logo-img').style.opacity = '1';
            row.querySelector('.car-name-display').textContent = name;
            row.querySelector('.car-logo-display').textContent = logo;
        }
    } else {
        // Add new row
        const idx = el.querySelectorAll('.client-admin-row').length;
        const div = document.createElement('div');
        div.className = 'client-admin-row';
        div.dataset.index = idx;
        div.innerHTML = `
            <div class="car-preview">
                <img src="${esc(logo)}" alt="" class="car-logo-img" onerror="this.style.opacity=0.2">
            </div>
            <input type="hidden" class="car-logo" value="${esc(logo)}">
            <input type="hidden" class="car-name" value="${esc(name)}">
            <div class="car-info">
                <div class="car-name-display">${esc(name)}</div>
                <div class="car-logo-display">${esc(logo)}</div>
            </div>
            <button class="btn btn-outline btn-sm car-edit-btn" onclick="openClientEdit(${idx})">
                <i class="fas fa-pen"></i> Edit
            </button>`;
        el.appendChild(div);
    }
    closeClientModal();
}

function deleteClientFromModal() {
    if (!confirm('Delete this client?')) return;
    const rows = document.querySelectorAll('#clients-list .client-admin-row');
    const row = rows[_editingClientIdx];
    if (row) row.remove();
    const el = document.getElementById('clients-list');
    if (el && !el.querySelector('.client-admin-row')) {
        el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:12px 0">No clients yet. Click <strong>Add Client</strong> to add one.</p>';
    }
    closeClientModal();
}

function handleLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const status = document.getElementById('cme-upload-status');
    status.textContent = 'Uploading…';
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const r = await fetch('/api/admin/upload-logo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file.name, data: e.target.result })
            });
            const data = await r.json();
            if (data.success) {
                document.getElementById('cme-logo').value = data.path;
                const prev = document.getElementById('cme-preview');
                prev.src = data.path; prev.style.opacity = '1';
                status.textContent = 'Uploaded!';
                status.style.color = 'var(--success)';
            } else {
                status.textContent = 'Failed: ' + (data.message || 'error');
                status.style.color = 'var(--danger)';
            }
        } catch(err) {
            status.textContent = 'Upload error';
            status.style.color = 'var(--danger)';
        }
        input.value = '';
    };
    reader.readAsDataURL(file);
}

async function saveClients() {
    const rows = document.querySelectorAll('#clients-list .client-admin-row');
    siteContent.clients = Array.from(rows).map(r => ({
        logo: (r.querySelector('.car-logo')?.value || '').trim(),
        name: (r.querySelector('.car-name')?.value || '').trim()
    })).filter(c => c.logo && c.name);
    try {
        const r = await fetch('/api/admin/update-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(siteContent)
        });
        const data = await r.json();
        if (data.success) {
            showToast('Clients saved! Changes are now live on the website.');
        } else {
            showToast(data.message || 'Save failed', 'error');
        }
    } catch(e) { showToast('Connection error', 'error'); }
}

// ===== PROJECTS MANAGEMENT =====
let _editingProjectIdx = -1;

function renderProjectRows(projects) {
    const el = document.getElementById('projects-list');
    if (!el) return;
    if (!projects.length) {
        el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:12px 0">No projects yet. Click <strong>Add Project</strong> to add one.</p>';
        return;
    }
    el.innerHTML = projects.map((p, i) => `
        <div class="client-admin-row" data-index="${i}" data-id="${p.id || i+1}">
            <div class="car-preview" style="width:80px;height:56px">
                <img src="${esc(p.image)}" alt="" class="car-logo-img" onerror="this.style.opacity=0.2">
            </div>
            <input type="hidden" class="prj-image"       value="${esc(p.image||'')}">
            <input type="hidden" class="prj-title"       value="${esc(p.title||'')}">
            <input type="hidden" class="prj-category"    value="${esc(p.category||'')}">
            <input type="hidden" class="prj-description" value="${esc(p.description||'')}">
            <input type="hidden" class="prj-client"      value="${esc(p.client||'')}">
            <input type="hidden" class="prj-location"    value="${esc(p.location||'')}">
            <input type="hidden" class="prj-year"        value="${esc(p.year||'')}">
            <div class="car-info">
                <div class="car-name-display">${esc(p.title)}</div>
                <div class="car-logo-display">
                    <span style="color:var(--secondary);font-size:0.7rem">${esc(p.category)}</span>
                    ${p.year     ? `<span style="color:var(--text-muted);font-size:0.7rem"> · ${esc(p.year)}</span>` : ''}
                    ${p.client   ? `<span style="color:var(--text-muted);font-size:0.7rem"> · ${esc(p.client)}</span>` : ''}
                    ${p.location ? `<span style="color:var(--text-muted);font-size:0.7rem"> · ${esc(p.location)}</span>` : ''}
                </div>
            </div>
            <button class="btn btn-outline btn-sm car-edit-btn" onclick="openProjectEdit(${i})">
                <i class="fas fa-pen"></i> Edit
            </button>
        </div>`).join('');
}

function addProjectRow() {
    _editingProjectIdx = -1;
    ['cpm-image','cpm-title','cpm-category','cpm-year','cpm-description','cpm-client','cpm-location'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    const prev = document.getElementById('cpm-preview');
    if (prev) { prev.src = ''; prev.style.opacity = '0.2'; }
    const st = document.getElementById('cpm-upload-status'); if (st) { st.textContent = ''; }
    document.getElementById('project-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('cpm-title')?.focus(), 50);
}

function openProjectEdit(index) {
    _editingProjectIdx = index;
    const rows = document.querySelectorAll('#projects-list .client-admin-row');
    const row = rows[index];
    if (!row) return;
    const get = cls => row.querySelector(cls)?.value || '';
    document.getElementById('cpm-image').value       = get('.prj-image');
    document.getElementById('cpm-title').value       = get('.prj-title');
    document.getElementById('cpm-category').value    = get('.prj-category');
    document.getElementById('cpm-year').value        = get('.prj-year');
    document.getElementById('cpm-description').value = get('.prj-description');
    document.getElementById('cpm-client').value      = get('.prj-client');
    document.getElementById('cpm-location').value    = get('.prj-location');
    const img = get('.prj-image');
    const prev = document.getElementById('cpm-preview');
    prev.src = img; prev.style.opacity = img ? '1' : '0.2';
    const st = document.getElementById('cpm-upload-status'); if (st) st.textContent = '';
    document.getElementById('project-modal').style.display = 'flex';
}

function closeProjectModal() {
    document.getElementById('project-modal').style.display = 'none';
    _editingProjectIdx = -1;
}

function saveProjectFromModal() {
    const image       = document.getElementById('cpm-image').value.trim();
    const title       = document.getElementById('cpm-title').value.trim();
    const category    = document.getElementById('cpm-category').value.trim();
    const description = document.getElementById('cpm-description').value.trim();
    const year        = document.getElementById('cpm-year').value.trim();
    const client      = document.getElementById('cpm-client').value.trim();
    const location    = document.getElementById('cpm-location').value.trim();
    if (!title || !category || !description) {
        showToast('Title, category and description are required', 'error'); return;
    }
    const el = document.getElementById('projects-list');
    const metaHtml = () => `
        <span style="color:var(--secondary);font-size:0.7rem">${esc(category)}</span>
        ${year     ? `<span style="color:var(--text-muted);font-size:0.7rem"> · ${esc(year)}</span>` : ''}
        ${client   ? `<span style="color:var(--text-muted);font-size:0.7rem"> · ${esc(client)}</span>` : ''}
        ${location ? `<span style="color:var(--text-muted);font-size:0.7rem"> · ${esc(location)}</span>` : ''}`;

    if (_editingProjectIdx >= 0) {
        const row = el.querySelectorAll('.client-admin-row')[_editingProjectIdx];
        if (row) {
            row.querySelector('.prj-image').value       = image;
            row.querySelector('.prj-title').value       = title;
            row.querySelector('.prj-category').value    = category;
            row.querySelector('.prj-description').value = description;
            row.querySelector('.prj-year').value        = year;
            row.querySelector('.prj-client').value      = client;
            row.querySelector('.prj-location').value    = location;
            const imgEl = row.querySelector('.car-logo-img');
            imgEl.src = image; imgEl.style.opacity = image ? '1' : '0.3';
            row.querySelector('.car-name-display').textContent = title;
            row.querySelector('.car-logo-display').innerHTML   = metaHtml();
        }
    } else {
        const idx = el.querySelectorAll('.client-admin-row').length;
        const div = document.createElement('div');
        div.className = 'client-admin-row';
        div.dataset.index = idx;
        div.dataset.id    = Date.now();
        div.innerHTML = `
            <div class="car-preview" style="width:80px;height:56px">
                <img src="${esc(image)}" alt="" class="car-logo-img" onerror="this.style.opacity=0.2">
            </div>
            <input type="hidden" class="prj-image"       value="${esc(image)}">
            <input type="hidden" class="prj-title"       value="${esc(title)}">
            <input type="hidden" class="prj-category"    value="${esc(category)}">
            <input type="hidden" class="prj-description" value="${esc(description)}">
            <input type="hidden" class="prj-client"      value="${esc(client)}">
            <input type="hidden" class="prj-location"    value="${esc(location)}">
            <input type="hidden" class="prj-year"        value="${esc(year)}">
            <div class="car-info">
                <div class="car-name-display">${esc(title)}</div>
                <div class="car-logo-display">${metaHtml()}</div>
            </div>
            <button class="btn btn-outline btn-sm car-edit-btn" onclick="openProjectEdit(${idx})">
                <i class="fas fa-pen"></i> Edit
            </button>`;
        const empty = el.querySelector('p');
        if (empty) empty.remove();
        el.appendChild(div);
    }
    closeProjectModal();
}

function deleteProjectFromModal() {
    if (!confirm('Delete this project?')) return;
    const rows = document.querySelectorAll('#projects-list .client-admin-row');
    const row  = rows[_editingProjectIdx];
    if (row) row.remove();
    const el = document.getElementById('projects-list');
    if (el && !el.querySelector('.client-admin-row')) {
        el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:12px 0">No projects yet. Click <strong>Add Project</strong> to add one.</p>';
    }
    closeProjectModal();
}

function handleProjectImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const status = document.getElementById('cpm-upload-status');
    status.textContent = 'Uploading…';
    status.style.color = 'var(--text-muted)';
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const r = await fetch('/api/admin/upload-project-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file.name, data: e.target.result })
            });
            const data = await r.json();
            if (data.success) {
                document.getElementById('cpm-image').value = data.path;
                const prev = document.getElementById('cpm-preview');
                prev.src = data.path; prev.style.opacity = '1';
                status.textContent = 'Uploaded!';
                status.style.color = 'var(--success)';
            } else {
                status.textContent = 'Failed: ' + (data.message || 'error');
                status.style.color = 'var(--danger)';
            }
        } catch(err) {
            status.textContent = 'Upload error';
            status.style.color = 'var(--danger)';
        }
        input.value = '';
    };
    reader.readAsDataURL(file);
}

async function saveProjects() {
    const rows = document.querySelectorAll('#projects-list .client-admin-row');
    siteContent.projects = Array.from(rows).map((r, i) => ({
        id:          parseInt(r.dataset.id) || (i + 1),
        image:       (r.querySelector('.prj-image')?.value       || '').trim(),
        title:       (r.querySelector('.prj-title')?.value       || '').trim(),
        category:    (r.querySelector('.prj-category')?.value    || '').trim(),
        description: (r.querySelector('.prj-description')?.value || '').trim(),
        year:        (r.querySelector('.prj-year')?.value        || '').trim(),
        client:      (r.querySelector('.prj-client')?.value      || '').trim(),
        location:    (r.querySelector('.prj-location')?.value    || '').trim()
    })).filter(p => p.title && p.category && p.description);
    try {
        const r = await fetch('/api/admin/update-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(siteContent)
        });
        const data = await r.json();
        if (data.success) {
            showToast('Projects saved! Changes are now live on the website.');
            const ls = document.getElementById('last-save');
            if (ls) ls.textContent = 'Saved at ' + new Date().toLocaleTimeString();
        } else {
            showToast(data.message || 'Save failed', 'error');
        }
    } catch(e) { showToast('Connection error', 'error'); }
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
    // Guards: never let saveSettings wipe clients or projects
    if (!Array.isArray(siteContent.clients) || siteContent.clients.length === 0) {
        const rows = document.querySelectorAll('#clients-list .client-admin-row');
        if (rows.length) {
            siteContent.clients = Array.from(rows).map(r => ({
                logo: (r.querySelector('.car-logo')?.value || '').trim(),
                name: (r.querySelector('.car-name')?.value || '').trim()
            })).filter(c => c.logo && c.name);
        }
    }
    if (!Array.isArray(siteContent.projects) || siteContent.projects.length === 0) {
        const rows = document.querySelectorAll('#projects-list .client-admin-row');
        if (rows.length) {
            siteContent.projects = Array.from(rows).map((r, i) => ({
                id: i + 1,
                image:       (r.querySelector('.prj-image')?.value || '').trim(),
                title:       (r.querySelector('.prj-title')?.value || '').trim(),
                category:    (r.querySelector('.prj-category')?.value || '').trim(),
                description: (r.querySelector('.prj-description')?.value || '').trim(),
                year:        (r.querySelector('.prj-year')?.value || '').trim(),
                client:      (r.querySelector('.prj-client')?.value || '').trim(),
                location:    (r.querySelector('.prj-location')?.value || '').trim()
            })).filter(p => p.title && p.category);
        }
    }
    const s = siteContent.settings;

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

// ═══════════════════════════════════════════════════════════════
//  ADMIN LIVE CHAT
// ═══════════════════════════════════════════════════════════════
let chatInitialized = false;

function initAdminChat() {
    if (chatInitialized) return;
    chatInitialized = true;

    // Load Socket.IO client
    if (!window.io) {
        const s = document.createElement('script');
        s.src = '/socket.io/socket.io.js';
        s.onload = connectAdminSocket;
        document.head.appendChild(s);
    } else {
        connectAdminSocket();
    }
}

function connectAdminSocket() {
    adminSocket = window.io({ transports: ['websocket', 'polling'] });

    adminSocket.on('connect', () => {
        setConnStatus(true);
        adminSocket.emit('admin:auth');
    });

    adminSocket.on('admin:ready', ({ sessions }) => {
        chatSessions = {};
        sessions.forEach(s => chatSessions[s.id] = s);
        renderSessionList();
        updateChatNavBadge();
    });

    adminSocket.on('admin:auth-fail', () => {
        setConnStatus(false);
        showToast('Chat auth failed — please re-login', 'error');
    });

    // New visitor joined
    adminSocket.on('chat:visitor-joined', (session) => {
        chatSessions[session.id] = session;
        renderSessionList();
        showToast(`New visitor: ${session.username} (${session.ip})`, 'success');
    });

    // Visitor left
    adminSocket.on('chat:visitor-left', (sessionId) => {
        if (chatSessions[sessionId]) {
            chatSessions[sessionId].active = false;
            renderSessionList();
            if (activeChatId === sessionId) renderChatHeader(sessionId);
        }
    });

    // Visitor sent a message
    adminSocket.on('chat:new-message', ({ sessionId, msg, unread }) => {
        if (!chatSessions[sessionId]) return;
        chatSessions[sessionId].messages.push(msg);
        chatSessions[sessionId].unread = unread;
        renderSessionList();

        if (activeChatId === sessionId) {
            appendAdminMsg(msg, sessionId);
            adminSocket.emit('admin:read', sessionId);
            chatSessions[sessionId].unread = 0;
            renderSessionList();
        }

        totalChatUnread = Object.values(chatSessions).reduce((a, s) => a + (s.unread || 0), 0);
        updateChatNavBadge();

        // Notification sound
        playNotif();
    });

    // Admin reply echo (from other tabs / multi-admin)
    adminSocket.on('chat:reply-sent', ({ sessionId, msg }) => {
        if (!chatSessions[sessionId]) return;
        chatSessions[sessionId].messages.push(msg);
        if (activeChatId === sessionId) appendAdminMsg(msg, sessionId);
    });

    // Visitor typing
    adminSocket.on('chat:visitor-typing', ({ sessionId, isTyping }) => {
        if (activeChatId !== sessionId) return;
        const te = document.getElementById('ca-typing-indicator');
        if (te) te.style.display = isTyping ? 'flex' : 'none';
        scrollChatToBottom();
    });

    // Session read ack
    adminSocket.on('chat:session-read', (sessionId) => {
        if (chatSessions[sessionId]) chatSessions[sessionId].unread = 0;
        renderSessionList();
        totalChatUnread = Object.values(chatSessions).reduce((a, s) => a + (s.unread || 0), 0);
        updateChatNavBadge();
    });

    adminSocket.on('disconnect', () => setConnStatus(false));
    adminSocket.on('connect_error', () => setConnStatus(false));
}

// ── RENDER SESSION LIST ──────────────────────────────────────────────────────
function renderSessionList(filter = '') {
    const el = document.getElementById('ca-sessions');
    if (!el) return;

    const sessions = Object.values(chatSessions)
        .filter(s => !filter || s.username.toLowerCase().includes(filter.toLowerCase()) || s.ip.includes(filter))
        .sort((a, b) => {
            if (a.active !== b.active) return b.active - a.active;
            const aLast = a.messages[a.messages.length - 1]?.ts || 0;
            const bLast = b.messages[b.messages.length - 1]?.ts || 0;
            return bLast - aLast;
        });

    const online = sessions.filter(s => s.active).length;
    const pill = document.getElementById('ca-online-count');
    if (pill) { pill.textContent = `${online} online`; pill.className = `ca-online-pill ${online > 0 ? 'has-online' : ''}`; }

    if (!sessions.length) {
        el.innerHTML = `<div class="ca-empty-sessions"><i class="fas fa-satellite-dish"></i><p>Waiting for visitors…</p></div>`;
        return;
    }

    el.innerHTML = sessions.map(s => {
        const last    = s.messages[s.messages.length - 1];
        const preview = last ? (last.from === 'admin' ? '↩ ' : '') + esc(last.text).substring(0, 40) : 'No messages yet';
        const timeAgo = last ? fmtTime(last.ts) : fmtTime(s.joinedAt);
        const isActive = s.id === activeChatId;
        return `
        <div class="ca-session-item ${isActive ? 'active' : ''} ${!s.active ? 'offline' : ''}"
             onclick="openChatSession('${s.id}')">
            <div class="ca-sess-avatar" style="background:${strColor(s.username)}">
                ${s.username.charAt(0)}
                <span class="ca-sess-dot ${s.active ? 'online' : 'offline'}"></span>
            </div>
            <div class="ca-sess-info">
                <div class="ca-sess-name">
                    ${esc(s.username)}
                    ${s.unread > 0 ? `<span class="ca-unread-badge">${s.unread}</span>` : ''}
                </div>
                <div class="ca-sess-preview">${preview}</div>
                <div class="ca-sess-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${esc(s.page)}</span>
                    <span>${timeAgo}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function filterSessions(val) { renderSessionList(val); }

// ── OPEN CONVERSATION ────────────────────────────────────────────────────────
function openChatSession(sessionId) {
    activeChatId = sessionId;
    const s = chatSessions[sessionId];
    if (!s) return;

    // Mark read
    s.unread = 0;
    adminSocket.emit('admin:read', sessionId);
    renderSessionList();
    totalChatUnread = Object.values(chatSessions).reduce((a, x) => a + (x.unread || 0), 0);
    updateChatNavBadge();

    const main = document.getElementById('ca-main');
    const isMobile = window.innerWidth <= 768;
    main.innerHTML = `
        <div class="ca-chat-header" id="ca-chat-header">
            ${isMobile ? `<button class="ca-back-btn" onclick="closeMobileChat()" title="Back"><i class="fas fa-arrow-left"></i></button>` : ''}
            <div class="ca-ch-avatar" style="background:${strColor(s.username)}">${s.username.charAt(0)}</div>
            <div class="ca-ch-info">
                <div class="ca-ch-name">${esc(s.username)}</div>
                <div class="ca-ch-meta">
                    <span><i class="fas fa-globe"></i> ${esc(s.ip)}</span>
                    <span><i class="fas fa-file"></i> ${esc(s.page)}</span>
                    <span id="ca-online-status" class="${s.active ? 'ca-status-online' : 'ca-status-offline'}">
                        <i class="fas fa-circle" style="font-size:.5rem"></i>
                        ${s.active ? 'Online' : 'Disconnected'}
                    </span>
                </div>
            </div>
            <button class="ca-clear-btn" onclick="clearChatSession('${sessionId}')" title="Remove session">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="ca-messages" id="ca-messages"></div>
        <div class="ca-typing-indicator" id="ca-typing-indicator" style="display:none">
            <span class="ca-typing-dots"><span></span><span></span><span></span></span>
            <span style="font-size:.72rem;color:var(--text-muted)">${esc(s.username)} is typing…</span>
        </div>
        <div class="ca-input-area">
            <textarea id="ca-input" placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
                ${!s.active ? 'disabled' : ''}></textarea>
            <button id="ca-send-btn" onclick="sendAdminReply()" ${!s.active ? 'disabled' : ''}>
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>`;

    // Render history
    const msgEl = document.getElementById('ca-messages');
    if (s.messages.length) {
        s.messages.forEach(m => appendAdminMsg(m, sessionId, true));
    } else {
        msgEl.innerHTML = `<div class="ca-msgs-empty"><i class="fas fa-comment-slash"></i><p>No messages yet. Visitor hasn't sent anything.</p></div>`;
    }
    scrollChatToBottom();

    // Slide in on mobile
    if (isMobile) main.classList.add('mobile-open');

    // Input events
    const inp = document.getElementById('ca-input');
    if (inp) {
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminReply(); }
        });
        inp.addEventListener('input', () => {
            inp.style.height = 'auto';
            inp.style.height = Math.min(inp.scrollHeight, 100) + 'px';
            adminSocket.emit('admin:typing', { sessionId, isTyping: !!inp.value.trim() });
            clearTimeout(adminTypingTimer);
            adminTypingTimer = setTimeout(() => adminSocket.emit('admin:typing', { sessionId, isTyping: false }), 1500);
        });
    }
}

// ── MOBILE BACK (return to session list) ─────────────────────────────────────
function closeMobileChat() {
    const main = document.getElementById('ca-main');
    if (main) main.classList.remove('mobile-open');
    activeChatId = null;
    renderSessionList();
}

// ── SEND REPLY ───────────────────────────────────────────────────────────────
function sendAdminReply() {
    const inp = document.getElementById('ca-input');
    if (!inp || !activeChatId) return;
    const text = inp.value.trim();
    if (!text) return;
    adminSocket.emit('admin:reply', { sessionId: activeChatId, text });
    adminSocket.emit('admin:typing', { sessionId: activeChatId, isTyping: false });
    inp.value = '';
    inp.style.height = 'auto';
}

// ── APPEND MESSAGE ───────────────────────────────────────────────────────────
function appendAdminMsg(msg, sessionId, bulk = false) {
    const msgEl = document.getElementById('ca-messages');
    if (!msgEl) return;
    const emptyEl = msgEl.querySelector('.ca-msgs-empty');
    if (emptyEl) emptyEl.remove();
    const div = document.createElement('div');
    div.className = `ca-msg ${msg.from === 'admin' ? 'ca-msg-admin' : 'ca-msg-visitor'}`;
    const time = new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `
        <div class="ca-msg-bubble">${esc(msg.text).replace(/\n/g,'<br>')}</div>
        <div class="ca-msg-time">${msg.from === 'admin' ? 'You' : esc(chatSessions[sessionId]?.username || 'Visitor')} · ${time}</div>`;
    msgEl.appendChild(div);
    if (!bulk) scrollChatToBottom();
}

function scrollChatToBottom() {
    const el = document.getElementById('ca-messages');
    if (el) el.scrollTop = el.scrollHeight;
}

// ── REMOVE SESSION ───────────────────────────────────────────────────────────
function clearChatSession(sessionId) {
    if (!confirm('Remove this conversation?')) return;
    delete chatSessions[sessionId];
    if (activeChatId === sessionId) {
        activeChatId = null;
        const main = document.getElementById('ca-main');
        if (main) main.innerHTML = `<div class="ca-no-chat"><div class="ca-no-chat-inner"><i class="fas fa-comments"></i><h3>No conversation selected</h3><p>Click a visitor on the left to start chatting</p></div></div>`;
    }
    renderSessionList();
    updateChatNavBadge();
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function setConnStatus(online) {
    const el = document.getElementById('ca-conn-status');
    if (el) { el.className = `ca-conn-dot ${online ? 'online' : 'offline'}`; el.title = online ? 'Connected' : 'Disconnected'; }
}

function updateChatNavBadge() {
    const b = document.getElementById('nav-chat-badge');
    if (b) { b.textContent = totalChatUnread; b.style.display = totalChatUnread > 0 ? 'inline-flex' : 'none'; }
    // Dashboard stat card
    const dashNum  = document.getElementById('stat-chat-unread');
    const dashCard = document.getElementById('dash-unread-chat-card');
    if (dashNum)  dashNum.textContent = totalChatUnread;
    if (dashCard) dashCard.classList.toggle('has-unread', totalChatUnread > 0);
}

function fmtTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function strColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `hsl(${h},55%,35%)`;
}

function playNotif() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        let count = 0;
        function beep() {
            if (count >= 3) { setTimeout(() => ctx.close(), 500); return; }
            count++;
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.frequency.value = 880; o.type = 'sine';
            g.gain.setValueAtTime(0.15, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.45);
            setTimeout(beep, 1000);
        }
        beep();
    } catch(e) {}
}

function renderChatHeader(sessionId) {
    const s = chatSessions[sessionId];
    const el = document.getElementById('ca-online-status');
    if (!el || !s) return;
    el.className = s.active ? 'ca-status-online' : 'ca-status-offline';
    el.innerHTML = `<i class="fas fa-circle" style="font-size:.5rem"></i> ${s.active ? 'Online' : 'Disconnected'}`;
}

// ===== INIT =====
startClock();
loadContent();
loadQuotes();
initAdminChat(); // connect socket on load so nav badge updates immediately

// Dashboard live refresh every 30 seconds
setInterval(async () => {
    try {
        const r = await fetch('/api/admin/quotes', { cache: 'no-store' });
        if (!r.ok) return;
        const data = await r.json();
        if (!data.success) return;
        const quotes = data.quotes || [];
        const unread = quotes.filter(q => !q.read).length;
        const su = document.getElementById('stat-unread');
        const st = document.getElementById('stat-total');
        const nb = document.getElementById('nav-unread-badge');
        if (su) su.textContent = unread;
        if (st) st.textContent = quotes.length;
        if (nb) { nb.textContent = unread; nb.style.display = unread > 0 ? 'inline-flex' : 'none'; }
        if (document.getElementById('tab-dashboard')?.classList.contains('active')) {
            renderRecentQuotes(quotes.slice().reverse().slice(0, 5));
        }
    } catch(e) {}
}, 30000);
