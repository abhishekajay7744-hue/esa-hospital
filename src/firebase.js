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
  let TURSO_URL = import.meta.env.VITE_TURSO_URL;
  const TURSO_TOKEN = import.meta.env.VITE_TURSO_TOKEN;

  // Auto-fix URL formatting for the user
  if (TURSO_URL) {
    TURSO_URL = TURSO_URL.replace("libsql://", "https://");
    if (!TURSO_URL.endsWith("/v2/pipeline")) {
      // Remove trailing slash if present then append pipeline endpoint
      TURSO_URL = TURSO_URL.replace(/\/$/, "") + "/v2/pipeline";
    }
  }
  const formattedArgs = args.map(arg => {
    if (arg === null || arg === undefined) return { type: "null" };
    if (typeof arg === "number") {
      return Number.isInteger(arg) ? { type: "integer", value: arg.toString() } : { type: "float", value: arg };
    }
    return { type: "text", value: arg.toString() };
  });
  console.log("Executing Turso Query to:", TURSO_URL);
  if (!TURSO_URL || !TURSO_TOKEN) {
    console.error("TURSO_URL or TURSO_TOKEN is missing in environment variables!");
    throw new Error("Missing Turso configuration");
  }
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
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Turso HTTP Error ${response.status}:`, errorText);
    throw new Error(`Turso HTTP Error: ${response.status}`);
  }

  const data = await response.json();
  console.log("Turso Response Data:", data);
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