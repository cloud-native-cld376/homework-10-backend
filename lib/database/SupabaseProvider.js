import { createClient } from '@supabase/supabase-js';
import DatabaseProvider from './DatabaseProvider.js';
import { TABLES, mapRowToTodo, mapRowToUser } from './models/supabaseModels.js';

class SupabaseProvider extends DatabaseProvider {
  constructor() {
    super();
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY are required when DB_TYPE=supabase');
    }
    this.client = createClient(url, key);
  }

  async connect() {
    return undefined;
  }

  async disconnect() {
    return undefined;
  }

  async createUser(input) {
    const row = {
      email: input.email,
      password_hash: input.passwordHash,
    };
    const { data, error } = await this.client
      .from(TABLES.users)
      .insert(row)
      .select('id, email')
      .single();
    if (error) throw error;
    return { id: String(data.id), email: data.email };
  }

  async findUserByEmail(email) {
    const { data, error } = await this.client
      .from(TABLES.users)
      .select('id, email, password_hash')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRowToUser(data) : null;
  }

  async getTodos(userId) {
    const { data, error } = await this.client
      .from(TABLES.todos)
      .select('id, text, completed')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRowToTodo);
  }

  async getTodoById(userId, id) {
    const { data, error } = await this.client
      .from(TABLES.todos)
      .select('id, text, completed')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRowToTodo(data) : null;
  }

  async createTodo(userId, input) {
    const row = {
      user_id: userId,
      text: input.text.trim(),
      completed: Boolean(input.completed),
    };
    const { data, error } = await this.client
      .from(TABLES.todos)
      .insert(row)
      .select('id, text, completed')
      .single();
    if (error) throw error;
    return mapRowToTodo(data);
  }

  async updateTodo(userId, id, patch) {
    const updates = {};
    if (typeof patch.text === 'string') updates.text = patch.text.trim();
    if (typeof patch.completed === 'boolean') updates.completed = patch.completed;
    if (Object.keys(updates).length === 0) {
      const { data, error } = await this.client
        .from(TABLES.todos)
        .select('id, text, completed')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRowToTodo(data) : null;
    }
    const { data, error } = await this.client
      .from(TABLES.todos)
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, text, completed')
      .maybeSingle();
    if (error) throw error;
    return data ? mapRowToTodo(data) : null;
  }

  async deleteTodo(userId, id) {
    const { data, error } = await this.client
      .from(TABLES.todos)
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  }
}

export default SupabaseProvider;
