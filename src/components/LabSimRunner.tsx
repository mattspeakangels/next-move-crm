import { useDemoMode } from '../lib/demoMode';
import { useLabDailySim } from '../lib/labSim';

/** Solo laboratorio: fa "lavorare" l'azienda simulata (email, prospect, opportunità) giorno per giorno. */
export function LabSimRunner() {
  const demo = useDemoMode();
  useLabDailySim(!demo);
  return null;
}
