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

// ---------- Identity & Room State ----------
const USER_KEY = 'chat_username';
const ROOM_KEY = 'chat_roomcode';

function getSavedName() {
  return localStorage.getItem(USER_KEY);
}

function saveName(name) {
  localStorage.setItem(USER_KEY, name);
}

function getSavedRoom() {
  return localStorage.getItem(ROOM_KEY) || 'general';
}

function saveRoom(room) {
  localStorage.setItem(ROOM_KEY, room);
}

let currentUser = getSavedName();
let currentRoom = getSavedRoom();
let unsubscribe = null;

function startApp(name, roomCode) {
  currentUser = name;
  currentRoom = roomCode || 'general';

  saveName(currentUser);
  saveRoom(currentRoom);

  whoamiName.textContent = `${currentUser} (#${currentRoom})`;
  
  joinScreen.style.display = 'none';
  appShell.style.display = 'flex';
  messageInput.focus();

  // আগের কোনো রুমের রিয়েলটাইম লিসেনার থাকলে বন্ধ করা
  if (unsubscribe) unsubscribe();

  // ডায়নামিক প্রাইভেট রুম পাথ: rooms/{currentRoom}/messages
  const q = query(collection(db, 'rooms', currentRoom, 'messages'), orderBy('createdAt'));
  
  unsubscribe = onSnapshot(q, (snapshot) => {
    const docs = [];
    snapshot.forEach((docItem) => docs.push(docItem));
    renderMessages(docs);
  });
}

// পেজ লোড লজিক
if (currentUser) {
  startApp(currentUser, currentRoom);
} else {
  joinScreen.style.display = 'flex';
  appShell.style.display = 'none';
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

  // রুম কোড ইনপুট প্রম্পট
  const room = window.prompt('Enter Room Code (e.g., 1234):', currentRoom);
  const selectedRoom = room && room.trim() ? room.trim() : 'general';

  startApp(name, selectedRoom);
}

// নাম বা রুম পরিবর্তন করার বাটন
whoamiBtn.addEventListener('click', () => {
  const newName = window.prompt('Change your name:', currentUser || '');
  if (newName && newName.trim()) {
    const newRoom = window.prompt('Change Room Code:', currentRoom);
    const selectedRoom = newRoom && newRoom.trim() ? newRoom.trim() : currentRoom;
    startApp(newName.trim(), selectedRoom);
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
    await addDoc(collection(db, 'rooms', currentRoom, 'messages'), {
      text,
      sender: currentUser,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Firebase store error:', error);
    messageInput.value = text;
    alert('Could not send message. Check your connection.');
  }
}

window.deleteMessage = async function (id) {
  try {
    await deleteDoc(doc(db, 'rooms', currentRoom, 'messages', id));
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
    empty.textContent = `No messages in room #${currentRoom} yet. Say hi!`;
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