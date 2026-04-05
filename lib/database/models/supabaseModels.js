const TABLES = {
  todos: 'todos',
};

function mapRowToTodo(row) {
  return {
    id: String(row.id),
    text: row.text,
    completed: Boolean(row.completed),
  };
}

export { TABLES, mapRowToTodo };
