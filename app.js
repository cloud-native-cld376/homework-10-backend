import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { engine } from 'express-handlebars';
import { createDatabaseProvider } from './lib/database/createDatabaseProvider.js';
import { attachSessionUser, requireAuth, redirectIfAuthed } from './lib/middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  })
);

app.use(attachSessionUser);

app.engine(
  'hbs',
  engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials'),
  })
);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

function dbMiddleware(provider) {
  return (req, res, next) => {
    req.db = provider;
    next();
  };
}

function userId(req) {
  return req.session.userId;
}

/** Store one-shot messages then redirect so refresh does not re-POST (PRG pattern). */
function redirectHomeWithFlash(req, res, { error, success } = {}) {
  if (error) req.session.flashError = error;
  if (success) req.session.flashSuccess = success;
  res.redirect('/');
}

function consumeFlash(req) {
  const flash = {};
  if (req.session.flashError) {
    flash.error = req.session.flashError;
    delete req.session.flashError;
  }
  if (req.session.flashSuccess) {
    flash.success = req.session.flashSuccess;
    delete req.session.flashSuccess;
  }
  return flash;
}

async function renderHome(res, req, flash = {}) {
  const uid = userId(req);
  let todos = [];
  let error = flash.error;
  let success = flash.success;
  try {
    todos = await req.db.getTodos(uid);
  } catch (e) {
    error = error || e.message || 'Failed to load todos';
  }
  res.render('home', {
    title: 'My todos',
    todos,
    error,
    success,
    dbType: process.env.DB_TYPE,
  });
}

async function start() {
  const db = createDatabaseProvider();
  await db.connect();

  app.use(dbMiddleware(db));

  app.get('/register', redirectIfAuthed, (req, res) => {
    res.render('register', { title: 'Register', error: null });
  });

  app.post('/register', redirectIfAuthed, async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || '';
    const confirm = req.body.confirm || '';

    if (!email || !email.includes('@')) {
      return res.status(400).render('register', { title: 'Register', error: 'Enter a valid email.' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).render('register', {
        title: 'Register',
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }
    if (password !== confirm) {
      return res.status(400).render('register', { title: 'Register', error: 'Passwords do not match.' });
    }

    try {
      const existing = await req.db.findUserByEmail(email);
      if (existing) {
        return res.status(400).render('register', { title: 'Register', error: 'That email is already registered.' });
      }
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await req.db.createUser({ email, passwordHash });
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          return res.status(500).render('register', { title: 'Register', error: 'Could not start session.' });
        }
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        return res.redirect('/');
      });
      return undefined;
    } catch (e) {
      const dup = e.code === 11000 || e.code === '23505';
      return res.status(500).render('register', {
        title: 'Register',
        error: dup ? 'That email is already registered.' : e.message || 'Could not register.',
      });
    }
  });

  app.get('/login', redirectIfAuthed, (req, res) => {
    res.render('login', { title: 'Log in', error: null });
  });

  app.post('/login', redirectIfAuthed, async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).render('login', { title: 'Log in', error: 'Email and password are required.' });
    }

    try {
      const user = await req.db.findUserByEmail(email);
      if (!user) {
        return res.status(400).render('login', { title: 'Log in', error: 'Invalid email or password.' });
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(400).render('login', { title: 'Log in', error: 'Invalid email or password.' });
      }
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          return res.status(500).render('login', { title: 'Log in', error: 'Could not start session.' });
        }
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        return res.redirect('/');
      });
      return undefined;
    } catch (e) {
      return res.status(500).render('login', { title: 'Log in', error: e.message || 'Could not log in.' });
    }
  });

  app.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  });

  app.get('/', requireAuth, async (req, res) => {
    await renderHome(res, req, consumeFlash(req));
  });

  app.post('/todos', requireAuth, async (req, res) => {
    const text = (req.body.text || '').trim();
    if (!text) {
      return redirectHomeWithFlash(req, res, { error: 'Todo text cannot be empty' });
    }
    try {
      await req.db.createTodo(userId(req), { text, completed: false });
      return redirectHomeWithFlash(req, res, { success: 'Todo added' });
    } catch (e) {
      return redirectHomeWithFlash(req, res, { error: e.message || 'Could not create todo' });
    }
  });

  app.post('/todos/:id/toggle', requireAuth, async (req, res) => {
    const { id } = req.params;
    const uid = userId(req);
    try {
      const current = await req.db.getTodoById(uid, id);
      if (!current) {
        return redirectHomeWithFlash(req, res, { error: 'Todo not found' });
      }
      await req.db.updateTodo(uid, id, { completed: !current.completed });
      return res.redirect('/');
    } catch (e) {
      return redirectHomeWithFlash(req, res, { error: e.message || 'Could not update todo' });
    }
  });

  app.post('/todos/:id/update-text', requireAuth, async (req, res) => {
    const { id } = req.params;
    const uid = userId(req);
    const text = (req.body.text || '').trim();
    if (!text) {
      return redirectHomeWithFlash(req, res, { error: 'Todo text cannot be empty' });
    }
    try {
      const updated = await req.db.updateTodo(uid, id, { text });
      if (!updated) {
        return redirectHomeWithFlash(req, res, { error: 'Todo not found' });
      }
      return res.redirect('/');
    } catch (e) {
      return redirectHomeWithFlash(req, res, { error: e.message || 'Could not update todo' });
    }
  });

  app.post('/todos/:id/delete', requireAuth, async (req, res) => {
    const { id } = req.params;
    const uid = userId(req);
    try {
      await req.db.deleteTodo(uid, id);
      return res.redirect('/');
    } catch (e) {
      return redirectHomeWithFlash(req, res, { error: e.message || 'Could not delete todo' });
    }
  });

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT} (DB_TYPE=${process.env.DB_TYPE})`);
  });

  const shutdown = async () => {
    try {
      await db.disconnect();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
