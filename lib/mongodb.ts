import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI as string

if (!MONGODB_URI) {
  throw new Error('La variable d\'environnement MONGODB_URI est manquante.')
}

// Cache global pour éviter les connexions multiples en développement (hot reload Next.js)
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
}

const cache = global._mongooseCache ?? { conn: null, promise: null }
global._mongooseCache = cache

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
  }

  cache.conn = await cache.promise
  return cache.conn
}
