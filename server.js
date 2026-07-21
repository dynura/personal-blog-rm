require('dotenv').config();

const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ARTICLES_DIR = path.join(__dirname, 'articles');

// Ensure articles directory exists
if (!fs.existsSync(ARTICLES_DIR)) {
    fs.mkdirSync(ARTICLES_DIR);
}

// Configuration & Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Single Session Middleware using FileStore
app.use(session({
    store: new FileStore({ 
        path: './sessions',
        retries: 0,
        logFn: function() {}
    }),
    secret: process.env.SESSION_SECRET || 'default_fallback_secret',
    resave: false,
    saveUninitialized: false
}));

// Admin Credentials
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

// Auth Protection Middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/login');
}

// Helper Functions for Storage
function getAllArticles() {
    const files = fs.readdirSync(ARTICLES_DIR);
    const articles = [];

    files.forEach(file => {
        if (file.endsWith('.json')) {
            const content = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8');
            articles.push(JSON.parse(content));
        }
    });

    // Sort newest date first
    return articles.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getArticleById(id) {
    const filePath = path.join(ARTICLES_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return null;
}

function saveArticle(article) {
    const filePath = path.join(ARTICLES_DIR, `${article.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(article, null, 4));
}

function deleteArticleById(id) {
    const filePath = path.join(ARTICLES_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

// --- GUEST ROUTES ---

// 1. Home Page
app.get('/', (req, res) => {
    res.redirect('/home');
});

app.get('/home', (req, res) => {
    const articles = getAllArticles();
    res.render('home', { articles });
});

// 2. Article Page
app.get('/article/:id', (req, res) => {
    const article = getArticleById(req.params.id);
    if (!article) return res.status(404).send('Article not found');

    // Check if the request came from /admin or query param, or if the user is a logged-in admin
    const fromAdmin = req.query.from === 'admin' || (req.get('Referrer') && req.get('Referrer').includes('/admin'));
    const backUrl = fromAdmin ? '/admin' : '/home';

    res.render('article', { article, backUrl });
});

// --- AUTHENTICATION ROUTES ---

app.get('/login', (req, res) => {
    // Destroy active session so visiting /login forces a fresh login
    if (req.session) {
        req.session.destroy();
    }
    res.render('login', { error: null });
})

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.render('login', { error: 'Failed to save session. Try again.' });
            }
            res.redirect('/admin');
        });
    } else {
        res.render('login', { error: 'Invalid username or password' });
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/home');
});

// --- ADMIN ROUTES ---

// 3. Admin Dashboard
app.get('/admin', requireAuth, (req, res) => {
    const articles = getAllArticles();
    res.render('admin', { articles });
});

// 4. Add Article Form & Handler
app.get('/new', requireAuth, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    res.render('new', { 
        article: { 
            title: '', 
            content: '', 
            date: today 
        } 
    });
});

app.post('/new', requireAuth, (req, res) => {
    const { title, content } = req.body;
    const id = Date.now().toString();
    const date = new Date().toISOString().split('T')[0]; // Auto-generate creation date

    saveArticle({ id, title, date, content });
    res.redirect('/admin');
});

// 5. Edit Article Form & Handler
app.get('/edit/:id', requireAuth, (req, res) => {
    const article = getArticleById(req.params.id);
    if (!article) return res.status(404).send('Article not found');
    res.render('edit', { article });
});

app.post('/edit/:id', requireAuth, (req, res) => {
    const { title, content } = req.body;
    const existingArticle = getArticleById(req.params.id);

    if (!existingArticle) return res.status(404).send('Article not found');

    const editedAt = new Date().toISOString().split('T')[0]; // Auto-generate edited date

    saveArticle({
        ...existingArticle,
        title,
        content,
        editedAt
    });

    res.redirect('/admin');
});

// 6. Delete Article Handler
app.post('/delete/:id', requireAuth, (req, res) => {
    deleteArticleById(req.params.id);
    res.redirect('/admin');
});

const server = app.listen(PORT, () => {
    console.log(`Personal Blog running at http://localhost:${PORT}`);
});