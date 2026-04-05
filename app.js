import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { engine } from 'express-handlebars';
import { createDatabaseProvider } from './lib/database/createDatabaseProvider.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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

async function renderHome(res, db, flash) {
  let todos = [];
  let error = flash?.error;
  try {
    todos = await db.getTodos();
  } catch (e) {
    error = error || e.message || 'Failed to load todos';
  }
  res.render('home', {
    title: 'Todos',
    todos,
    error,
    success: flash?.success,
    dbType: process.env.DB_TYPE,
  });
}

async function start() {
  const db = createDatabaseProvider();
  await db.connect();

  app.use(dbMiddleware(db));

  app.get('/', async (req, res) => {
    await renderHome(res, req.db, null);
  });

  app.post('/todos', async (req, res) => {
    const text = (req.body.text || '').trim();
    if (!text) {
      return renderHome(res, req.db, { error: 'Todo text cannot be empty' });
    }
    try {
      await req.db.createTodo({ text, completed: false });
      return renderHome(res, req.db, { success: 'Todo added' });
    } catch (e) {
      return renderHome(res, req.db, { error: e.message || 'Could not create todo' });
    }
  });

  app.post('/todos/:id/toggle', async (req, res) => {
    const { id } = req.params;
    try {
      const current = await req.db.getTodoById(id);
      if (!current) {
        return renderHome(res, req.db, { error: 'Todo not found' });
      }
      await req.db.updateTodo(id, { completed: !current.completed });
      return res.redirect('/');
    } catch (e) {
      return renderHome(res, req.db, { error: e.message || 'Could not update todo' });
    }
  });

  app.post('/todos/:id/update-text', async (req, res) => {
    const { id } = req.params;
    const text = (req.body.text || '').trim();
    if (!text) {
      return renderHome(res, req.db, { error: 'Todo text cannot be empty' });
    }
    try {
      const updated = await req.db.updateTodo(id, { text });
      if (!updated) {
        return renderHome(res, req.db, { error: 'Todo not found' });
      }
      return res.redirect('/');
    } catch (e) {
      return renderHome(res, req.db, { error: e.message || 'Could not update todo' });
    }
  });

  app.post('/todos/:id/delete', async (req, res) => {
    const { id } = req.params;
    try {
      await req.db.deleteTodo(id);
      return res.redirect('/');
    } catch (e) {
      return renderHome(res, req.db, { error: e.message || 'Could not delete todo' });
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
