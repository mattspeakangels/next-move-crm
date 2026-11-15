import React from 'react';
import { Mail, Sparkles } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import type { FeatureFlag } from '../lib/features';

// Segnaposto delle funzioni in costruzione, raggiungibile solo in laboratorio
// (interruttori in src/lib/features.ts). Verrà sostituito dalle viste vere.
const COPY: Record<FeatureFlag, { icon: typeof Mail; title: string; description: string }> = {
  emailInbox: {
    icon: Mail,
    title: 'Email — in costruzione',
    description: 'Qui arriveranno le email smistate per cliente e opportunità. Funzione attiva solo nel laboratorio.',
  },
  learningEngine: {
    icon: Sparkles,
    title: 'Apprendimento — in costruzione',
    description: 'Qui il motore di apprendimento mostrerà cosa ha imparato dalle attività. Funzione attiva solo nel laboratorio.',
  },
};

export const LabPreviewView: React.FC<{ feature: FeatureFlag }> = ({ feature }) => {
  const c = COPY[feature];
  return <EmptyState icon={c.icon} title={c.title} description={c.description} />;
};
