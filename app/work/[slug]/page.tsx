import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projects, getProject } from '@/lib/projects';
import { Viewer } from '@/components/Viewer';

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex items-baseline justify-between px-6 py-5">
        <div>
          <Link href="/" className="text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-300">
            ← Work
          </Link>
          <h1 className="mt-2 text-2xl tracking-tight">{project.title}</h1>
        </div>
        {project.stats && (
          <dl className="hidden gap-6 text-right text-[10px] uppercase tracking-widest text-neutral-600 sm:flex">
            <div>
              <dt>Triangles</dt>
              <dd className="text-neutral-400">{project.stats.triangles.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Textures</dt>
              <dd className="text-neutral-400">{project.stats.textureRes}px</dd>
            </div>
            <div>
              <dt>Payload</dt>
              <dd className="text-neutral-400">
                {(project.stats.payloadBytes / 1_048_576).toFixed(1)} MB
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <Viewer project={project} />
      </div>

      <p className="max-w-2xl px-6 py-6 text-sm text-neutral-400">{project.summary}</p>
    </main>
  );
}
