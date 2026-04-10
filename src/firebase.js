import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
};
export async function executeTursoQuery(sql, args = []) {
  const TURSO_URL = import.meta.env.VITE_TURSO_URL;
  const TURSO_TOKEN = import.meta.env.VITE_TURSO_TOKEN;
  const formattedArgs = args.map(arg => {
    if (arg === null || arg === undefined) return { type: "null" };
    if (typeof arg === "number") {
      return Number.isInteger(arg) ? { type: "integer", value: arg.toString() } : { type: "float", value: arg };
    }
    return { type: "text", value: arg.toString() };
  });
  const response = await fetch(TURSO_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TURSO_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: formattedArgs } },
        { type: "close" }
      ]
    })
  });
  const data = await response.json();
  if (data.results && data.results[0] && data.results[0].type === "ok") {
    const result = data.results[0].response.result;
    let rows = [];
    if (result && result.cols) {
      rows = result.rows.map(row => {
        let obj = {};
        result.cols.forEach((col, idx) => {
          obj[col.name] = row[idx].value;
        });
        return obj;
      });
    }
    return { rows, lastInsertRowid: result ? result.last_insert_rowid : null };
  }
  console.error("Turso error", JSON.stringify(data));
  throw new Error("Turso query failed");
}