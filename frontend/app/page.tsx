// app/page.tsx
'use client';

import App from '../src/src/App';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="w-full h-screen">
        <App />
      </div>
    </main>
  );
}
