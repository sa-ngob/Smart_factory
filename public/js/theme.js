(() => {
    'use strict';

    const getStoredTheme = () => localStorage.getItem('theme');
    const setStoredTheme = theme => localStorage.setItem('theme', theme);

    const getPreferredTheme = () => {
        const storedTheme = getStoredTheme();
        if (storedTheme) {
            return storedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const setTheme = theme => {
        // Set theme on the main <html> tag
        document.documentElement.setAttribute('data-bs-theme', theme);
        
        // Find the switcher icons if they exist
        const sunIcon = document.querySelector('#theme-switcher .icon-sun');
        const moonIcon = document.querySelector('#theme-switcher .icon-moon');

        if (sunIcon && moonIcon) {
            sunIcon.style.display = theme === 'dark' ? 'inline-block' : 'none';
            moonIcon.style.display = theme === 'light' ? 'inline-block' : 'none';
        }
    };

    // Apply theme immediately on page load
    setTheme(getPreferredTheme());

    // ✨ FIX: Use event delegation for the click listener
    // This listens on the whole document, so it works even if the sidebar loads late.
    document.addEventListener('click', event => {
        // Check if the clicked element (or its parent) is the theme switcher
        const themeSwitcher = event.target.closest('#theme-switcher');
        
        if (themeSwitcher) {
            event.preventDefault(); // Prevent the link from navigating
            const currentTheme = getStoredTheme() || getPreferredTheme();
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            setStoredTheme(newTheme);
            setTheme(newTheme);
        }
    });

    // When the sidebar is loaded, re-run setTheme to ensure icons are correct
    window.addEventListener('sidebarLoaded', () => {
        setTheme(getPreferredTheme());
    });
})();