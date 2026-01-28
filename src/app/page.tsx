import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Endless Runner</h1>
      <p>Space ile zıpla. Engellerden kaç. Skor artıyor.</p>
      <Link href="/game">Oyunu Başlat →</Link>
    </main>
  );
}
