// ===== GLOBAL STATE =====
let siteContent = {};
const serviceKeys = ['transformer', 'contract', 'general', 'international'];
let activeServiceKey = 'transformer';

const tabTitles = {
    dashboard: 'Dashboard',
    homepage: 'Homepage Editor',
    projects: 'Project Portfolio',
    services: 'Service Management',
    industries: 'Industry Sectors',
    contact: 'Contact Information',
    inquiries: 'Quote Inquiries',
    settings: 'Global Settings'
};

// ===== TOAST =====
function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2500);
}

// ===== TAB NAVIGATION =====
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        const target = document.getElementById(`tab-${tab}`);
        if (target) target.classList.add('active');
        document.getElementById('page-title').textContent = tabTitles[tab] || tab;
        document.getElementById('page-subtitle').textContent = tab === 'dashboard' ? 'Welcome back, Administrator' : 'Manage your website content';
        if (tab === 'services' && !document.getElementById('service-transformer-title')) renderServiceEditor();
        if (tab === 'dashboard') updateDashboardStats();
    });
});

// ===== MODALS =====
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// ===== LOAD CONTENT =====
async function loadContent() {
    try {
        const r = await fetch('/api/content', { cache: 'no-store' });
        siteContent = await r.json();
        if (!siteContent.about) siteContent.about = { title: '', description1: '', description2: '', features: [] };
        if (!siteContent.services) siteContent.services = {};
        if (!siteContent.industries) siteContent.industries = [];
        if (!siteContent.settings) siteContent.settings = {};
        populateAll();
        updateDashboardStats();
    } catch (e) { console.error('Load error:', e); showToast('Failed to load content', 'error'); }
}

// ===== POPULATE ALL =====
function populateAll() {
    // Hero
    const ht = document.getElementById('hero-title'); if (ht) ht.value = siteContent.hero?.title || '';
    const hs = document.getElementById('hero-subtitle'); if (hs) hs.value = siteContent.hero?.subtitle || '';

    // Stats
    const sc = document.getElementById('stats-container');
    if (sc && siteContent.hero?.stats) {
        sc.innerHTML = siteContent.hero.stats.map((s, i) => `
            <div class="form-group">
                <label>${s.label}</label>
                <input type="text" value="${s.value}" onchange="updateStat(${i}, this.value)" class="form-input">
            </div>`).join('');
    }

    // About
    const at = document.getElementById('about-title'); if (at) at.value = siteContent.about?.title || '';
    const ad1 = document.getElementById('about-desc1'); if (ad1) ad1.value = siteContent.about?.description1 || '';
    const ad2 = document.getElementById('about-desc2'); if (ad2) ad2.value = siteContent.about?.description2 || '';
    renderAboutFeatures();

    // Projects
    renderProjects();

    // Industries
    renderIndustries();

    // Contact
    const ca = document.getElementById('contact-address'); if (ca) ca.value = siteContent.contact?.address || '';
    const cp = document.getElementById('contact-phone'); if (cp) cp.value = siteContent.contact?.phone || '';
    const ce = document.getElementById('contact-email'); if (ce) ce.value = siteContent.contact?.email || '';

    // Settings
    const st = document.getElementById('setting-site-title'); if (st) st.value = siteContent.settings?.siteTitle || '';
    const sm = document.getElementById('setting-meta-desc'); if (sm) sm.value = siteContent.settings?.metaDesc || '';
    const sl = document.getElementById('setting-linkedin'); if (sl) sl.value = siteContent.settings?.linkedin || '';
    const sx = document.getElementById('setting-twitter'); if (sx) sx.value = siteContent.settings?.twitter || '';
    const sw = document.getElementById('setting-whatsapp'); if (sw) sw.value = siteContent.settings?.whatsapp || '';
}

// ===== STATS =====
function updateStat(idx, val) { if (siteContent.hero?.stats) siteContent.hero.stats[idx].value = val; }

function updateDashboardStats() {
    const sp = document.getElementById('stat-projects'); if (sp) sp.textContent = (siteContent.projects || []).length;
    const si = document.getElementById('stat-industries'); if (si) si.textContent = (siteContent.industries || []).length;
}

