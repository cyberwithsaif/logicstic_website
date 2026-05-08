// Runs via defer — DOM is fully parsed, no need for DOMContentLoaded
(async () => {
    try {
        const response = await fetch('/api/content');
        const content = await response.json();

        // --- Homepage Integration ---
        const heroTitle = document.getElementById('hero-title-display');
        const heroSubtitle = document.getElementById('hero-subtitle-display');
        const heroStats = document.getElementById('hero-stats-display');

        if (heroTitle) heroTitle.textContent = content.hero.title;
        if (heroSubtitle) heroSubtitle.textContent = content.hero.subtitle;
        if (heroStats && content.hero.stats && content.hero.stats.length > 0) {
            heroStats.innerHTML = content.hero.stats.map(stat => `
                <div class="stat-item animate-on-scroll">
                    <div class="stat-number">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                </div>
            `).join('');
            document.querySelectorAll('.stat-item.animate-on-scroll').forEach(el => {
                if (window.siteObserver) window.siteObserver.observe(el);
            });
        }

        // --- Projects Page Integration ---
        const projectsContainer = document.getElementById('dynamic-projects-container');
        const filterBar = document.getElementById('project-filter-bar');
        if (projectsContainer && content.projects && content.projects.length) {
            const projects = content.projects;

            function renderProjectCards(list) {
                projectsContainer.innerHTML = list.length
                    ? list.map(p => `
                        <div class="case-study animate-on-scroll">
                            <div class="case-img">
                                <img src="${p.image || ''}" alt="${p.title || ''}" loading="lazy">
                            </div>
                            <div class="case-content">
                                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
                                    <span class="case-meta">${p.category || ''}</span>
                                    ${p.year ? `<span style="font-size:0.82rem;color:#94a3b8;font-weight:600">${p.year}</span>` : ''}
                                </div>
                                <h3 style="font-size:1.8rem">${p.title || ''}</h3>
                                <p style="margin-top:15px;line-height:1.6;color:#64748b">${p.description || ''}</p>
                                ${(p.client || p.location) ? `
                                <div class="proj-card-meta">
                                    ${p.client   ? `<span><i class="fas fa-building"></i> ${p.client}</span>` : ''}
                                    ${p.location ? `<span><i class="fas fa-map-marker-alt"></i> ${p.location}</span>` : ''}
                                </div>` : ''}
                                <a href="contact" class="btn btn-primary" style="margin-top:22px;display:inline-block">Enquire About Similar Project</a>
                            </div>
                        </div>`).join('')
                    : '<p style="text-align:center;color:#64748b;padding:40px 0">No projects in this category yet.</p>';
                projectsContainer.querySelectorAll('.animate-on-scroll').forEach(el => {
                    if (window.siteObserver) window.siteObserver.observe(el);
                });
            }

            if (filterBar) {
                const cats = ['All', ...new Set(projects.map(p => p.category).filter(Boolean))];
                filterBar.innerHTML = cats.map((c, i) =>
                    `<button class="proj-filter-btn${i === 0 ? ' active' : ''}" data-cat="${c}">${c}</button>`
                ).join('');
                filterBar.addEventListener('click', (e) => {
                    const btn = e.target.closest('.proj-filter-btn');
                    if (!btn) return;
                    filterBar.querySelectorAll('.proj-filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const cat = btn.dataset.cat;
                    renderProjectCards(cat === 'All' ? projects : projects.filter(p => p.category === cat));
                });
            }

            renderProjectCards(projects);
        } else if (projectsContainer) {
            projectsContainer.innerHTML = '<p style="text-align:center;color:#64748b;padding:60px 0">No projects found.</p>';
        }

        // --- Contact Info (footer + contact page) ---
        const contactData = content.settings?.contact || content.contact || {};
        const footerItems = document.querySelectorAll('.contact-info-list li');
        if (footerItems[0] && contactData.address)
            footerItems[0].innerHTML = `<i class="fas fa-map-marker-alt"></i> ${contactData.address}`;
        if (footerItems[1] && contactData.phone)
            footerItems[1].innerHTML = `<i class="fas fa-phone"></i> <a href="tel:${contactData.phone}" style="color:#aaa">${contactData.phone}</a>`;
        if (footerItems[2] && contactData.email)
            footerItems[2].innerHTML = `<i class="fas fa-envelope"></i> <a href="mailto:${contactData.email}" style="color:#aaa">${contactData.email}</a>`;

        // --- Social Links (footer) ---
        const links = content.settings?.socialLinks || {};
        const socialMap = { 'LinkedIn': links.linkedin, 'Twitter': links.twitter, 'Facebook': links.facebook, 'Instagram': links.instagram };
        document.querySelectorAll('.social-links a').forEach(a => {
            const label = a.getAttribute('aria-label');
            if (label && socialMap[label] !== undefined) {
                if (socialMap[label]) {
                    a.href = socialMap[label];
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.style.display = '';
                } else {
                    a.style.display = 'none';
                }
            }
        });

        // --- WhatsApp Button ---
        const waBtn = document.getElementById('whatsapp-btn');
        if (waBtn) {
            const waNumber = content.settings?.whatsapp || '';
            const waEnabled = content.settings?.whatsappEnabled !== false;
            if (waNumber && waEnabled) {
                waBtn.href = `https://wa.me/${waNumber}`;
                waBtn.style.display = 'flex';
            } else {
                waBtn.style.display = 'none';
            }
        }

        // --- Built-in Live Chat Widget ---
        const chat = content.settings?.chat;
        if (chat?.enabled !== false) {
            const s = document.createElement('script');
            s.src = '/js/chat-widget.js';
            document.body.appendChild(s);
        }

    } catch (err) {
        console.error('Error fetching dynamic content:', err);
    }
})();
