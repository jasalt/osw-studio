const basicHTMLTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test App</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
        }
        nav {
            background: #2c3e50;
            padding: 1rem;
        }
        nav ul {
            list-style: none;
            display: flex;
            gap: 2rem;
        }
        nav a {
            color: #ecf0f1;
            text-decoration: none;
        }
        main {
            padding: 2rem;
        }
    </style>
</head>
<body>
    <nav class="main-nav">
        <ul class="nav-list">
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#services">Services</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
    </nav>
    <main class="content">
        <h1 class="page-title">Welcome to Test App</h1>
        <p>This is a test application for validating code generation.</p>
    </main>
    <script>
    </script>
</body>
</html>`;

const basicCSSFile = `/* Additional styles */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.btn {
    display: inline-block;
    padding: 10px 20px;
    background: #007bff;
    color: white;
    text-decoration: none;
    border-radius: 5px;
    border: none;
    cursor: pointer;
}

.btn:hover {
    background: #0056b3;
}`;

const basicJSFile = `
document.addEventListener('DOMContentLoaded', function() {

    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
        });
    });
});`;

export const defaultPromptMd = `You are building a website. Use HTML, CSS, and JavaScript.`;

export const handlebarsSetup: Record<string, string> = {
  '/.PROMPT.md': defaultPromptMd,
  '/index.html': `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>{{site_title}}</title></head>
<body>
{{> header}}
<main><h1>{{page_heading}}</h1><p>Welcome to our site.</p></main>
</body>
</html>`,
  '/about.html': `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>About - {{site_title}}</title></head>
<body>
{{> header}}
<main><h1>About Us</h1><p>We build great things.</p></main>
</body>
</html>`,
  '/templates/header.hbs': `<header><nav class="main-nav">Site Navigation</nav></header>`,
  '/data.json': `{"site_title": "Curl Test Site", "page_heading": "Welcome Home"}`,
  '/styles.css': `body { font-family: sans-serif; }`,
};

export const standardSetup: Record<string, string> = {
  '/.PROMPT.md': defaultPromptMd,
  '/index.html': basicHTMLTemplate,
  '/styles.css': basicCSSFile,
  '/script.js': basicJSFile,
};

export { basicHTMLTemplate, basicCSSFile, basicJSFile };
