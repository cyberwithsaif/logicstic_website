// Instant page transition overlay — fires before DOMContentLoaded
(function () {
    // Skip anchors, external links, mailto, tel
    function isInternalLink(href) {
        if (!href) return false;
        if (href.startsWith('#'))         return false;
        if (href.startsWith('http'))      return false;
        if (href.startsWith('mailto'))    return false;
        if (href.startsWith('tel'))       return false;
        if (href.startsWith('javascript')) return false;
        return true;
    }

    function showTransitionOverlay() {
        // Reuse existing loader if still in DOM
        var existing = document.getElementById('page-loader');
        if (existing) {
            existing.classList.remove('loader-hidden');
            existing.style.cssText = 'position:fixed;inset:0;background:#0B1F3A;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;opacity:1;visibility:visible;';
            return;
        }
        // Create a minimal instant overlay (no truck, just navy screen)
        var overlay = document.createElement('div');
        overlay.id = 'nav-transition-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:#0B1F3A;z-index:99999;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = '<div style="width:40px;height:40px;border:3px solid rgba(201,161,74,0.3);border-top-color:#C9A14A;border-radius:50%;animation:spin .7s linear infinite;"></div>';

        // Inject keyframe if needed
        if (!document.getElementById('spin-style')) {
            var s = document.createElement('style');
            s.id = 'spin-style';
            s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
            document.head.appendChild(s);
        }
        document.body.appendChild(overlay);
    }

    document.addEventListener('click', function (e) {
        var link = e.target.closest('a');
        if (!link) return;
        var href = link.getAttribute('href');
        if (!isInternalLink(href)) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey) return; // allow open-in-tab

        showTransitionOverlay();
        // No e.preventDefault — let the browser navigate normally
    }, true); // capture phase so it fires before any other handler
}());

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // 1. Sticky Header
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.add('scrolled');
        });
    }

    // 2. Mobile Menu
    const menuToggle   = document.querySelector('.mobile-menu-toggle');
    const navCloseBtn  = document.querySelector('.nav-close-btn');
    const mainNav      = document.querySelector('.main-nav');
    const menuOverlay  = document.querySelector('.menu-overlay');

    function openMenu() {
        if (!mainNav) return;
        mainNav.classList.add('active');
        if (menuOverlay) menuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        if (!mainNav) return;
        mainNav.classList.remove('active');
        if (menuOverlay) menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
        // Close all dropdowns
        document.querySelectorAll('.main-nav .dropdown.active').forEach(d => {
            d.classList.remove('active');
        });
    }

    // Open via hamburger button
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            openMenu();
        });
    }

    // Close via X button inside nav
    if (navCloseBtn) {
        navCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
        });
    }

    // Close via overlay (click on dark backdrop)
    if (menuOverlay) {
        menuOverlay.addEventListener('click', () => {
            closeMenu();
        });
    }

    // Close regular links (non-dropdown)
    if (mainNav) {
        mainNav.querySelectorAll('.nav-list > li:not(.dropdown) > a').forEach(link => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });
    }

    // 3. Mobile Dropdown Toggle
    document.querySelectorAll('.main-nav .dropdown').forEach(dropdown => {
        const dropdownLink = dropdown.querySelector(':scope > .nav-link');
        const dropdownMenu = dropdown.querySelector(':scope > .dropdown-menu');

        if (dropdownLink) {
            dropdownLink.addEventListener('click', (e) => {
                if (window.innerWidth <= 1024) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Close other open dropdowns
                    document.querySelectorAll('.main-nav .dropdown.active').forEach(d => {
                        if (d !== dropdown) d.classList.remove('active');
                    });

                    dropdown.classList.toggle('active');
                }
            });
        }

        if (dropdownMenu) {
            dropdownMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 1024) {
                        dropdown.classList.remove('active');
                        closeMenu();
                    }
                });
            });
        }
    });

    // 4. Scroll Animations using IntersectionObserver
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.15 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    window.siteObserver = observer;

});
