export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Train search
      </h1>
      <p className="text-muted text-base leading-relaxed">
        Project scaffold. The search results page arrives at{" "}
        <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-sm dark:bg-white/10">
          /trains
        </code>
        .
      </p>
    </main>
  );
}
