// 1. Immediate Theme Check (Prevents the "Dark Flash" on load)
(function () {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
        document.documentElement.classList.add('light-theme');
    }

    const savedFontSize = localStorage.getItem('fontSize') || 'medium';
    const validFontSizes = ['small', 'medium', 'large'];
    document.documentElement.dataset.fontSize = validFontSizes.includes(savedFontSize) ? savedFontSize : 'medium';

    const validFontFamilies = ['inter', 'arial', 'verdana', 'trebuchet', 'georgia', 'garamond', 'mono'];
    const savedFontFamily = localStorage.getItem('fontFamily') || 'inter';
    document.documentElement.dataset.fontFamily = validFontFamilies.includes(savedFontFamily) ? savedFontFamily : 'inter';
})();

function updateThemeButtons() {
    const isLight = document.documentElement.classList.contains('light-theme');
    document.querySelectorAll('.theme-toggle').forEach((btn) => {
        btn.textContent = isLight ? 'Dark' : 'Light';
    });
}

function toggleSiteTheme() {
    const el = document.documentElement;
    const isLight = el.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    updateThemeButtons();
}

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
        document.documentElement.classList.add('light-theme');
    }

    updateThemeButtons();
    document.querySelectorAll('.theme-toggle').forEach((btn) => {
        btn.addEventListener('click', toggleSiteTheme);
    });

    const fontSizeSelect = document.getElementById('fontSizeSelect');
    if (fontSizeSelect) {
        const currentSize = document.documentElement.dataset.fontSize || 'medium';
        fontSizeSelect.value = currentSize;
        fontSizeSelect.addEventListener('change', () => {
            const selectedSize = ['small', 'medium', 'large'].includes(fontSizeSelect.value)
                ? fontSizeSelect.value
                : 'medium';
            document.documentElement.dataset.fontSize = selectedSize;
            localStorage.setItem('fontSize', selectedSize);
        });
    }

    const fontFamilySelect = document.getElementById('fontFamilySelect');
    if (fontFamilySelect) {
        const currentFamily = document.documentElement.dataset.fontFamily || 'inter';
        fontFamilySelect.value = currentFamily;
        fontFamilySelect.addEventListener('change', () => {
            const selectedFamily = ['inter', 'arial', 'verdana', 'trebuchet', 'georgia', 'garamond', 'mono'].includes(fontFamilySelect.value)
                ? fontFamilySelect.value
                : 'inter';
            document.documentElement.dataset.fontFamily = selectedFamily;
            localStorage.setItem('fontFamily', selectedFamily);
        });
    }
});