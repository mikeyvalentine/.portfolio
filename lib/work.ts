/**
 * The work list. Order here is the order on the page.
 *
 * No titles, captions or descriptions — text is not this file's business.
 * Add a `model` item to put a live 3D object in a frame; it renders through the
 * same shared WebGL context as every other model frame.
 */

export type WorkItem =
  | { id: string; kind: 'video'; src: string }
  | { id: string; kind: 'image'; src: string }
  /** `src` is a GLB under /models, or omitted to render the stand-in. */
  | { id: string; kind: 'model'; src?: string };

export const work: WorkItem[] = [
  { id: 'kellys', kind: 'image', src: '/work/kellys.png' },
  { id: 'mug', kind: 'video', src: '/work/mug.mp4' },
  { id: 'object', kind: 'model' },
  { id: 'flower', kind: 'video', src: '/work/flower.mp4' },
  { id: 'calm', kind: 'video', src: '/work/calm.mp4' },
  { id: 'hart', kind: 'video', src: '/work/hart.mp4' },
  { id: 'bug', kind: 'video', src: '/work/bug.mp4' },
  { id: 'wyatt', kind: 'image', src: '/work/wyatt.jpg' },
  { id: 'rider', kind: 'video', src: '/work/rider.mp4' },
];