// ===== ABOUT FEATURES =====
function renderAboutFeatures() {
    const el = document.getElementById('about-features-list');
    if (!el) return;
    const feats = siteContent.about?.features || [];
    el.innerHTML = feats.map((f, i) => `
        <div class="feature-input-row">
            <input type="text" value="${f}" onchange="updateAboutFeature(${i}, this.value)" class="form-input">
            <button class="btn btn-danger btn-sm btn-icon" onclick="removeAboutFeature(${i})" title="Remove"><i class="fas fa-times"></i></button>
        </div>`).join('') + `
        <button class="btn btn-outline btn-sm" onclick="addAboutFeature()" style="margin-top:8px"><i class="fas fa-plus"></i> Add Feature</button>`;
}
function updateAboutFeature(i, v) { if (siteContent.about?.features) siteContent.about.features[i] = v; }
function addAboutFeature() { if (!siteContent.about) siteContent.about = { features: [] }; if (!siteContent.about.features) siteContent.about.features = []; siteContent.about.features.push('New Feature'); renderAboutFeatures(); }
function removeAboutFeature(i) { if (siteContent.about?.features) { siteContent.about.features.splice(i, 1); renderAboutFeatures(); } }

// ===== PROJECTS =====
function renderProjects() {
    const el = document.getElementById('projects-list');
    if (!el) return;
    const projs = siteContent.projects || [];
    if (!projs.length) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No projects yet. Click "Add Project" to create one.</p></div>';
    } else {
        el.innerHTML = projs.map(p => `
            <div class="list-item">
                <img src="../${p.image || 'images/logo.webp'}" class="list-item-thumb" onerror="this.src='../images/logo.webp'">
                <div class="list-item-info"><h4>${p.title}</h4><span>${p.category}</span><p>${p.description}</p></div>
                <div class="list-item-actions">
                    <button class="btn btn-outline btn-sm" onclick="editProject(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProject(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`).join('');
    }
}

function openProjectModal(id = null) {
    document.getElementById('project-modal-title').textContent = id ? 'Edit Project' : 'Add Project';
    if (id) {
        const p = siteContent.projects.find(x => x.id === id);
        if (p) {
            document.getElementById('modal-project-id').value = p.id;
            document.getElementById('modal-project-title-field').value = p.title;
            document.getElementById('modal-project-category').value = p.category;
            document.getElementById('modal-project-desc').value = p.description;
            document.getElementById('modal-project-image').value = p.image || '';
        }
    } else {
        document.getElementById('modal-project-id').value = '';
        document.getElementById('modal-project-title-field').value = '';
        document.getElementById('modal-project-category').value = '';
        document.getElementById('modal-project-desc').value = '';
        document.getElementById('modal-project-image').value = '';
    }
    openModal('project-modal');
}

function saveProject() {
    const id = parseInt(document.getElementById('modal-project-id').value) || null;
    const data = {
        id: id || Math.max(0, ...(siteContent.projects || []).map(p => p.id)) + 1,
        title: document.getElementById('modal-project-title-field').value.trim(),
        category: document.getElementById('modal-project-category').value.trim(),
        description: document.getElementById('modal-project-desc').value.trim(),
        image: document.getElementById('modal-project-image').value.trim() || 'images/logo.webp'
    };
    if (!data.title) { showToast('Title is required', 'error'); return; }
    if (!siteContent.projects) siteContent.projects = [];
    if (id) {
        const idx = siteContent.projects.findIndex(p => p.id === id);
        if (idx >= 0) siteContent.projects[idx] = data;
    } else {
        siteContent.projects.push(data);
    }
    closeModal('project-modal');
    renderProjects();
    showToast(id ? 'Project updated' : 'Project added');
}

function editProject(id) { openProjectModal(id); }
function deleteProject(id) {
    if (!confirm('Delete this project?')) return;
    siteContent.projects = (siteContent.projects || []).filter(p => p.id !== id);
    renderProjects();
    showToast('Project deleted');
}

