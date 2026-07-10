import { neon } from '@neondatabase/serverless'

// Conexão com o Neon. A variável DATABASE_URL vem das env vars da Vercel
// (mesma que você configura em Project Settings → Environment Variables).
if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error(
    '[api] DATABASE_URL não encontrada. Confere Vercel → Settings → Environment Variables ' +
    '(e lembra de fazer Redeploy depois de adicionar/mudar uma variável).'
  )
}

export const sql = neon(process.env.DATABASE_URL ?? '')
