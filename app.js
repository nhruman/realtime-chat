import { db } from './firebase.js';

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- DOM references ----------
const joinScreen = document.getElementById('join-screen');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');

const appShell = document.getElementById('app-shell');
const whoamiBtn = document.getElementById('whoami-btn');
const whoamiName = document.getElementById('whoami-name');

const chatBox = document.getElementById('chat-box');
const inputArea = document.getElementById('input-area');
const messageInput = document.getElementById('message');

// ---------- Identity (per-device, saved locally) ----------
const STORAGE_KEY = 'chat_username';

function getSavedName() {
  return localStorage.getItem(STORAGE_KEY);
}

function saveName(name) {
  localStorage.setItem(STORAGE_KEY, name);
}

let currentUser = getSavedName();

function startApp(name) {
  currentUser = name;
  whoamiName.textContent = name;
  joinScreen.hidden = true;
  appShell.hidden = false;
  messageInput.focus();
}

if (currentUser) {
  startApp(currentUser);
} else {
  joinScreen.hidden = false;
}

joinBtn.addEventListener('click', handleJoin);
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleJoin();
});

function handleJoin() {
  const name = usernameInput.value.trim();
  if (!name) {
    usernameInput.focus();
    return;
  }
  saveName(name);
  startApp(name);
}

whoamiBtn.addEventListener('click', () => {
  const newName = window.prompt('What name should we show for you?', currentUser || '');
  if (newName && newName.trim()) {
    saveName(newName.trim());
    startApp(newName.trim());
  }
});

// ---------- Sending messages ----------
inputArea.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage();
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (text === '' || !currentUser) return;

  messageInput.value = '';

  try {
    await addDoc(collection(db, 'messages'), {
      text,
      sender: currentUser,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Firebase store error:', error);
    messageInput.value = text;
    alert('Could not send message. Check your internet connection or Firebase settings.');
  }
}

window.deleteMessage = async function (id) {
  try {
    await deleteDoc(doc(db, 'messages', id));
  } catch (error) {
    console.error('Delete failed:', error);
  }
};

// ---------- Rendering ----------
function formatTime(timestamp) {
  if (!timestamp || !timestamp.toDate) return '';
  return timestamp.toDate().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function renderMessages(docs) {
  chatBox.innerHTML = '';

  if (docs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No messages yet. Say hi first!';
    chatBox.appendChild(empty);
    return;
  }

  let lastSender = null;

  docs.forEach((docItem) => {
    const data = docItem.data();
    const isOwn = data.sender === currentUser;
    const grouped = data.sender === lastSender;

    const row = document.createElement('div');
    row.className = `row ${isOwn ? 'own' : 'other'}${grouped ? ' grouped' : ''}`;

    if (!isOwn && !grouped) {
      const label = document.createElement('div');
      label.className = 'sender-label';
      label.textContent = data.sender || 'Friend';
      row.appendChild(label);
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = data.text;
    row.appendChild(bubble);

    const meta = document.createElement('div');
    meta.textContent = formatTime(data.createdAt);
    meta.className = 'bubble-time';
    row.appendChild(meta);

    if (isOwn) {
      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = 'Delete';
      del.addEventListener('click', () => window.deleteMessage(docItem.id));
      row.appendChild(del);
    }

    chatBox.appendChild(row);
    lastSender = data.sender;
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

// ---------- Live sync (works for 2, 3, or more friends at once) ----------
const q = query(collection(db, 'messages'), orderBy('createdAt'));

onSnapshot(q, (snapshot) => {
  const docs = [];
  snapshot.forEach((docItem) => docs.push(docItem));
  renderMessages(docs);
});
