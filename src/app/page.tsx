import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-5 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Train search
      </h1>
      <p className="text-muted text-base leading-relaxed">
        Compare train times and prices between cities, and book your seats.
      </p>
      <Link
        href="/trains"
        className="bg-foreground text-background focus-visible:outline-foreground inline-flex h-11 w-fit items-center rounded-lg px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Search trains
      </Link>
    </main>
  );
}
