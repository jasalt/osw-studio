import type { TestSequence } from '../types';
import { standardSetup, handlebarsSetup, defaultPromptMd, basicCSSFile } from './setup-data';

export const testSequences: TestSequence[] = [
  {
    id: 'seq-bash-read',
    name: 'Bash: Read Operations',
    category: 'bash',
    setupFiles: standardSetup,
    steps: [
      {
        id: 'seq-bash-read-cat',
        name: 'Read file and extract value',
        prompt: 'Read index.html and tell me the page title.',
        assertions: [
          { type: 'tool_used', toolName: 'bash', description: 'Used shell tool' },
          { type: 'output_matches', pattern: 'Test App', description: 'Output contains page title' },
        ],
      },
      {
        id: 'seq-bash-read-head',
        name: 'Read partial file with head',
        prompt: 'Show me only the first 10 lines of index.html using head. What is the charset?',
        assertions: [
          { type: 'tool_args_match', toolName: 'bash', pattern: 'head', description: 'Used head command' },
          { type: 'output_matches', pattern: 'UTF-8', description: 'Found charset from first 10 lines' },
        ],
      },
      {
        id: 'seq-bash-read-tree',
        name: 'List files with tree',
        prompt: 'List all files in the project using tree, then tell me how many files there are.',
        assertions: [
          { type: 'tool_args_match', toolName: 'bash', pattern: 'tree|ls|find', description: 'Used file listing command' },
          { type: 'tool_output_matches', toolName: 'bash', pattern: 'index\\.html|styles\\.css|script\\.js', description: 'Output lists project files' },
        ],
      },
    ],
  },
  {
    id: 'seq-bash-search',
    name: 'Bash: Search Operations',
    category: 'bash',
    setupFiles: standardSetup,
    steps: [
      {
        id: 'seq-bash-search-grep',
        name: 'Search with grep',
        prompt: "Use grep to find all lines in index.html that contain 'class' and show line numbers.",
        assertions: [
          { type: 'tool_args_match', toolName: 'bash', pattern: 'grep|rg', description: 'Used search command' },
          { type: 'tool_output_matches', toolName: 'bash', pattern: 'class', description: 'Tool output contains class matches' },
        ],
      },
      {
        id: 'seq-bash-search-rg',
        name: 'Search across files with rg',
        prompt: "Search across all files for the word 'function' using rg.",
        assertions: [
          { type: 'tool_args_match', toolName: 'bash', pattern: 'rg.*function', description: 'Used rg to search for function' },
          { type: 'tool_output_matches', toolName: 'bash', pattern: 'function', description: 'Tool output contains function matches' },
        ],
      },
      {
        id: 'seq-bash-search-find',
        name: 'Find files by extension',
        prompt: 'Find all .css files in the project.',
        assertions: [
          { type: 'tool_args_match', toolName: 'bash', pattern: 'find|ls|rg|grep', description: 'Used file discovery command' },
          { type: 'tool_output_matches', toolName: 'bash', pattern: 'styles\\.css', description: 'Tool output contains styles.css' },
        ],
      },
    ],
  },
  {
    id: 'seq-bash-write',
    name: 'Bash: Write & Text Processing',
    category: 'bash',
    setupFiles: standardSetup,
    steps: [
      {
        id: 'seq-bash-write-mkdir',
        name: 'Create directories and files',
        prompt: "Create a directory called 'components' with three empty files: header.html, footer.html, sidebar.html.",
        assertions: [
          { type: 'file_exists', path: '/components/header.html', description: 'header.html created' },
          { type: 'file_exists', path: '/components/footer.html', description: 'footer.html created' },
          { type: 'file_exists', path: '/components/sidebar.html', description: 'sidebar.html created' },
        ],
      },
      {
        id: 'seq-bash-write-cp-mv',
        name: 'Copy and rename files',
        prompt: 'Copy styles.css to styles-backup.css, then rename script.js to app.js.',
        assertions: [
          { type: 'file_exists', path: '/styles-backup.css', description: 'styles-backup.css created' },
          { type: 'file_exists', path: '/app.js', description: 'app.js exists (renamed)' },
          { type: 'file_not_exists', path: '/script.js', description: 'script.js removed after rename' },
        ],
      },
      {
        id: 'seq-bash-write-echo',
        name: 'Create file with echo redirect',
        prompt: "Create a new file /data.json with a JSON object containing name 'Test' and version 1 using echo and redirect.",
        assertions: [
          { type: 'file_exists', path: '/data.json', description: 'data.json created' },
          { type: 'valid_json', path: '/data.json', description: 'data.json is valid JSON' },
          { type: 'file_matches', path: '/data.json', pattern: '[Tt]est', description: 'Contains "Test" name' },
        ],
      },
      {
        id: 'seq-bash-write-sed',
        name: 'In-place substitution with sed',
        prompt: "Use sed to change all occurrences of '#007bff' to '#e74c3c' in styles.css.",
        assertions: [
          { type: 'file_not_contains', path: '/styles.css', value: '#007bff', description: 'Old color removed' },
          { type: 'file_contains', path: '/styles.css', value: '#e74c3c', description: 'New color applied' },
        ],
      },
      {
        id: 'seq-bash-write-pipe',
        name: 'Pipe cat through sed to new file',
        prompt: "Read index.html with cat, pipe through sed to replace 'Test App' with 'My App', redirect to /output.html.",
        assertions: [
          { type: 'file_exists', path: '/output.html', description: 'output.html created' },
          { type: 'file_contains', path: '/output.html', value: 'My App', description: 'Contains replaced text' },
        ],
      },
      {
        id: 'seq-bash-write-chain',
        name: 'Chained commands with &&',
        prompt: "Create a 'pages' directory, create about.html and contact.html inside it, list contents — single command with &&.",
        assertions: [
          { type: 'file_exists', path: '/pages/about.html', description: 'about.html created in pages/' },
          { type: 'file_exists', path: '/pages/contact.html', description: 'contact.html created in pages/' },
        ],
      },
      {
        id: 'seq-bash-write-pipe-chain',
        name: 'Multi-stage pipe chain',
        prompt: "Cat index.html, pipe through grep to find lines with 'nav', pipe through head for first 3 matches.",
        assertions: [
          { type: 'tool_args_match', toolName: 'bash', pattern: '\\|', description: 'Used pipe operator' },
          { type: 'tool_output_matches', toolName: 'bash', pattern: 'nav', description: 'Tool output contains nav matches' },
        ],
      },
    ],
  },
  {
    id: 'seq-file-editing',
    name: 'File Editing: Basics',
    category: 'file-editing',
    setupFiles: standardSetup,
    steps: [
      {
        id: 'seq-edit-update',
        name: 'Update text in file',
        prompt: "Change the page title from 'Test App' to 'My Application' in index.html.",
        assertions: [
          { type: 'file_contains', path: '/index.html', value: 'My Application', description: 'New title present' },
          { type: 'file_not_contains', path: '/index.html', value: '<title>Test App</title>', description: 'Old title removed' },
        ],
      },
      {
        id: 'seq-edit-new-file',
        name: 'Create new file',
        prompt: "Create a new /about.html with heading 'About Us' and a paragraph of placeholder text.",
        assertions: [
          { type: 'file_exists', path: '/about.html', description: 'about.html created' },
          { type: 'file_matches', path: '/about.html', pattern: 'About Us', description: 'Contains About Us heading' },
        ],
      },
      {
        id: 'seq-edit-multi-op',
        name: 'Multiple edits to same file',
        prompt: "In index.html: update the h1 text to 'Portfolio', and add a footer before the closing body tag.",
        assertions: [
          { type: 'file_matches', path: '/index.html', pattern: 'Portfolio', description: 'H1 text changed' },
          { type: 'file_matches', path: '/index.html', pattern: 'footer', description: 'Footer added' },
        ],
      },
      {
        id: 'seq-edit-nav',
        name: 'Replace nav with new content',
        prompt: "Replace the nav element in index.html with a new nav containing a logo span 'MySite' and links to Home, Portfolio, Blog, and Contact.",
        assertions: [
          { type: 'file_matches', path: '/index.html', pattern: 'MySite', description: 'Has logo text' },
          { type: 'file_matches', path: '/index.html', pattern: 'Portfolio', description: 'Has Portfolio link' },
          { type: 'file_matches', path: '/index.html', pattern: 'Blog', description: 'Has Blog link' },
        ],
      },
      {
        id: 'seq-edit-rewrite',
        name: 'Rewrite entire file',
        prompt: 'Replace styles.css entirely with a modern CSS reset.',
        assertions: [
          { type: 'file_not_contains', path: '/styles.css', value: '.btn:hover', description: 'Original content replaced' },
          { type: 'file_matches', path: '/styles.css', pattern: 'box-sizing|margin:\\s*0|border-box', description: 'Contains CSS reset content' },
        ],
      },
      {
        id: 'seq-edit-style-block',
        name: 'Replace specific CSS rule block',
        prompt: "In styles.css, add a .btn rule with padding: 12px 24px, background: #e74c3c, border-radius: 8px, and a .btn:hover that changes background to #c0392b and adds transform: translateY(-2px).",
        assertions: [
          { type: 'file_contains', path: '/styles.css', value: '#e74c3c', description: 'New button color' },
          { type: 'file_contains', path: '/styles.css', value: 'border-radius: 8px', description: 'New border-radius' },
          { type: 'file_contains', path: '/styles.css', value: 'translateY', description: 'Has transform on hover' },
        ],
      },
      {
        id: 'seq-edit-js-handler',
        name: 'Replace JS event handler',
        prompt: "In script.js, replace the click event listener with one that adds an 'active' class to the clicked link, removes 'active' from all other links, and smoothly scrolls to the target section.",
        assertions: [
          { type: 'file_matches', path: '/script.js', pattern: 'active', description: 'Uses active class' },
          { type: 'file_matches', path: '/script.js', pattern: 'scroll|scrollIntoView|scrollTo', description: 'Has smooth scroll' },
          { type: 'file_matches', path: '/script.js', pattern: 'DOMContentLoaded|addEventListener', description: 'Still has event listener structure' },
        ],
      },
      {
        id: 'seq-edit-entity-nav',
        name: 'Replace HTML entity (nav)',
        prompt: 'Replace the nav element in index.html with a new nav containing a logo and three links: Home, Portfolio, Contact.',
        assertions: [
          { type: 'file_matches', path: '/index.html', pattern: 'logo|brand|site-name|site-title', description: 'Has logo/brand element' },
          { type: 'file_matches', path: '/index.html', pattern: 'Portfolio|Contact', description: 'Has new nav links' },
        ],
      },
    ],
  },
  {
    id: 'seq-file-editing-stress',
    name: 'File Editing: Stress Tests',
    category: 'file-editing',
    setupFiles: standardSetup,
    steps: [
      {
        id: 'seq-stress-special-chars',
        name: 'Edit file with special characters',
        prompt: "Update index.html: change the script tag content to include a template literal that logs `Hello, ${name}! Welcome to \"OSW Studio\" — it's great.` and a regex /\\d+\\.\\d+/g.",
        assertions: [
          { type: 'file_contains', path: '/index.html', value: '${name}', description: 'Contains template literal variable' },
          { type: 'file_matches', path: '/index.html', pattern: 'it.s great', description: 'Contains apostrophe text' },
          { type: 'file_matches', path: '/index.html', pattern: '\\\\d', description: 'Contains regex pattern' },
        ],
      },
      {
        id: 'seq-stress-sequential-edits',
        name: 'Sequential edits to same file',
        prompt: "Make these changes to index.html in order: 1) Change the title to 'My Portfolio', 2) Add a class 'dark-theme' to the body tag, 3) Add a footer with text 'Built with OSW Studio' before </body>.",
        assertions: [
          { type: 'file_contains', path: '/index.html', value: 'My Portfolio', description: 'Title changed' },
          { type: 'file_contains', path: '/index.html', value: 'dark-theme', description: 'Body class added' },
          { type: 'file_contains', path: '/index.html', value: 'Built with OSW Studio', description: 'Footer added' },
        ],
      },
      {
        id: 'seq-stress-json',
        name: 'Create and edit JSON file',
        prompt: "Create /config.json with a JSON object containing: name (string), version (string \"1.0.0\"), features (array of 3 strings), settings (nested object with theme: \"dark\", language: \"en\", debug: false).",
        assertions: [
          { type: 'file_exists', path: '/config.json', description: 'config.json created' },
          { type: 'valid_json', path: '/config.json', description: 'Valid JSON' },
          { type: 'file_contains', path: '/config.json', value: '"version"', description: 'Has version field' },
          { type: 'file_contains', path: '/config.json', value: '"debug"', description: 'Has nested debug setting' },
        ],
      },
      {
        id: 'seq-stress-css',
        name: 'Create complex CSS file',
        prompt: "Create /theme.css with: CSS custom properties on :root (--primary, --secondary, --bg, --text colors), a .container class with max-width, .btn with multiple states (:hover, :active, :disabled), a @media query for mobile, and a @keyframes fadeIn animation.",
        assertions: [
          { type: 'file_exists', path: '/theme.css', description: 'theme.css created' },
          { type: 'file_contains', path: '/theme.css', value: '--primary', description: 'Has CSS custom property' },
          { type: 'file_matches', path: '/theme.css', pattern: ':hover', description: 'Has hover state' },
          { type: 'file_matches', path: '/theme.css', pattern: '@media', description: 'Has media query' },
          { type: 'file_matches', path: '/theme.css', pattern: '@keyframes', description: 'Has keyframes animation' },
        ],
      },
      {
        id: 'seq-stress-multiline',
        name: 'Update multi-line block',
        prompt: "Replace the entire nav element in index.html (from <nav to </nav>) with a new nav containing: a logo div with text 'BRAND', and links to Home, Gallery, Portfolio, and Contact. Do not include the old About or Services links.",
        assertions: [
          { type: 'file_matches', path: '/index.html', pattern: 'BRAND', description: 'Has brand logo' },
          { type: 'file_matches', path: '/index.html', pattern: 'Portfolio', description: 'Has Portfolio link' },
          { type: 'file_contains', path: '/index.html', value: 'Gallery', description: 'Has Gallery link' },
          { type: 'file_not_contains', path: '/index.html', value: '#services', description: 'Old Services link removed' },
        ],
      },
      {
        id: 'seq-stress-large-rewrite',
        name: 'Rewrite large file',
        prompt: "Rewrite index.html with a complete landing page: a header with logo and nav, a hero section with heading and CTA button, three feature cards in a grid, a testimonials section, and a footer with copyright. Include all CSS inline in a style tag. Make it at least 100 lines.",
        assertions: [
          { type: 'file_matches', path: '/index.html', pattern: 'hero|banner', description: 'Has hero section' },
          { type: 'file_matches', path: '/index.html', pattern: 'feature|card', description: 'Has feature cards' },
          { type: 'file_matches', path: '/index.html', pattern: 'testimonial|review|quote', description: 'Has testimonials' },
          { type: 'file_matches', path: '/index.html', pattern: 'footer', description: 'Has footer' },
        ],
      },
    ],
  },
  {
    id: 'seq-status',
    name: 'Status: Task Completion',
    category: 'status',
    setupFiles: standardSetup,
    steps: [
      {
        id: 'seq-status-simple',
        name: 'Evaluate simple completed task',
        prompt: "Change the h1 text to 'Hello World' in index.html.",
        timeout: 60000,
        assertions: [
          { type: 'file_matches', path: '/index.html', pattern: 'Hello World', description: 'h1 changed to Hello World' },
        ],
      },
      {
        id: 'seq-status-verify',
        name: 'Evaluate task with verification step',
        prompt: "Add a 'contact' link to the nav in index.html, then verify it was added correctly by reading the file.",
        timeout: 60000,
        assertions: [
          { type: 'file_matches', path: '/index.html', pattern: '[Cc]ontact', description: 'Contact link added to nav' },
          { type: 'tool_used', toolName: 'bash', description: 'Used shell to verify' },
        ],
      },
      {
        id: 'seq-status-conditional',
        name: 'Evaluate task requiring inspection first',
        prompt: "Check if index.html has a footer. If not, add one with copyright text '2024 Test App'. If it does, update the footer text to '2024 Test App'.",
        timeout: 60000,
        assertions: [
          { type: 'file_matches', path: '/index.html', pattern: 'footer', description: 'Has footer element' },
          { type: 'file_matches', path: '/index.html', pattern: '2024.*Test App|Test App.*2024', description: 'Footer has copyright text' },
        ],
      },
      {
        id: 'seq-status-colors',
        name: 'Evaluate edit with confirmation read',
        prompt: "Change the nav background color from '#2c3e50' to '#1a1a2e' and all nav link colors from '#ecf0f1' to '#e94560'. After editing, read back the file to verify both changes are present.",
        timeout: 60000,
        assertions: [
          { type: 'file_matches_any', paths: ['/index.html', '/styles.css'], pattern: '#1a1a2e', description: 'Nav background color changed' },
          { type: 'file_matches_any', paths: ['/index.html', '/styles.css'], pattern: '#e94560', description: 'Nav link color changed' },
        ],
      },
      {
        id: 'seq-status-multi-element',
        name: 'Evaluate multi-element creation',
        prompt: 'Add a hero section with a heading and CTA button, and a footer element to index.html.',
        timeout: 60000,
        assertions: [
          { type: 'file_matches', path: '/index.html', pattern: 'hero|banner', description: 'Has hero/banner section' },
          { type: 'file_matches', path: '/index.html', pattern: 'footer', description: 'Has footer element' },
        ],
      },
      {
        id: 'seq-status-multi-step',
        name: 'Evaluate multi-file task completion',
        prompt: 'Create a /gallery.html page, add a link to it from index.html nav, and add matching styles in styles.css.',
        timeout: 90000,
        assertions: [
          { type: 'file_exists', path: '/gallery.html', description: 'gallery.html created' },
          { type: 'file_matches', path: '/index.html', pattern: 'gallery', description: 'Nav links to gallery' },
        ],
      },
      {
        id: 'seq-status-scaffold',
        name: 'Evaluate multi-file project scaffold',
        prompt: "Create a blog structure: /blog/index.html (list page), /blog/post-1.html (first post with title 'Getting Started'), and /blog/styles.css (blog-specific styles).",
        timeout: 90000,
        assertions: [
          { type: 'file_exists', path: '/blog/index.html', description: 'Blog index created' },
          { type: 'file_exists', path: '/blog/post-1.html', description: 'Blog post created' },
          { type: 'file_exists', path: '/blog/styles.css', description: 'Blog styles created' },
          { type: 'file_matches', path: '/blog/post-1.html', pattern: 'Getting Started', description: 'Post has correct title' },
        ],
      },
    ],
  },
  {
    id: 'seq-multi-tool',
    name: 'Multi-Tool: Combined Operations',
    category: 'multi-tool',
    setupFiles: standardSetup,
    steps: [
      {
        id: 'seq-multi-read-edit',
        name: 'Read then edit file',
        prompt: 'Read styles.css, then add a .card class with box shadow and border radius.',
        timeout: 60000,
        assertions: [
          { type: 'file_matches', path: '/styles.css', pattern: '\\.card', description: 'Has .card class' },
          { type: 'file_matches', path: '/styles.css', pattern: 'box-shadow', description: 'Has box-shadow' },
        ],
      },
      {
        id: 'seq-multi-search-replace',
        name: 'Search then replace values',
        prompt: "Find all files containing 'color' with rg, then change the color values in styles.css to use CSS variables.",
        timeout: 60000,
        assertions: [
          { type: 'file_matches', path: '/styles.css', pattern: 'var\\(--|--[a-z]', description: 'Uses CSS variables' },
        ],
      },
      {
        id: 'seq-multi-sitemap',
        name: 'Discover files and generate sitemap',
        prompt: 'Create sitemap.xml listing all HTML files in the project — use find to discover them, then write the XML.',
        timeout: 60000,
        assertions: [
          { type: 'file_exists', path: '/sitemap.xml', description: 'sitemap.xml created' },
          { type: 'file_matches', path: '/sitemap.xml', pattern: 'index\\.html|<loc>.*</loc>', description: 'Sitemap lists index.html' },
        ],
      },
      {
        id: 'seq-multi-scaffold',
        name: 'Scaffold project structure',
        prompt: 'Create /pages/ with index.html and about.html, /assets/ with main.css, and write content in each file.',
        timeout: 60000,
        assertions: [
          { type: 'file_exists', path: '/pages/index.html', description: 'pages/index.html created' },
          { type: 'file_exists', path: '/pages/about.html', description: 'pages/about.html created' },
          { type: 'file_exists', path: '/assets/main.css', description: 'assets/main.css created' },
        ],
      },
      {
        id: 'seq-multi-refactor',
        name: 'Refactor inline styles to file',
        prompt: 'Read index.html, extract the inline CSS (the <style> block) into a new file /extracted.css, and replace the style tag with a link tag pointing to extracted.css.',
        timeout: 60000,
        assertions: [
          { type: 'file_contains', path: '/index.html', value: '<link', description: 'Has link tag' },
          { type: 'file_exists', path: '/extracted.css', description: 'extracted.css created' },
        ],
      },
    ],
  },
  {
    id: 'seq-bash-preview',
    name: 'Bash: Compiled Output Inspection',
    category: 'bash',
    setupFiles: handlebarsSetup,
    steps: [
      {
        id: 'seq-preview-home',
        name: 'Fetch and inspect homepage',
        prompt: 'Fetch the compiled homepage using curl and tell me what the page title is.',
        assertions: [
          { type: 'tool_args_match', toolName: 'bash', pattern: 'curl.*localhost', description: 'Used curl to fetch compiled output' },
          { type: 'output_matches', pattern: 'Curl Test Site', description: 'Output contains compiled page title from data.json' },
        ],
      },
      {
        id: 'seq-preview-about',
        name: 'Fetch and inspect subpage',
        prompt: 'Use curl to fetch the compiled about page and check whether the header partial rendered correctly.',
        assertions: [
          { type: 'tool_args_match', toolName: 'bash', pattern: 'curl.*localhost', description: 'Used curl to fetch compiled page' },
          { type: 'output_matches', pattern: 'Site Navigation|header|nav', description: 'Output shows compiled partial content' },
        ],
      },
      {
        id: 'seq-preview-search',
        name: 'Fetch and find navigation elements',
        prompt: 'Use curl to fetch the compiled homepage and find which lines contain navigation elements.',
        assertions: [
          { type: 'tool_args_match', toolName: 'bash', pattern: 'curl.*localhost', description: 'Used curl to fetch compiled output' },
          { type: 'tool_output_matches', toolName: 'bash', pattern: 'nav', description: 'Output contains nav matches' },
        ],
      },
    ],
  },
  {
    id: 'seq-entity-editing',
    name: 'Entity Replacement',
    category: 'file-editing',
    setupFiles: {
      '/.PROMPT.md': defaultPromptMd,
      '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acme Corp</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; }
    </style>
</head>
<body>
    <header class="site-header">
        <div class="header-inner">
            <span class="logo">OldBrand</span>
            <nav>
                <ul>
                    <li><a href="#home">Home</a></li>
                    <li><a href="#about">About</a></li>
                    <li><a href="#services">Services</a></li>
                </ul>
            </nav>
            <div class="header-actions">
                <a href="#login" class="login-link">Log In</a>
            </div>
        </div>
    </header>
    <main>
        <section class="hero">
            <h1>Welcome to Acme</h1>
            <p>Building the future, one product at a time.</p>
        </section>
        <section class="features">
            <div class="feature-card"><h3>Fast</h3><p>Lightning quick performance.</p></div>
            <div class="feature-card"><h3>Secure</h3><p>Enterprise-grade security.</p></div>
            <div class="feature-card"><h3>Scalable</h3><p>Grows with your business.</p></div>
        </section>
    </main>
    <footer><p>&copy; 2024 Acme Corp</p></footer>
</body>
</html>`,
      '/styles.css': basicCSSFile,
      '/script.js': `
const API_URL = 'https://api.example.com';

function renderCards(container, items) {
    container.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = '<h3>' + item.title + '</h3><p>' + item.desc + '</p>';
        container.appendChild(div);
    });
}

function initApp() {
    const container = document.getElementById('cards');
    const items = [
        { title: 'Card 1', desc: 'Description 1' },
        { title: 'Card 2', desc: 'Description 2' },
        { title: 'Card 3', desc: 'Description 3' },
    ];
    renderCards(container, items);
}

document.addEventListener('DOMContentLoaded', initApp);`,
    },
    steps: [
      {
        id: 'seq-entity-js-function',
        name: 'Replace JS function by name',
        prompt: "In script.js, replace the function renderCards with a new implementation that creates Bootstrap-style cards with image, title, and description. Keep all other code unchanged.",
        assertions: [
          { type: 'file_matches', path: '/script.js', pattern: 'img|image|src', description: 'New renderCards has image support' },
          { type: 'file_contains', path: '/script.js', value: 'initApp', description: 'initApp function preserved' },
          { type: 'file_contains', path: '/script.js', value: 'API_URL', description: 'API_URL constant preserved' },
          { type: 'file_contains', path: '/script.js', value: 'DOMContentLoaded', description: 'Event listener preserved' },
        ],
      },
      {
        id: 'seq-entity-html-header',
        name: 'Replace HTML header section',
        prompt: "Replace the entire <header> element in index.html with a new sticky header that has a logo 'Acme Co', nav links (Products, Pricing, Blog, Contact), and a 'Sign Up' CTA button. Keep all other page content unchanged.",
        assertions: [
          { type: 'file_contains', path: '/index.html', value: 'Acme Co', description: 'Has new logo text' },
          { type: 'file_matches', path: '/index.html', pattern: 'Products', description: 'Has Products link' },
          { type: 'file_matches', path: '/index.html', pattern: 'Pricing', description: 'Has Pricing link' },
          { type: 'file_matches', path: '/index.html', pattern: 'Sign Up', description: 'Has Sign Up CTA' },
          { type: 'file_contains', path: '/index.html', value: 'Welcome to Acme', description: 'Hero section preserved' },
          { type: 'file_contains', path: '/index.html', value: 'feature-card', description: 'Features section preserved' },
          { type: 'file_not_contains', path: '/index.html', value: 'OldBrand', description: 'Old brand removed' },
        ],
      },
    ],
  },
  {
    id: 'seq-agent',
    name: 'Agent: Sub-Agent Operations',
    category: 'agent',
    setupFiles: standardSetup,
    steps: [
      {
        id: 'seq-agent-explore-edit',
        name: 'Explore colors then create design tokens',
        prompt: "Step 1: Use agent explore to find all color values (hex codes like #xxx) used across all project files.\nStep 2: After the explore result comes back, use that information to create /design-tokens.css with CSS custom properties (--primary, --secondary, --bg, --text) based on the colors found.\nStep 3: Update styles.css to import and use those CSS variables instead of hardcoded hex values.\nYou must do steps 2 and 3 yourself after the explore agent returns — the explore agent only reads files, it cannot edit them.",
        timeout: 120000,
        assertions: [
          { type: 'file_exists', path: '/design-tokens.css', description: 'Design tokens file created' },
          { type: 'file_matches', path: '/design-tokens.css', pattern: '--primary', description: 'Has primary variable' },
          { type: 'file_matches', path: '/styles.css', pattern: 'var\\(--', description: 'styles.css uses CSS variables' },
          { type: 'tool_args_match', toolName: 'bash', pattern: '(?:agent|delegate).*explore', description: 'Used agent explore' },
        ],
      },
      {
        id: 'seq-agent-plan-implement',
        name: 'Plan gallery then implement it',
        prompt: "Step 1: Use agent plan to analyze the current project and recommend how to add a responsive image gallery section.\nStep 2: After the plan result comes back, implement the gallery yourself in index.html — add at least 4 placeholder images in a CSS grid that adapts to screen size with a @media query.\nThe plan agent only analyzes — you must write the code yourself in step 2.",
        timeout: 120000,
        assertions: [
          { type: 'file_matches', path: '/index.html', pattern: 'gallery|grid', description: 'Has gallery section' },
          { type: 'file_matches', path: '/index.html', pattern: 'img|image', description: 'Has images' },
          { type: 'file_matches_any', paths: ['/index.html', '/styles.css'], pattern: '@media|grid|flex', description: 'Has responsive layout' },
          { type: 'tool_args_match', toolName: 'bash', pattern: '(?:agent|delegate).*plan', description: 'Used agent plan' },
        ],
      },
      {
        id: 'seq-agent-parallel-tasks',
        name: 'Three parallel agent tasks',
        prompt: "Use a single agent task command with three prompts to make independent changes in parallel:\n  agent task \"In /index.html, add a dark mode toggle button inside the nav element\" \"In /styles.css, add a .card class with padding: 1rem, box-shadow: 0 2px 8px rgba(0,0,0,.1), border-radius: 8px, and a :hover state that lifts it up\" \"Create /footer.html with copyright '2024 MyBrand', three social media links, and a newsletter signup form\"",
        timeout: 120000,
        assertions: [
          { type: 'file_matches', path: '/index.html', pattern: 'dark.*mode|theme.*toggle|toggle.*dark', description: 'Has dark mode toggle' },
          { type: 'file_matches', path: '/styles.css', pattern: '\\.card', description: 'Has .card class' },
          { type: 'file_matches', path: '/styles.css', pattern: 'box-shadow', description: 'Card has box-shadow' },
          { type: 'file_exists', path: '/footer.html', description: 'Footer partial created' },
          { type: 'file_matches', path: '/footer.html', pattern: 'MyBrand|2024', description: 'Footer has copyright' },
          { type: 'tool_args_match', toolName: 'bash', pattern: '(?:agent|delegate).*task', description: 'Used agent task' },
        ],
      },
    ],
  },
  {
    id: 'seq-agent-multipage',
    name: 'Agent: Multi-Page Consistency',
    category: 'agent',
    setupFiles: {
      '/.PROMPT.md': defaultPromptMd,
      '/index.html': `<!DOCTYPE html><html><head><title>Home</title></head><body><main><h1>Home Page</h1><p>Welcome to our site.</p></main></body></html>`,
      '/about.html': `<!DOCTYPE html><html><head><title>About</title></head><body><main><h1>About Us</h1><p>Learn more about us.</p></main></body></html>`,
      '/contact.html': `<!DOCTYPE html><html><head><title>Contact</title></head><body><main><h1>Contact</h1><p>Get in touch.</p></main></body></html>`,
    },
    steps: [
      {
        id: 'seq-agent-consistent-nav',
        name: 'Add consistent nav across pages',
        prompt: "Use a single agent task command with three prompts to add the same navigation bar to each page in parallel:\n  agent task \"Add a nav bar with logo 'SiteKit' and links to index.html, about.html, contact.html at the top of /index.html body\" \"Add a nav bar with logo 'SiteKit' and links to index.html, about.html, contact.html at the top of /about.html body\" \"Add a nav bar with logo 'SiteKit' and links to index.html, about.html, contact.html at the top of /contact.html body\"",
        timeout: 120000,
        assertions: [
          { type: 'file_matches', path: '/index.html', pattern: 'nav|SiteKit', description: 'Homepage has nav' },
          { type: 'file_matches', path: '/about.html', pattern: 'nav|SiteKit', description: 'About has nav' },
          { type: 'file_matches', path: '/contact.html', pattern: 'nav|SiteKit', description: 'Contact has nav' },
          { type: 'file_matches', path: '/index.html', pattern: 'about\\.html|About', description: 'Homepage links to about' },
          { type: 'tool_args_match', toolName: 'bash', pattern: '(?:agent|delegate)', description: 'Used agent command' },
        ],
      },
      {
        id: 'seq-agent-parallel-pages',
        name: 'Create new pages matching existing style',
        prompt: "The project now has a consistent nav bar. Use agent task to create two new pages that include the same SiteKit nav bar: /gallery.html with an 'Our Work' h1 and a grid of 4 placeholder images, and /faq.html with a 'FAQ' h1 and at least 5 question/answer pairs.",
        timeout: 120000,
        assertions: [
          { type: 'file_exists', path: '/gallery.html', description: 'Gallery page created' },
          { type: 'file_matches', path: '/gallery.html', pattern: 'Our Work|Gallery', description: 'Gallery has heading' },
          { type: 'file_exists', path: '/faq.html', description: 'FAQ page created' },
          { type: 'file_matches', path: '/faq.html', pattern: 'FAQ|Frequently', description: 'FAQ has heading' },
          { type: 'tool_args_match', toolName: 'bash', pattern: '(?:agent|delegate).*task', description: 'Used agent task' },
        ],
      },
    ],
  },
  {
    id: 'seq-compaction',
    name: 'Compaction: Context Continuity',
    category: 'compaction',
    requires: ['compaction'],
    setupFiles: { '/.PROMPT.md': defaultPromptMd },
    steps: [
      {
        id: 'seq-compaction-build-site',
        name: 'Build site and trigger compaction',
        prompt: "Create a website for 'Nimbus Analytics'. Create 4 pages: /index.html (hero section, 3 feature cards), /about.html (company description, team section with 3 people), /pricing.html (3-tier pricing table), /contact.html (contact form). Create /styles.css shared across all pages. Every page must include nav links to all other pages and the company name 'Nimbus Analytics' in the header.",
        timeout: 180000,
        assertions: [
          { type: 'file_exists', path: '/index.html', description: 'Homepage created' },
          { type: 'file_exists', path: '/about.html', description: 'About page created' },
          { type: 'file_exists', path: '/pricing.html', description: 'Pricing page created' },
          { type: 'file_exists', path: '/contact.html', description: 'Contact page created' },
          { type: 'file_exists', path: '/styles.css', description: 'Shared stylesheet created' },
          { type: 'file_matches', path: '/contact.html', pattern: 'index\\.html|about\\.html', description: 'Last page has nav links' },
          { type: 'file_matches', path: '/contact.html', pattern: 'Nimbus', description: 'Brand name preserved' },
        ],
      },
      {
        id: 'seq-compaction-expand',
        name: 'Expand project after compaction',
        prompt: "Add a /docs/getting-started.html page with setup instructions for macOS and Linux, and a /docs/api-reference.html page documenting 4 API endpoints. Both docs pages must include the site-wide nav from the main pages and mention 'Nimbus Analytics'.",
        timeout: 120000,
        assertions: [
          { type: 'file_exists', path: '/docs/getting-started.html', description: 'Getting started created' },
          { type: 'file_exists', path: '/docs/api-reference.html', description: 'API reference created' },
          { type: 'file_matches', path: '/docs/api-reference.html', pattern: 'Nimbus', description: 'Brand name preserved through compaction' },
          { type: 'file_matches', path: '/docs/getting-started.html', pattern: 'index\\.html|about\\.html', description: 'Docs have site nav (context survived compaction)' },
        ],
      },
    ],
  },
];
