// app/page.tsx
'use client';

import dynamic from 'next/dynamic';

// SSR: false diyerek sunucuda render edilmesini engelliyoruz
const Game = dynamic(() => import('../components/GameWrapper'), {
  ssr: false,
  loading: () => <p>Oyun Yükleniyor...</p> // Yüklenirken ne görünsün?
});

export default function Home() {
  return (
    <main>
      <Game />
    </main>
  );
}