// ===== SERVICES =====
function renderServiceEditor(key = null) {
    if (key) activeServiceKey = key;

    // Tab nav
    const nav = document.getElementById('service-tabs-nav');
    const labels = { transformer: 'Transformer', contract: 'Contract', general: 'General', international: 'International' };
    nav.innerHTML = serviceKeys.map(k =>
        `<button class="btn ${k === activeServiceKey ? 'btn-save' : 'btn-outline'} btn-sm" onclick="renderServiceEditor('${k}')">
            <i class="fas fa-${k === 'transformer' ? 'bolt' : k === 'contract' ? 'file-signature' : k === 'general' ? 'truck-fast' : 'ship'}"></i> ${labels[k]}
        </button>`).join('');

    const svc = siteContent.services?.[activeServiceKey] || { title: '', subtitle: '', description: '', features: [] };
    const area = document.getElementById('service-editor-area');
    area.innerHTML = `
        <div class="service-edit-card">
            <h3><i class="fas fa-edit"></i> ${labels[activeServiceKey]} Services</h3>
            <div class="form-row">
                <div class="form-group"><label>Page Title</label><input type="text" id="svc-title" class="form-input" value="${esc(svc.title)}"></div>
                <div class="form-group"><label>Subtitle</label><input type="text" id="svc-subtitle" class="form-input" value="${esc(svc.subtitle)}"></div>
            </div>
            <div class="form-group"><label>Description</label><textarea id="svc-desc" class="form-textarea" rows="3">${esc(svc.description)}</textarea></div>
            <div class="form-group"><label>Key Features</label>
                <div id="svc-features">${(svc.features || []).map((f, i) => `
                    <div class="feature-input-row">
                        <input type="text" value="${esc(f)}" onchange="updateServiceFeature(${i}, this.value)" class="form-input">
                        <button class="btn btn-danger btn-sm btn-icon" onclick="removeServiceFeature(${i})" title="Remove"><i class="fas fa-times"></i></button>
                    </div>`).join('')}</div>
                <button class="btn btn-outline btn-sm" onclick="addServiceFeature()" style="margin-top:8px"><i class="fas fa-plus"></i> Add Feature</button>
            </div>
        </div>`;
}

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function updateServiceFeature(i, v) {
    if (!siteContent.services) siteContent.services = {};
    if (!siteContent.services[activeServiceKey]) siteContent.services[activeServiceKey] = { features: [] };
    siteContent.services[activeServiceKey].features[i] = v;
}
function addServiceFeature() {
    if (!siteContent.services) siteContent.services = {};
    if (!siteContent.services[activeServiceKey]) siteContent.services[activeServiceKey] = { features: [] };
    if (!siteContent.services[activeServiceKey].features) siteContent.services[activeServiceKey].features = [];
    siteContent.services[activeServiceKey].features.push('New feature');
    renderServiceEditor(activeServiceKey);
}
function removeServiceFeature(i) {
    if (siteContent.services?.[activeServiceKey]?.features) {
        siteContent.services[activeServiceKey].features.splice(i, 1);
        renderServiceEditor(activeServiceKey);
    }
}

// ===== INDUSTRIES =====
function renderIndustries() {
    const el = document.getElementById('industries-list');
    if (!el) return;
    const inds = siteContent.industries || [];
    if (!inds.length) {
        el.innerHTML = '<div class="empty-state"><i class="fas fa-industry"></i><p>No industries yet. Click "Add Industry" to create one.</p></div>';
    } else {
        el.innerHTML = inds.map(i => `
            <div class="list-item">
                <img src="../${i.image || 'images/industry.webp'}" class="list-item-thumb" onerror="this.src='../images/logo.webp'">
                <div class="list-item-info"><h4>${i.name}</h4><span>Industry Sector</span></div>
                <div class="list-item-actions">
                    <button class="btn btn-outline btn-sm" onclick="editIndustry(${i.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteIndustry(${i.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`).join('');
    }
}

function openIndustryModal(id = null) {
    document.getElementById('industry-modal-title').textContent = id ? 'Edit Industry' : 'Add Industry';
    if (id) {
        const ind = (siteContent.industries || []).find(x => x.id === id);
        if (ind) {
            document.getElementById('modal-industry-id').value = ind.id;
            document.getElementById('modal-industry-name').value = ind.name;
            document.getElementById('modal-industry-image').value = ind.image || '';
        }
    } else {
        document.getElementById('modal-industry-id').value = '';
        document.getElementById('modal-industry-name').value = '';
        document.getElementById('modal-industry-image').value = '';
    }
    openModal('industry-modal');
}

function saveIndustry() {
    const id = parseInt(document.getElementById('modal-industry-id').value) || null;
    const name = document.getElementById('modal-industry-name').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }
    const data = {
        id: id || Math.max(0, ...(siteContent.industries || []).map(i => i.id)) + 1,
        name,
        image: document.getElementById('modal-industry-image').value.trim() || 'images/industry.webp'
    };
    if (!siteContent.industries) siteContent.industries = [];
    if (id) {
        const idx = siteContent.industries.findIndex(i => i.id === id);
        if (idx >= 0) siteContent.industries[idx] = data;
    } else {
        siteContent.industries.push(data);
    }
    closeModal('industry-modal');
    renderIndustries();
    showToast(id ? 'Industry updated' : 'Industry added');
}
function editIndustry(id) { openIndustryModal(id); }
function deleteIndustry(id) {
    if (!confirm('Delete this industry?')) return;
    siteContent.industries = (siteContent.industries || []).filter(i => i.id !== id);
    renderIndustries();
    showToast('Industry deleted');
}

