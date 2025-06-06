'use client';

import React from 'react';
import ReactDOM from 'react-dom/client';
import '@xyflow/react/dist/style.css';

import App from './App';

import './index.css';
import { Main } from 'next/document';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export default Main;