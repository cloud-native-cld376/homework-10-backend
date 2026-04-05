import mongoose from 'mongoose';
import DatabaseProvider from './DatabaseProvider.js';
import { User, Todo } from './models/mongoModels.js';

function toPlain(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    text: o.text,
    completed: Boolean(o.completed),
  };
}

class MongoDBProvider extends DatabaseProvider {
  async connect() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is required when DB_TYPE=mongodb');
    }
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  }

  async disconnect() {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  async createUser(input) {
    const doc = await User.create({
      email: input.email,
      passwordHash: input.passwordHash,
    });
    return { id: String(doc._id), email: doc.email };
  }

  async findUserByEmail(email) {
    const doc = await User.findOne({ email }).lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      email: doc.email,
      passwordHash: doc.passwordHash,
    };
  }

  async getTodos(userId) {
    const docs = await Todo.find({ user: userId }).sort({ createdAt: -1 }).lean();
    return docs.map((d) => ({
      id: String(d._id),
      text: d.text,
      completed: Boolean(d.completed),
    }));
  }

  async getTodoById(userId, id) {
    const doc = await Todo.findOne({ _id: id, user: userId }).lean();
    return doc
      ? { id: String(doc._id), text: doc.text, completed: Boolean(doc.completed) }
      : null;
  }

  async createTodo(userId, input) {
    const doc = await Todo.create({
      user: userId,
      text: input.text.trim(),
      completed: Boolean(input.completed),
    });
    return toPlain(doc);
  }

  async updateTodo(userId, id, patch) {
    const updates = {};
    if (typeof patch.text === 'string') updates.text = patch.text.trim();
    if (typeof patch.completed === 'boolean') updates.completed = patch.completed;
    if (Object.keys(updates).length === 0) {
      const current = await Todo.findOne({ _id: id, user: userId }).lean();
      return current
        ? { id: String(current._id), text: current.text, completed: current.completed }
        : null;
    }
    const doc = await Todo.findOneAndUpdate({ _id: id, user: userId }, { $set: updates }, { new: true }).lean();
    return doc
      ? { id: String(doc._id), text: doc.text, completed: doc.completed }
      : null;
  }

  async deleteTodo(userId, id) {
    const res = await Todo.findOneAndDelete({ _id: id, user: userId });
    return Boolean(res);
  }
}

export default MongoDBProvider;
