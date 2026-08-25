import mongoose from "mongoose";

// Import all models to ensure they are registered with Mongoose
// This must be done before any queries are executed
import "@/models";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const globalWithMongoose = global as typeof global & {
  mongooseCache?: MongooseCache;
};

const cached = globalWithMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};

globalWithMongoose.mongooseCache = cached;

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;

  // Cleanup: Drop legacy index 'code_1' if exists (schema migration)
  try {
    const indexes = await cached.conn.connection.db.collection('customers').indexes();
    const hasCodeIndex = indexes.some(idx => idx.name === 'code_1');
    if (hasCodeIndex) {
      await cached.conn.connection.db.collection('customers').dropIndex('code_1');
      console.log('[MongoDB] Dropped legacy index: code_1');
    }
  } catch (err) {
    console.warn('[MongoDB] Could not drop legacy index:', err);
  }

  return cached.conn;
}