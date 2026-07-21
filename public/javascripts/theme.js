document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;

    const sunIcon = document.getElementById('icon-sun');
    const moonIcon = document.getElementById('icon-moon');

    // Function to set theme state & switch visible icon
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        if (theme === 'dark') {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
            themeToggleBtn.setAttribute('aria-label', 'Switch to Light Mode');
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
            themeToggleBtn.setAttribute('aria-label', 'Switch to Dark Mode');
        }
    };

    // Determine initial state: Saved Preference -> OS Media Preference -> Light Default
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    applyTheme(initialTheme);

    // Toggle click handler
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });
});