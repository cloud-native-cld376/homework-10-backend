import { createClient } from '@supabase/supabase-js';
import DatabaseProvider from './DatabaseProvider.js';
import { TABLES, mapRowToTodo } from './models/supabaseModels.js';

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

  async getTodos() {
    const { data, error } = await this.client
      .from(TABLES.todos)
      .select('id, text, completed')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRowToTodo);
  }

  async getTodoById(id) {
    const { data, error } = await this.client
      .from(TABLES.todos)
      .select('id, text, completed')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRowToTodo(data) : null;
  }

  async createTodo(input) {
    const row = {
      text: input.text.trim(),
      completed: Boolean(input.completed),
    };
    const { data, error } = await this.client.from(TABLES.todos).insert(row).select('id, text, completed').single();
    if (error) throw error;
    return mapRowToTodo(data);
  }

  async updateTodo(id, patch) {
    const updates = {};
    if (typeof patch.text === 'string') updates.text = patch.text.trim();
    if (typeof patch.completed === 'boolean') updates.completed = patch.completed;
    if (Object.keys(updates).length === 0) {
      const { data, error } = await this.client
        .from(TABLES.todos)
        .select('id, text, completed')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRowToTodo(data) : null;
    }
    const { data, error } = await this.client
      .from(TABLES.todos)
      .update(updates)
      .eq('id', id)
      .select('id, text, completed')
      .maybeSingle();
    if (error) throw error;
    return data ? mapRowToTodo(data) : null;
  }

  async deleteTodo(id) {
    const { data, error } = await this.client.from(TABLES.todos).delete().eq('id', id).select('id');
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  }
}

export default SupabaseProvider;
