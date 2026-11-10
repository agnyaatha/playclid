import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-4 px-5 py-16">
      <p className="eyebrow">Off the table</p>
      <h1 className="display text-4xl font-semibold">That page has gone in-off.</h1>
      <Link href="/" className="btn btn-primary self-start">
        Back to the start
      </Link>
    </main>
  );
}
