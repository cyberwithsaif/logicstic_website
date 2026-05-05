let siteContent = {};

// Tab Switching
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = item.getAttribute('data-tab');
        
        // Update Nav
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Update Content
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
        document.getElementById(`${targetTab}-tab`).classList.remove('hidden');

        // Update Title
        const titleMap = {
            dashboard: 'Dashboard Overview',
            homepage: 'Homepage Editor',
            projects: 'Project Portfolio',
            services: 'Service Management',
            settings: 'Global Settings'
        };
        document.getElementById('page-title').textContent = titleMap[targetTab];
    });
});

// Load Content from API
async function loadContent() {
    try {
        const response = await fetch('/api/content');
        siteContent = await response.json();
        populateFields();
    } catch (err) {
        console.error('Failed to load content', err);
    }
}

function populateFields() {
    // Hero
    document.getElementById('hero-title').value = siteContent.hero.title;
    document.getElementById('hero-subtitle').value = siteContent.hero.subtitle;

    // Stats
    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = '';
    siteContent.hero.stats.forEach((stat, index) => {
        statsContainer.innerHTML += `
            <div class="form-group">
                <label>${stat.label}</label>
                <input type="text" value="${stat.value}" onchange="updateStat(${index}, this.value)" class="admin-input">
            </div>
        `;
    });

    // Projects
    renderProjects();
    document.getElementById('stat-project-count').textContent = siteContent.projects.length;
}

function updateStat(index, value) {
    siteContent.hero.stats[index].value = value;
}

function renderProjects() {
    const list = document.getElementById('projects-list');
    list.innerHTML = '';
    siteContent.projects.forEach(project => {
        list.innerHTML += `
            <div class="stat-card" style="flex-direction: column; align-items: flex-start;">
                <h3>${project.title}</h3>
                <span style="color: var(--secondary); font-size: 0.8rem;">${project.category}</span>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin: 10px 0;">${project.description}</p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="add-btn" style="padding: 5px 15px; font-size: 0.8rem;" onclick="editProject(${project.id})">Edit</button>
                    <button class="add-btn" style="padding: 5px 15px; font-size: 0.8rem; background: #ff4757;" onclick="deleteProject(${project.id})">Delete</button>
                </div>
            </div>
        `;
    });
}

// Save Content
document.getElementById('save-all-btn').addEventListener('click', async () => {
    // Collect updated data
    siteContent.hero.title = document.getElementById('hero-title').value;
    siteContent.hero.subtitle = document.getElementById('hero-subtitle').value;

    try {
        const response = await fetch('/api/admin/update-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(siteContent)
        });
        
        const data = await response.json();
        if (data.success) {
            alert('✅ Changes saved successfully!');
        } else {
            alert('❌ Error: ' + (data.message || 'Unknown server error'));
        }
    } catch (err) {
        console.error('Save Error:', err);
        alert('❌ Failed to save changes. Please check if the server is running and you are still logged in.');
    }
});

// Initial Load
loadContent();
