// Interruttori delle funzioni per ambiente. Le funzioni nuove nascono accese solo in
// laboratorio; per portarle al lavoro si cambia il valore qui (vedi Docs/AMBIENTI.md).
// Con l'interruttore spento la funzione sparisce dal menu e la sua vista non si apre
// (src/lib/navSections.ts → tabsFor/canOpenView).
import { IS_LAB } from './appEnv';

export type FeatureFlag = 'emailInbox' | 'learningEngine';

export const FEATURES: Readonly<Record<FeatureFlag, boolean>> = {
  emailInbox: IS_LAB,
  learningEngine: IS_LAB,
};

export function isFeatureEnabled(flag: FeatureFlag | undefined): boolean {
  return flag === undefined || FEATURES[flag] === true;
}