// ===== SAVE ALL =====
document.getElementById('save-all-btn').addEventListener('click', async () => {
    // Collect homepage
    const ht = document.getElementById('hero-title'); if (ht) siteContent.hero.title = ht.value;
    const hs = document.getElementById('hero-subtitle'); if (hs) siteContent.hero.subtitle = hs.value;
    const at = document.getElementById('about-title'); if (at && siteContent.about) siteContent.about.title = at.value;
    const ad1 = document.getElementById('about-desc1'); if (ad1 && siteContent.about) siteContent.about.description1 = ad1.value;
    const ad2 = document.getElementById('about-desc2'); if (ad2 && siteContent.about) siteContent.about.description2 = ad2.value;

    // Collect services
    const st = document.getElementById('svc-title');
    if (st && siteContent.services?.[activeServiceKey]) {
        siteContent.services[activeServiceKey].title = st.value;
        siteContent.services[activeServiceKey].subtitle = document.getElementById('svc-subtitle')?.value || '';
        siteContent.services[activeServiceKey].description = document.getElementById('svc-desc')?.value || '';
    }

    // Collect contact
    const ca = document.getElementById('contact-address'); if (ca) siteContent.contact.address = ca.value;
    const cp = document.getElementById('contact-phone'); if (cp) siteContent.contact.phone = cp.value;
    const ce = document.getElementById('contact-email'); if (ce) siteContent.contact.email = ce.value;

    // Collect settings
    if (!siteContent.settings) siteContent.settings = {};
    const sst = document.getElementById('setting-site-title'); if (sst) siteContent.settings.siteTitle = sst.value;
    const ssm = document.getElementById('setting-meta-desc'); if (ssm) siteContent.settings.metaDesc = ssm.value;
    const ssl = document.getElementById('setting-linkedin'); if (ssl) siteContent.settings.linkedin = ssl.value;
    const ssx = document.getElementById('setting-twitter'); if (ssx) siteContent.settings.twitter = ssx.value;
    const ssw = document.getElementById('setting-whatsapp'); if (ssw) siteContent.settings.whatsapp = ssw.value;

    try {
        const r = await fetch('/api/admin/update-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(siteContent)
        });
        const data = await r.json();
        if (data.success) {
            showToast('All changes saved successfully!');
            document.getElementById('last-save').textContent = new Date().toLocaleTimeString();
            updateDashboardStats();
        } else {
            showToast(data.message || 'Save failed', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Failed to save. Check server connection.', 'error');
    }
});

// ===== INQUIRIES =====
async function loadInquiries() {
    try {
        const r = await fetch('/api/admin/quotes');
        const data = await r.json();
        const el = document.getElementById('inquiries-list');
        const badge = document.getElementById('inquiries-badge');
        if (!el) return;

        const quotes = data.quotes || [];
        const unread = quotes.filter(q => !q.read).length;
        if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'inline' : 'none'; }

        if (!quotes.length) {
            el.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No quote requests yet.</p></div>';
            return;
        }
        el.innerHTML = quotes.map(q => `
            <div class="list-item" style="flex-direction:column;align-items:stretch;${q.read ? 'opacity:0.6' : 'border-color:var(--secondary)'}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
                    <h4 style="margin:0">${esc(q.name)} ${!q.read ? '<span style="background:var(--danger);color:#fff;font-size:0.6rem;padding:2px 6px;border-radius:8px;margin-left:8px">NEW</span>' : ''}</h4>
                    <span style="font-size:0.75rem;color:var(--text-muted)">${new Date(q.timestamp).toLocaleString()}</span>
                </div>
                <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:0.82rem;color:var(--text-muted);margin-bottom:6px">
                    <span><i class="fas fa-envelope"></i> ${esc(q.email)}</span>
                    <span><i class="fas fa-phone"></i> ${esc(q.phone)}</span>
                    <span><i class="fas fa-tag"></i> ${esc(q.service)}</span>
                </div>
                ${q.message ? `<p style="font-size:0.85rem;color:var(--text);margin:6px 0;line-height:1.5;background:rgba(255,255,255,0.02);padding:10px;border-radius:8px">${esc(q.message)}</p>` : ''}
                <div style="display:flex;gap:8px;margin-top:8px">
                    ${!q.read ? `<button class="btn btn-save btn-sm" onclick="markRead(${q.id})"><i class="fas fa-check"></i> Mark Read</button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteQuote(${q.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`).join('');
    } catch (e) { console.error(e); }
}

async function markRead(id) {
    try { await fetch(`/api/admin/quotes/${id}/read`, { method: 'PUT' }); loadInquiries(); } catch(e) {}
}
async function deleteQuote(id) {
    if (!confirm('Delete this inquiry?')) return;
    try {
        await fetch(`/api/admin/quotes/${id}`, { method: 'DELETE' });
        loadInquiries();
        showToast('Inquiry deleted');
    } catch(e) { showToast('Failed to delete', 'error'); }
}

// Auto-load inquiries when tab switches
const origTabClick = document.querySelectorAll('.nav-item').forEach(b => {
    b.addEventListener('click', () => {
        if (b.dataset.tab === 'inquiries') setTimeout(loadInquiries, 100);
    });
});

// ===== INIT =====
loadContent();
