// Show truck loader instantly on any internal link click
(function () {
    function isInternal(href) {
        if (!href) return false;
        if (href.startsWith('#'))          return false;
        if (href.startsWith('http'))       return false;
        if (href.startsWith('mailto'))     return false;
        if (href.startsWith('tel'))        return false;
        if (href.startsWith('javascript')) return false;
        return true;
    }

    document.addEventListener('click', function (e) {
        var link = e.target.closest('a');
        if (!link) return;
        if (!isInternal(link.getAttribute('href'))) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;

        // The truck loader is already in the DOM (just hidden) — un-hide it instantly
        var loader = document.getElementById('page-loader');
        if (loader) {
            loader.style.display  = 'flex';
            loader.style.opacity  = '1';
            loader.style.visibility = 'visible';
            loader.classList.remove('loader-hidden');
        }
    }, true); // capture phase = fires before dropdown/menu handlers
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
