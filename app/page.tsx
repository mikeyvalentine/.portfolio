import Link from 'next/link';
import { projects } from '@/lib/projects';

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <header className="mb-20">
        <h1 className="text-4xl font-medium tracking-tight">Selected 3D work</h1>
        <p className="mt-3 max-w-xl text-neutral-400">
          Single-object studies. Each piece is a real asset in your browser, not a video —
          drag to rotate, and the renderer refines once you stop.
        </p>
      </header>

      <ul className="grid gap-px border border-neutral-900 bg-neutral-900 sm:grid-cols-2">
        {projects.map((p) => (
          <li key={p.slug} className="bg-neutral-950">
            <Link href={`/work/${p.slug}`} className="block p-8 transition-colors hover:bg-neutral-900">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg">{p.title}</h2>
                <span className="text-xs text-neutral-600">{p.year}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-400">{p.summary}</p>
              <div className="mt-4 flex gap-2">
                {p.software.map((s) => (
                  <span key={s} className="text-[10px] uppercase tracking-widest text-neutral-600">
                    {s}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
