// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Sticky Header
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            // Always keep scrolled style for solid header visibility
            header.classList.add('scrolled');
        }
    });

    // 2. Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (mobileMenuToggle && mainNav) {
        // Toggle menu open/close
        mobileMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mainNav.classList.toggle('active');

            // Update icon
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                if (mainNav.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when clicking regular nav links (not dropdowns)
        const regularLinks = mainNav.querySelectorAll('.nav-list > li:not(.dropdown) > a');
        regularLinks.forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('active');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });

        // Close menu when clicking outside (on desktop background or backdrop)
        document.addEventListener('click', (e) => {
            if (mainNav.classList.contains('active')) {
                // Check if click is outside the menu and toggle button
                const clickedInMenu = mainNav.contains(e.target);
                const clickedOnToggle = mobileMenuToggle.contains(e.target);

                if (!clickedInMenu && !clickedOnToggle) {
                    mainNav.classList.remove('active');
                    const icon = mobileMenuToggle.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            }
        });
    }

    // 3. Mobile Dropdown Toggle
    const dropdowns = document.querySelectorAll('.main-nav .dropdown');

    dropdowns.forEach(dropdown => {
        const dropdownLink = dropdown.querySelector('.nav-link');
        const dropdownMenu = dropdown.querySelector('.dropdown-menu');

        if (dropdownLink) {
            dropdownLink.addEventListener('click', (e) => {
                // Only toggle on mobile/tablet screens
                if (window.innerWidth <= 1024) {
                    e.preventDefault();
                    e.stopPropagation();
                    dropdown.classList.toggle('active');
                }
            });
        }

        // Close dropdown when clicking submenu items (menu stays open)
        if (dropdownMenu) {
            const submenuLinks = dropdownMenu.querySelectorAll('a');
            submenuLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    if (window.innerWidth <= 1024) {
                        // Close dropdown but keep menu open
                        dropdown.classList.remove('active');
                    }
                });
            });
        }
    });

    // 4. Scroll Animations using IntersectionObserver
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: stop observing once animated
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => {
        observer.observe(el);
    });

    // Expose observer for dynamic content
    window.siteObserver = observer;

});
