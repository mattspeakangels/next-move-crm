import React from 'react';

// Fascia fissa mostrata in ogni schermata del laboratorio (login compreso).
// Montata da main.tsx solo con IS_LAB: nella build di lavoro non esiste.
// Lo <style> sposta in basso le barre fisse in alto, così la fascia non le copre.
const H = 22;

export const LabBanner: React.FC = () => (
  <>
    <style>{`
      body { padding-top: ${H}px; }
      .fixed.top-0, .cockpit-sidebar { top: ${H}px !important; }
      .cockpit-sidebar { height: calc(100vh - ${H}px) !important; }
    `}</style>
    <div
      role="status"
      aria-label="Ambiente di laboratorio con dati simulati"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: H, zIndex: 2147483647,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'repeating-linear-gradient(135deg, #f59e0b 0 14px, #d97706 14px 28px)',
        color: '#1c1917', font: '800 12px/1 system-ui, sans-serif', letterSpacing: '0.08em',
        pointerEvents: 'none',
      }}
    >
      LABORATORIO — dati simulati
    </div>
  </>
);
