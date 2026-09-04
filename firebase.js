import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {

  apiKey: "AIzaSyDf8QPGWVbqbFtkfjv2xoRdCZueRcJ6Ym0",

  authDomain: "my-chat-app-9d51c.firebaseapp.com",

  projectId: "my-chat-app-9d51c",

  storageBucket: "my-chat-app-9d51c.firebasestorage.app",

  messagingSenderId: "644218222140",

  appId: "1:644218222140:web:437905550960a3ab957539"

};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };