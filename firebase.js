// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "PASTE-HERE",
  authDomain: "PASTE-HERE",
  projectId: "PASTE-HERE",
  storageBucket: "PASTE-HERE",
  messagingSenderId: "PASTE-HERE",
  appId: "PASTE-HERE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// *** THIS IS THE “USER ID”. Just choose a string and keep it the same on all devices. ***
const USER_ID = "shifan@example.com";

// Listen to tasks in Firestore for this user
export function watchTasks(callback) {
  const q = query(collection(db, "tasks"), where("user", "==", USER_ID));
  return onSnapshot(q, snap => {
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(tasks);
  });
}

export async function addTaskRemote(task) {
  await addDoc(collection(db, "tasks"), { ...task, user: USER_ID });
}
export async function updateTaskRemote(task) {
  await updateDoc(doc(db, "tasks", task.id), task);
}
export async function deleteTaskRemote(id) {
  await deleteDoc(doc(db, "tasks", id));
}
