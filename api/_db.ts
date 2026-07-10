import { neon } from '@neondatabase/serverless'

// Conexão com o Neon. A variável DATABASE_URL vem das env vars da Vercel
// (mesma que você configura em Project Settings → Environment Variables).
export const sql = neon(process.env.DATABASE_URL!)
