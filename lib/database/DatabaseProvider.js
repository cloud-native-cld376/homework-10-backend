
class DatabaseProvider {
  async connect() {
    throw new Error('connect() must be implemented');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented');
  }

  async getTodos() {
    throw new Error('getTodos() must be implemented');
  }

  async getTodoById(id) {
    throw new Error('getTodoById() must be implemented');
  }

  async createTodo(input) {
    throw new Error('createTodo() must be implemented');
  }

  async updateTodo(id, patch) {
    throw new Error('updateTodo() must be implemented');
  }
  async deleteTodo(id) {
    throw new Error('deleteTodo() must be implemented');
  }
}

export default DatabaseProvider;
