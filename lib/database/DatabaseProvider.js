class DatabaseProvider {
  async connect() {
    throw new Error('connect() must be implemented');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented');
  }

  /**
   * @param {{ email: string, passwordHash: string }} input
   * @returns {Promise<{ id: string, email: string }>}
   */
  async createUser(input) {
    throw new Error('createUser() must be implemented');
  }

  /**
   * @param {string} email normalized (e.g. lowercased)
   * @returns {Promise<{ id: string, email: string, passwordHash: string } | null>}
   */
  async findUserByEmail(email) {
    throw new Error('findUserByEmail() must be implemented');
  }

  /**
   * @param {string} userId
   * @returns {Promise<Array<{ id: string, text: string, completed: boolean }>>}
   */
  async getTodos(userId) {
    throw new Error('getTodos() must be implemented');
  }

  /**
   * @param {string} userId
   * @param {string} todoId
   */
  async getTodoById(userId, todoId) {
    throw new Error('getTodoById() must be implemented');
  }

  /**
   * @param {string} userId
   * @param {{ text: string, completed?: boolean }} input
   */
  async createTodo(userId, input) {
    throw new Error('createTodo() must be implemented');
  }

  /**
   * @param {string} userId
   * @param {string} todoId
   * @param {{ text?: string, completed?: boolean }} patch
   */
  async updateTodo(userId, todoId, patch) {
    throw new Error('updateTodo() must be implemented');
  }

  /**
   * @param {string} userId
   * @param {string} todoId
   */
  async deleteTodo(userId, todoId) {
    throw new Error('deleteTodo() must be implemented');
  }
}

export default DatabaseProvider;
