import type { N8AOPostPass } from 'n8ao';
import type { ThreeElement } from '@react-three/fiber';

// Declares the JSX element that Stage.tsx registers with extend().
declare module '@react-three/fiber' {
  interface ThreeElements {
    n8AOPostPass: ThreeElement<typeof N8AOPostPass>;
  }
}
