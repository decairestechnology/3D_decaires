import { initializeApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'

// Preencha as variáveis em .env (veja .env.example) com os dados do seu projeto Firebase.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const configOk = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
)

if (!configOk) {
  // eslint-disable-next-line no-console
  console.error(
    '[Firebase] Variáveis VITE_FIREBASE_* ausentes ou incompletas. ' +
    'Confira se existe um arquivo .env na raiz do projeto (copiado de .env.example, com os valores reais) ' +
    'e reinicie o servidor (`npm run dev`). Localmente as variáveis só são lidas quando o servidor sobe.'
  )
}

let firebaseApp: FirebaseApp | undefined
let auth: Auth

try {
  firebaseApp = initializeApp(firebaseConfig)
  auth = getAuth(firebaseApp)
} catch (err) {
  // Nunca deixa isso derrubar a aplicação inteira (tela em branco) — melhor mostrar
  // a tela de login com uma falha clara do que quebrar tudo silenciosamente.
  // eslint-disable-next-line no-console
  console.error('[Firebase] Falha ao inicializar:', err)
  auth = {} as Auth
}

export { firebaseApp, auth }
