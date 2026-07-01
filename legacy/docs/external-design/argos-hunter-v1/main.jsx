import React from 'react';
import { createRoot } from 'react-dom/client';
import ArgosGenerator from './argos-generator.jsx';

// Polyfill window.storage (claude.ai artifact API) with localStorage
window.storage = {
  async get(key) {
    const v = localStorage.getItem(key);
    return v ? { value: v } : null;
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return true;
  },
  async list(prefix) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    return { keys };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return true;
  },
};

createRoot(document.getElementById('root')).render(<ArgosGenerator />);
