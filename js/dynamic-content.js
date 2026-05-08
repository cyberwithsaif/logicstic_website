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
        if (projectsContainer && content.projects) {
            projectsContainer.innerHTML = content.projects.map(project => `
                <div class="case-study animate-on-scroll">
                    <div class="case-img">
                        <img src="${project.image}" alt="${project.title}" loading="lazy">
                    </div>
                    <div class="case-content">
                        <span class="case-meta">${project.category}</span>
                        <h3 style="font-size: 1.8rem;">${project.title}</h3>
                        <p style="margin-top: 15px; line-height: 1.6; color: #64748b;">${project.description}</p>
                        <a href="contact" class="btn btn-primary" style="margin-top: 20px; display: inline-block;">Enquire About Similar Project</a>
                    </div>
                </div>
            `).join('');
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

        // --- Chat Widget ---
        const chat = content.settings?.chat;
        if (chat?.enabled && chat?.code && chat.code.trim()) {
            const chatContainer = document.createElement('div');
            chatContainer.id = 'agl-chat-widget';
            chatContainer.innerHTML = chat.code;
            document.body.appendChild(chatContainer);
            // Re-execute any script tags injected via innerHTML
            chatContainer.querySelectorAll('script').forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.textContent = oldScript.textContent;
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
        }

    } catch (err) {
        console.error('Error fetching dynamic content:', err);
    }
})();
