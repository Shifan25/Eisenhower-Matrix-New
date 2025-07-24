// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDIaC6hiNxTL2RLmprzQFZchcFKR7R-_HH0",
  authDomain: "eisenhower-matrix-f4901.firebaseapp.com",
  projectId: "eisenhower-matrix-f4901",
  storageBucket: "eisenhower-matrix-f4901.appspot.com",
  messagingSenderId: "700179285214",
  appId: "1:700179285214:web:bcf86cb058a7fbf268ae4f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Choose any constant value – must be same on all devices
const USER_ID = "shifan@example.com";

/* --------- Real-time listener --------- */
export function watchTasks(callback) {
  const q = query(collection(db, "tasks"), where("user", "==", USER_ID));
  return onSnapshot(q, snap => {
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(tasks);
  });
}

/* --------- CRUD operations (drop id before saving) --------- */
export async function addTaskRemote(task) {
  const { id, ...data } = task;            // remove undefined id
  await addDoc(collection(db, "tasks"), { ...data, user: USER_ID });
}

export async function updateTaskRemote(task) {
  const { id, ...data } = task;            // don't store id inside doc
  await updateDoc(doc(db, "tasks", id), data);
}

export async function deleteTaskRemote(id) {
  await deleteDoc(doc(db, "tasks", id));
}
