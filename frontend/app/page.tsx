import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col p-4">
      <header className="mb-3">
        <h1 className="text-xl font-semibold">Bridge</h1>
        <p className="text-sm text-slate-500">
          Your AI companion for learning Korean &amp; Japanese
        </p>
      </header>
      <ChatWindow />
    </main>
  );
}
