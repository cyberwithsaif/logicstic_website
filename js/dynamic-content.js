document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch with cache-buster to ensure admin changes show immediately
        const response = await fetch('/api/content?t=' + Date.now());
        const content = await response.json();
        
        // --- Homepage Integration ---
        const heroTitle = document.getElementById('hero-title-display');
        const heroSubtitle = document.getElementById('hero-subtitle-display');
        const heroStats = document.getElementById('hero-stats-display');

        if (heroTitle) heroTitle.textContent = content.hero.title;
        if (heroSubtitle) heroSubtitle.textContent = content.hero.subtitle;
        if (heroStats && content.hero.stats && content.hero.stats.length > 0) {
            heroStats.parentElement.parentElement.style.display = 'block'; // Ensure section is visible
            heroStats.innerHTML = content.hero.stats.map(stat => `
                <div class="stat-item animate-on-scroll">
                    <div class="stat-number">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                </div>
            `).join('');
            
            // Observe newly added elements for animations
            document.querySelectorAll('.stat-item.animate-on-scroll').forEach(el => {
                if (window.siteObserver) window.siteObserver.observe(el);
            });
        } else if (heroStats) {
            heroStats.parentElement.parentElement.style.display = 'none'; // Hide if empty
        }

        // --- Projects Page Integration ---
        const projectsContainer = document.getElementById('dynamic-projects-container');
        if (projectsContainer && content.projects) {
            projectsContainer.innerHTML = content.projects.map(project => `
                <div class="case-study animate-on-scroll">
                    <div class="case-img">
                        <img src="${project.image}" alt="${project.title}">
                    </div>
                    <div class="case-content">
                        <span class="case-meta">${project.category}</span>
                        <h3 style="font-size: 1.8rem;">${project.title}</h3>
                        <p style="margin-top: 15px; line-height: 1.6; color: #64748b;">${project.description}</p>
                        <a href="contact.html" class="btn btn-primary" style="margin-top: 20px; display: inline-block;">Enquire About Similar Project</a>
                    </div>
                </div>
            `).join('');
        }

        // --- Global Contact Info ---
        const footerAddress = document.querySelector('.contact-info-list li:nth-child(1)');
        const footerPhone = document.querySelector('.contact-info-list li:nth-child(2)');
        const footerEmail = document.querySelector('.contact-info-list li:nth-child(3)');

        if (footerAddress) footerAddress.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${content.contact.address}`;
        if (footerPhone) footerPhone.innerHTML = `<i class="fas fa-phone"></i> ${content.contact.phone}`;
        if (footerEmail) footerEmail.innerHTML = `<i class="fas fa-envelope"></i> ${content.contact.email}`;

    } catch (err) {
        console.error('Error fetching dynamic content:', err);
    }
});
