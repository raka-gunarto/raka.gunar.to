// Theme toggle functionality
(function() {
  const STORAGE_KEY = 'theme-preference';
  const THEME_ATTR = 'data-theme';
  
  // Get stored theme preference or system preference
  function getThemePreference() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
    // Return null to use system preference (no data-theme attribute)
    return null;
  }
  
  // Apply theme to document
  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute(THEME_ATTR, theme);
    } else {
      // Remove attribute to use system preference
      document.documentElement.removeAttribute(THEME_ATTR);
    }
    updateToggleIcon(theme);
  }
  
  // Update toggle button icon
  function updateToggleIcon(theme) {
    const toggle = document.getElementById('theme-toggle');
    const icon = toggle?.querySelector('.theme-toggle-icon');
    if (!icon) return;
    
    // Determine effective theme
    let effectiveTheme = theme;
    icon.textContent = effectiveTheme === 'dark' ? '🌙' : '☀️';

    if (!theme) {
      // Check system preference
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      icon.textContent = "🖥️"
    }
  }
  
  // Cycle through themes: system -> light -> dark -> system
  function cycleTheme() {
    const currentTheme = localStorage.getItem(STORAGE_KEY);
    let newTheme;
    
    if (!currentTheme) {
      // Currently using system preference, switch to light
      newTheme = 'light';
    } else if (currentTheme === 'light') {
      // Switch to dark
      newTheme = 'dark';
    } else {
      // Switch back to system preference
      newTheme = null;
      localStorage.removeItem(STORAGE_KEY);
      applyTheme(null);
      return;
    }
    
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }
  
  // Initialize theme on page load (before DOM content loaded to prevent flash)
  const initialTheme = getThemePreference();
  applyTheme(initialTheme);
  
  // Set up toggle button when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', cycleTheme);
    }
    
    // Listen for system theme changes when using system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', function() {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Only update if using system preference
        updateToggleIcon(null);
      }
    });
  });
})();
