import { FileText, Mail, Shield } from 'lucide-react';

export function LegalView() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl   tracking-tight mb-2">Documenti Legali</h1>
      <p className="text-secondary dark:text-muted mb-8">
        Informazioni importanti sulla privacy, termini di uso e sicurezza.
      </p>

      <div className="grid gap-6">
        {/* Privacy Policy */}
        <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-accent-soft dark:bg-accent-soft/30 rounded-md text-accent">
              <Shield size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Privacy Policy</h2>
              <p className="text-secondary dark:text-muted text-sm mb-4">
                Scopri come utilizziamo i tuoi dati, dove li salviamo, e quali diritti hai sulla tua privacy (GDPR).
              </p>
              <div className="space-y-2 mb-4 text-sm text-foreground dark:text-muted">
                <p>✓ Come raccogliamo i dati</p>
                <p>✓ Come li usiamo</p>
                <p>✓ Diritti GDPR</p>
                <p>✓ Sicurezza e crittografia</p>
              </div>
              <a
                href="/PRIVACY_POLICY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-action hover:bg-action-hover text-action-foreground rounded-md font-bold text-sm transition-colors"
              >
                <FileText size={16} />
                Leggi Completo
              </a>
            </div>
          </div>
        </div>

        {/* Terms of Service */}
        <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-accent-soft dark:bg-accent-soft/30 rounded-md text-accent">
              <FileText size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Terms of Service</h2>
              <p className="text-secondary dark:text-muted text-sm mb-4">
                Le regole di utilizzo dell'app, limitazioni di responsabilità, e quello che accetti usando SYRIO.
              </p>
              <div className="space-y-2 mb-4 text-sm text-foreground dark:text-muted">
                <p>✓ Che cos'è un'app beta</p>
                <p>✓ Regole di utilizzo</p>
                <p>✓ Limitazioni di responsabilità</p>
                <p>✓ Proprietà intellettuale</p>
              </div>
              <a
                href="/TERMS_OF_SERVICE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-action hover:bg-action-hover text-action-foreground rounded-md font-bold text-sm transition-colors"
              >
                <FileText size={16} />
                Leggi Completo
              </a>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-surface dark:bg-surface rounded-panel p-6 border border-line dark:border-line">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-success-soft dark:bg-success-soft rounded-md text-success">
              <Mail size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Contatti</h2>
              <p className="text-secondary dark:text-muted text-sm mb-4">
                Hai domande sulla privacy, sicurezza, o termini? Contattami direttamente.
              </p>
              <a
                href="mailto:parlangeli.mattia@gmail.com?subject=SYRIO CRM - Domanda legale"
                className="inline-flex items-center gap-2 px-4 py-2 bg-success hover:bg-success text-status-foreground rounded-md font-bold text-sm transition-colors"
              >
                <Mail size={16} />
                Scrivi a Mattia
              </a>
              <p className="text-xs text-secondary dark:text-muted mt-3">
                Email: parlangeli.mattia@gmail.com
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Domande Frequenti</h3>
        <div className="space-y-4">
          <details className="bg-surface dark:bg-surface rounded-md p-4 border border-line dark:border-line">
            <summary className="font-bold cursor-pointer flex items-center gap-2">
              <span>Cosa succede se l'app crasha e perdo i dati?</span>
            </summary>
            <p className="text-sm text-secondary dark:text-muted mt-3">
              Usiamo Google Firebase che è molto affidabile. Ma per massima sicurezza, fai backup settimanale dei tuoi dati (export CSV).
            </p>
          </details>

          <details className="bg-surface dark:bg-surface rounded-md p-4 border border-line dark:border-line">
            <summary className="font-bold cursor-pointer flex items-center gap-2">
              <span>I miei dati sono al sicuro?</span>
            </summary>
            <p className="text-sm text-secondary dark:text-muted mt-3">
              Sì. Usiamo HTTPS, Google Cloud Storage, e monitoriamo anomalie con Sentry. Ma come dico nei termini, l'app è fornita "as-is".
            </p>
          </details>

          <details className="bg-surface dark:bg-surface rounded-md p-4 border border-line dark:border-line">
            <summary className="font-bold cursor-pointer flex items-center gap-2">
              <span>Posso cancellare i miei dati?</span>
            </summary>
            <p className="text-sm text-secondary dark:text-muted mt-3">
              Sì. Scrivi a parlangeli.mattia@gmail.com con oggetto "GDPR Request" e cancelliamo tutto entro 7 giorni.
            </p>
          </details>

          <details className="bg-surface dark:bg-surface rounded-md p-4 border border-line dark:border-line">
            <summary className="font-bold cursor-pointer flex items-center gap-2">
              <span>Vendete i miei dati?</span>
            </summary>
            <p className="text-sm text-secondary dark:text-muted mt-3">
              No, mai. Non vendiamo dati. Usiamo solo servizi cloud (Google) necessari al funzionamento.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
