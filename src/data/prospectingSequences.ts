import { Sequence } from '../types';

// Sequenze commerciali estratte da Manuale_Prospezione_Blaklader_2026.pdf e
// Blaklader_Email_Presentazione_4_Target.pdf. Placeholder [Nome]/[Azienda]/[giorno 1]/
// [giorno 2]/[dettaglio_visita] restano intatti: vengono compilati a runtime da prospecting.ts.

const FIRMA = 'Cordiali saluti,\nMattia Parlangeli\nArea Manager Lombardia & Canton Ticino — Blåkläder';

export const SEED_SEQUENCES: Sequence[] = [
  {
    id: 'industria',
    nome: 'Industria (end user)',
    settore: 'industria',
    attiva: true,
    touches: [
      {
        ordine: 1,
        tipo: 'email',
        offsetGiorni: 1,
        oggettoTemplate: 'Seguito al mio passaggio in [Azienda] — vestizione tecnica per i vostri reparti',
        corpoTemplate:
          'Buongiorno [Nome],\n\nnei giorni scorsi sono passato presso la vostra sede e ho lasciato i miei riferimenti in segreteria; le scrivo per presentarmi direttamente.\n\nSono l\'Area Manager di Blåkläder, produttore svedese di abbigliamento da lavoro. Lavoriamo con realtà industriali della zona su un tema preciso: capi certificati (EN ISO 20471, EN ISO 11612 dove serve) che durano il doppio dei ricambi standard — con garanzia a vita sulle cuciture, che nessun altro produttore offre.\n\n[dettaglio_visita]\n\nPer capire se possiamo esservi utili mi servono 20 minuti: porto i campioni delle linee più adatte ai vostri reparti e li facciamo toccare con mano a chi li indosserà.\n\nLe andrebbe bene [giorno 1] o [giorno 2] mattina?\n\n' + FIRMA,
        obiettivo: 'Ancoraggio al passaggio reale, prima CTA',
        noteUso: 'Se in visita hai notato un rischio specifico (saldatura, carrelli, lavoro esterno), sostituisci la frase sulle certificazioni con il riferimento diretto. Destinatario ideale: RSPP, responsabile acquisti o HSE.',
      },
      {
        ordine: 2,
        tipo: 'email',
        offsetGiorni: 5,
        oggettoTemplate: 'RE: Seguito al mio passaggio in [Azienda]',
        corpoTemplate:
          'Buongiorno [Nome],\n\nle riscrivo brevemente perché immagino che la mia email sia finita sotto una pila di priorità più urgenti.\n\nAggiungo solo un elemento che con gli RSPP fa spesso la differenza: i nostri capi certificati mantengono le prestazioni protettive dopo 50 cicli di lavaggio industriale, documentato nei test di laboratorio. Significa che la conformità che lei certifica oggi resta valida per tutta la vita del capo — non solo il giorno dell\'acquisto.\n\nI 20 minuti con i campioni restano la mia proposta: [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Riproporre la CTA aggiungendo un elemento tecnico nuovo',
        noteUso: 'Due paragrafi, zero ripetizioni della prima email. Se il prospect è un buyer e non un RSPP, sostituisci con: "il costo reale per anno di un capo che dura il triplo è fino al 60% inferiore".',
      },
      {
        ordine: 3,
        tipo: 'email',
        offsetGiorni: 10,
        oggettoTemplate: '[Azienda]: quanto vi costa davvero un capo da 30€?',
        corpoTemplate:
          'Buongiorno [Nome],\n\nuna domanda che faccio spesso ai responsabili acquisti del manifatturiero: quante volte all\'anno ricomprate lo stesso capo?\n\nUn capo economico da 30€ sostituito 3 volte l\'anno costa 90€ — più i costi amministrativi di ogni riordino e le taglie da rigestire. Un capo Blåkläder che dura 3 anni, con garanzia a vita sulle cuciture, ribalta il conto: un caso studio documentato ha misurato una durata 4 volte superiore alla concorrenza, con riduzione del costo annuo e dell\'impatto ambientale del 75% — dato utile anche per il vostro reporting ESG.\n\nSe le interessa vedere il calcolo applicato ai vostri reparti, mi bastano 20 minuti: [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Spostare la conversazione dal prezzo al costo totale (TCO)',
        noteUso: 'La domanda in apertura è un pattern interrupt. Il riferimento ESG aggancia le aziende con obiettivi di sostenibilità.',
      },
      {
        ordine: 4,
        tipo: 'email',
        offsetGiorni: 15,
        oggettoTemplate: 'RE: [Azienda]: quanto vi costa davvero un capo da 30€?',
        corpoTemplate:
          'Buongiorno [Nome],\n\ncapisco che valutare un nuovo fornitore di vestiario sia un processo che nessuno ha voglia di aprire senza motivo. Le propongo quindi di saltare la parte teorica.\n\nWear test: lascio 2-3 capi delle linee adatte ai vostri reparti (multinorma, alta visibilità o stretch antigraffio, in base ai rischi) agli operatori che indicherà lei. Due settimane di uso reale, poi mi dicono loro se hanno sentito la differenza. Nessun costo, nessun impegno.\n\nÈ il modo più onesto che conosco per farvi giudicare il prodotto. Organizzo la consegna [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Azzerare il rischio percepito con un wear test gratuito',
        noteUso: 'Il wear test sposta la decisione dal buyer agli operatori. Contestualmente, invia la richiesta di collegamento LinkedIn.',
        messaggioLinkedin:
          'Buongiorno [Nome], sono l\'Area Manager Blåkläder per Lombardia e Ticino — le ho scritto nei giorni scorsi dopo un passaggio presso [Azienda]. Mi collego volentieri con i professionisti della sicurezza della zona: sul mio profilo trova contenuti su DPI, normative e gestione del vestiario tecnico. A presto, Mattia',
      },
      {
        ordine: 5,
        tipo: 'telefonata',
        offsetGiorni: 18,
        scriptTelefonata:
          '"Buongiorno [Nome], sono Mattia Parlangeli di Blåkläder — le ho scritto un paio di email nelle ultime settimane dopo essere passato dalla vostra sede. La chiamo per 60 secondi, non di più.\n\n[pausa — lascia rispondere]\n\nLe ho proposto un wear test: due settimane di prova gratuita dei nostri capi certificati sui suoi operatori. Glielo propongo a voce perché è il tipo di cosa che per email sembra marketing e dal vivo invece è solo… un paio di pantaloni da provare. Non le chiedo di cambiare fornitore: le chiedo di far giudicare il prodotto a chi lo indossa.\n\nLe va se passo [giorno], le porto i campioni e decidete con calma?"\n\nGestione risposte rapide:\n- "Non ho tempo" → "Per questo le chiedo solo di ricevere i campioni: il test lo fanno gli operatori, non lei. 10 minuti per la consegna."\n- "Abbiamo già un fornitore" → vedi Cap. 6, obiezione 1.\n- "Mandi una mail" → "Gliene ho già mandate tre — è esattamente il motivo per cui la sto chiamando".',
        obiettivo: 'Conversione: la voce chiude ciò che l\'email apre',
        noteUso: 'Orario consigliato: 11:00-12:00 per RSPP e buyer industriali.',
      },
      {
        ordine: 6,
        tipo: 'email',
        offsetGiorni: 25,
        oggettoTemplate: 'Chiudo il cerchio, [Nome]',
        corpoTemplate:
          'Buongiorno [Nome],\n\nnon voglio diventare quel commerciale che intasa la casella: questa è l\'ultima email che le mando di mia iniziativa.\n\nSe il tema vestiario tecnico non è una priorità adesso, nessun problema — i miei riferimenti restano validi e io passo dalla vostra zona ogni mese. Se invece c\'è anche solo un capo o un reparto su cui vale la pena confrontarsi, mi basta una risposta con una parola: "sì".\n\nIn ogni caso, grazie per l\'attenzione e buon lavoro.\n\n' + FIRMA,
        obiettivo: 'Ultima occasione senza pressione — email col tasso di risposta più alto',
        noteUso: 'Non usare mai toni passivo-aggressivi ("visto che non risponde…").',
      },
    ],
  },
  {
    id: 'edilizia',
    nome: 'Impresa edile (end user)',
    settore: 'edilizia',
    attiva: true,
    touches: [
      {
        ordine: 1,
        tipo: 'email',
        offsetGiorni: 1,
        oggettoTemplate: 'Dopo il mio passaggio da [Azienda] — pantaloni da cantiere che finiscono la stagione',
        corpoTemplate:
          'Buongiorno [Nome],\n\nsono passato dalla vostra sede nei giorni scorsi e ho lasciato il mio biglietto in ufficio; mi presento direttamente per email.\n\nRappresento Blåkläder per la Lombardia [/il Ticino]: abbigliamento da cantiere svedese. Il problema che risolviamo più spesso alle imprese edili è semplice: pantaloni che cedono su ginocchia e tasche dopo pochi mesi. I nostri hanno rinforzi in Cordura®, stretch 4 vie e certificazione ginocchiere EN 14404 — e garanzia a vita sulle cuciture: se una cucitura cede, sostituiamo il capo.\n\n[dettaglio_visita]\n\nLe propongo 20 minuti in sede o in cantiere: porto i campioni e, se vuole, lasciamo un paio di pantaloni in prova a un suo operatore per due settimane. È il modo più onesto di giudicarli.\n\nVa meglio [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Ancoraggio al passaggio reale, prima CTA',
        noteUso: 'Il wear test è la leva più forte su questo target. Destinatario: titolare o capo cantiere. Se lavorano in appalto pubblico, aggiungi una riga sull\'alta visibilità EN ISO 20471.',
      },
      {
        ordine: 2,
        tipo: 'email',
        offsetGiorni: 5,
        oggettoTemplate: 'RE: Dopo il mio passaggio da [Azienda]',
        corpoTemplate:
          'Buongiorno [Nome],\n\nso che tra cantieri e preventivi le email non sono la priorità: le rubo 20 secondi.\n\nUn solo dato che ai capi cantiere dice tutto: i nostri pantaloni hanno i rinforzi in Cordura® sulle ginocchia e sulle tasche — gli stessi punti dove i pantaloni normali cedono dopo pochi mesi. E se una cucitura si apre, il capo glielo sostituiamo, a vita.\n\nPasso io da lei, in sede o direttamente in cantiere: [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Persistenza leggera + dettaglio tecnico concreto',
        noteUso: 'Linguaggio da cantiere, zero tecnicismi normativi. La disponibilità ad andare in cantiere è un segnale forte.',
      },
      {
        ordine: 3,
        tipo: 'email',
        offsetGiorni: 10,
        oggettoTemplate: '3 paia l\'anno contro 1: il conto che fanno le imprese come [Azienda]',
        corpoTemplate:
          'Buongiorno [Nome],\n\nle racconto il caso tipico che incontro nelle imprese edili della zona.\n\nSquadra di 10 operai, pantaloni da 25-30€ sostituiti in media 3 volte l\'anno: circa 900€ annui, senza contare il tempo perso a riordinare taglie e modelli. Con un pantalone da cantiere Blåkläder si compra una volta: un caso studio documentato ha misurato una durata 4 volte superiore ai capi standard. E la garanzia a vita sulle cuciture significa che se cede una cucitura, il capo lo cambiamo noi.\n\nIl conto per la sua squadra glielo faccio in 20 minuti, con i campioni in mano: [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Quantificare il risparmio con un esempio riconoscibile',
        noteUso: 'I numeri devono restare piccoli e verificabili (10 operai, 3 paia, 900€).',
      },
      {
        ordine: 4,
        tipo: 'email',
        offsetGiorni: 15,
        oggettoTemplate: 'RE: 3 paia l\'anno contro 1',
        corpoTemplate:
          'Buongiorno [Nome],\n\nfacciamo la cosa più semplice: non mi creda sulla parola.\n\nLe lascio un paio di pantaloni in prova per due settimane all\'operaio che li tratta peggio — quello che consuma un paio ogni tre mesi. Se dopo due settimane di cantiere vero mi dice che sono pantaloni come gli altri, ci stringiamo la mano e non la disturbo più.\n\nCosto: zero. Impegno: zero. Mi dica solo quando passare: [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Wear test — la leva più forte su questo target',
        noteUso: '"L\'operaio che li tratta peggio" comunica certezza assoluta nel prodotto. Invia il collegamento LinkedIn lo stesso giorno.',
        messaggioLinkedin:
          'Buongiorno [Nome], sono Mattia di Blåkläder — ci siamo "incrociati" quando sono passato da [Azienda]. Mi collego con le imprese edili di zona: sul profilo pubblico contenuti su cantiere, DPI e gestione squadre. Buon lavoro!',
      },
      {
        ordine: 5,
        tipo: 'telefonata',
        offsetGiorni: 18,
        scriptTelefonata:
          '"Buongiorno [Nome], Mattia Parlangeli di Blåkläder — sono quello dei pantaloni da cantiere, le ho scritto un paio di volte dopo essere passato da voi. 60 secondi e la lascio ai cantieri.\n\n[pausa]\n\nLa proposta è semplice: le lascio un paio di pantaloni in prova, gratis, per due settimane. Li dia all\'operaio che distrugge più roba. Se al ritorno mi dice che sono pantaloni normali, sparisco. Se invece mi dice quello che mi dicono di solito… ne parliamo.\n\nSono in zona [giorno]: passo cinque minuti e glieli lascio?"\n\nGestione risposte rapide:\n- "Compriamo dalla rivendita" → "Perfetto, continuate pure a comprare lì — Blåkläder lavora con le rivendite. Intanto però provi il prodotto: se le piace, le dico io dove trovarlo."\n- "Costano troppo" → "È vero, costano di più — una volta. I suoi attuali quante volte li ricompra all\'anno?"\n- "Non ho tempo" → "Cinque minuti in cantiere, glieli porto dove sta lavorando."',
        obiettivo: 'Conversione con wear test consegnato di persona',
        noteUso: 'Orario consigliato: 8:00-9:00 per titolari edili (poi sono in cantiere).',
      },
      {
        ordine: 6,
        tipo: 'email',
        offsetGiorni: 25,
        oggettoTemplate: 'Ultima email, poi ci vediamo in cantiere',
        corpoTemplate:
          'Buongiorno [Nome],\n\nquesta è l\'ultima email che le mando: se i pantaloni non sono un problema per la sua squadra, va benissimo così.\n\nLe lascio solo un pensiero: la prova gratuita di due settimane resta valida anche tra tre mesi, quando magari sarà stagione di ricambi. Basta un messaggio: "proviamo". Io in zona ci passo comunque.\n\nBuon lavoro a lei e alla squadra,\n\n' + FIRMA,
        obiettivo: 'Chiusura elegante che lascia la porta aperta',
        noteUso: 'Coerente col rapporto di prossimità territoriale.',
      },
    ],
  },
  {
    id: 'rivendita',
    nome: 'Rivendita materiali edili (dealer)',
    settore: 'rivendita',
    attiva: true,
    touches: [
      {
        ordine: 1,
        tipo: 'email',
        offsetGiorni: 1,
        oggettoTemplate: 'Seguito al passaggio in [Azienda] — workwear premium per i vostri clienti di cantiere',
        corpoTemplate:
          'Buongiorno [Nome],\n\nsono passato in rivendita nei giorni scorsi e ho lasciato i miei riferimenti al banco; le scrivo per presentarmi.\n\nSono l\'Area Manager di Blåkläder, brand svedese di workwear. Le imprese e gli artigiani che ogni giorno passano dal vostro banco spendono già in abbigliamento da lavoro — spesso altrove. Un corner Blåkläder porta quel fatturato dentro la rivendita: prodotto premium con marginalità interessante, riacquisto fidelizzato (chi prova i pantaloni torna per gli stessi) e garanzia a vita sulle cuciture come argomento di vendita immediato per i vostri banconisti.\n\n[dettaglio_visita]\n\nLe chiedo 30 minuti per mostrarle i prodotti a maggior rotazione e le condizioni per i rivenditori di zona. Può andare [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Ancoraggio al passaggio reale, prima CTA',
        noteUso: 'Non promettere esclusive o condizioni specifiche via email. Destinatario: titolare o responsabile acquisti.',
      },
      {
        ordine: 2,
        tipo: 'email',
        offsetGiorni: 5,
        oggettoTemplate: 'RE: Seguito al passaggio in [Azienda]',
        corpoTemplate:
          'Buongiorno [Nome],\n\ntorno sulla mia proposta con un solo argomento in più.\n\nIl workwear ha una caratteristica che pochi prodotti a banco hanno: il riacquisto è automatico. Chi prova un pantalone Blåkläder torna a chiedere esattamente quel modello, con il codice — e torna nella rivendita dove l\'ha comprato. Non è fedeltà al negozio: è fedeltà al capo, che però incassa lei.\n\nLe mostro i 5 articoli a maggior rotazione e i margini in 30 minuti: [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Riproporre la CTA con un argomento di sell-out nuovo',
      },
      {
        ordine: 3,
        tipo: 'email',
        offsetGiorni: 10,
        oggettoTemplate: 'Il fatturato che esce ogni giorno dalla sua rivendita',
        corpoTemplate:
          'Buongiorno [Nome],\n\nfaccia un conto veloce: quante imprese e artigiani passano dal suo banco ogni settimana? Ognuno di loro spende 200-400€ l\'anno in abbigliamento da lavoro. Oggi quella spesa finisce altrove — online o da un concorrente.\n\nUn corner Blåkläder da pochi metri quadri intercetta quella spesa con clienti che ha già, senza costi di acquisizione. Prodotto premium, marginalità da prodotto premium, e la garanzia a vita sulle cuciture come argomento che il banconista impara in 30 secondi.\n\nLe porto la simulazione fatta su rivendite simili alla sua: [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Rendere visibile il costo-opportunità',
        noteUso: '"Con clienti che ha già" è l\'argomento decisivo. Non citare mai percentuali di margine per iscritto.',
      },
      {
        ordine: 4,
        tipo: 'email',
        offsetGiorni: 15,
        oggettoTemplate: 'RE: Il fatturato che esce ogni giorno dalla sua rivendita',
        corpoTemplate:
          'Buongiorno [Nome],\n\nnessuno le chiede di riempire un magazzino: le propongo un ingresso a rischio minimo.\n\nSi parte da un espositore compatto con i 5 articoli a maggior rotazione — quelli che nelle altre rivendite girano da soli. Testa la risposta dei suoi clienti per una stagione; se il prodotto non gira, ne prendiamo atto. In più le lascio un capo campione per il banco: farlo toccare vale più di qualsiasi catalogo.\n\nDefiniamo insieme la partenza in 30 minuti: [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Proposta di partenza a basso rischio',
        messaggioLinkedin:
          'Buongiorno [Nome], sono l\'Area Manager Blåkläder per Lombardia e Ticino — sono passato in rivendita nei giorni scorsi. Mi collego volentieri con i distributori del settore edile: condivido spesso dati su mercato workwear e sell-out di categoria. A presto, Mattia',
      },
      {
        ordine: 5,
        tipo: 'telefonata',
        offsetGiorni: 18,
        scriptTelefonata:
          '"Buongiorno [Nome], Mattia Parlangeli di Blåkläder — le ho scritto dopo il mio passaggio in rivendita. Un minuto e vado al punto.\n\n[pausa]\n\nI suoi clienti di cantiere l\'abbigliamento da lavoro lo comprano già — solo che oggi lo comprano da un\'altra parte. Io le propongo di riportare quella spesa dentro la sua rivendita, partendo da un espositore piccolo con i 5 articoli che girano di più. Rischio minimo, margine da prodotto premium.\n\nMi dia 30 minuti con i campioni e i numeri: [giorno] le va bene?"\n\nGestione risposte rapide:\n- "Abbiamo già un marchio di workwear" → "Ottimo, vuol dire che la categoria le funziona già. Blåkläder non sostituisce: si posiziona sopra, dove i margini sono migliori. I clienti che vogliono il premium oggi dove li manda?"\n- "Non ho spazio" → "L\'espositore base occupa meno di un metro."\n- "Che sconti fate?" → "Le condizioni gliele presento di persona con il listino — è anche il motivo per cui le chiedo l\'appuntamento."',
        obiettivo: 'Conversione con proposta espositore',
      },
      {
        ordine: 6,
        tipo: 'email',
        offsetGiorni: 25,
        oggettoTemplate: 'Chiudo — ma le lascio un dato',
        corpoTemplate:
          'Buongiorno [Nome],\n\nnon la disturbo oltre: se ampliare la categoria workwear non è nei piani, capisco perfettamente.\n\nLe lascio solo un dato di mercato: l\'antinfortunistica è uno dei pochi comparti in crescita nella distribuzione (+3,7% nel 2025), mentre il dettaglio tradizionale cala. Chi presidia la categoria adesso si prende i clienti degli altri. Quando vorrà parlarne, basta un "ci vediamo".\n\nBuon lavoro,\n\n' + FIRMA,
        obiettivo: 'Uscita elegante con ultimo seme piantato',
      },
    ],
  },
  {
    id: 'ferramenta',
    nome: 'Ferramenta (dealer)',
    settore: 'ferramenta',
    attiva: true,
    touches: [
      {
        ordine: 1,
        tipo: 'email',
        offsetGiorni: 1,
        oggettoTemplate: 'Dopo il mio passaggio in [Ferramenta] — il workwear che i suoi clienti artigiani chiedono già',
        corpoTemplate:
          'Buongiorno [Nome],\n\nsono passato da voi nei giorni scorsi e ho lasciato il mio biglietto; mi presento per email.\n\nSono l\'Area Manager di Blåkläder, marchio svedese di abbigliamento da lavoro. In ferramenta funzionano tre categorie: pantaloni artigiano (il nostro prodotto più venduto), guanti e calzature di sicurezza — articoli ad alta rotazione, con un cliente artigiano che una volta provato il capo torna a chiedere esattamente quello. La garanzia a vita sulle cuciture è un argomento che al banco si vende da solo.\n\n[dettaglio_visita]\n\nNon serve un grande spazio: le mostro volentieri come altre ferramenta della zona hanno inserito la gamma partendo da un espositore compatto.\n\nLe andrebbero bene 20 minuti [giorno 1] o [giorno 2]? Porto i campioni delle tre categorie.\n\n' + FIRMA,
        obiettivo: 'Ancoraggio al passaggio reale, prima CTA',
        noteUso: 'Taglio retail: rotazione e riacquisto, non tecnica. Destinatario: titolare. Per A2 (safety specialist) alza il registro tecnico: Cat. III, formazione banconisti.',
      },
      {
        ordine: 2,
        tipo: 'email',
        offsetGiorni: 5,
        oggettoTemplate: 'RE: Dopo il mio passaggio in [Ferramenta]',
        corpoTemplate:
          'Buongiorno [Nome],\n\ndue righe per non far cadere il discorso.\n\nL\'argomento che al banco funziona meglio: "se una cucitura cede, il capo glielo sostituiscono — a vita". È una frase che il suo banconista impara in dieci secondi e che nessun altro marchio gli permette di dire. L\'artigiano che la sente una volta se la ricorda.\n\n20 minuti con i campioni delle tre categorie: [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Persistenza + argomento banco',
      },
      {
        ordine: 3,
        tipo: 'email',
        offsetGiorni: 10,
        oggettoTemplate: 'L\'artigiano che torna a chiedere "quelli lì"',
        corpoTemplate:
          'Buongiorno [Nome],\n\nle descrivo la scena che i ferramenta Blåkläder mi raccontano più spesso.\n\nUn artigiano compra un paio di pantaloni 1990. Dopo qualche mese torna e non chiede "dei pantaloni da lavoro": chiede "quelli lì, gli stessi" — e spesso ne prende due paia, più i guanti. Il workwear premium crea un cliente che torna a colpo sicuro, nella ferramenta dove l\'ha trovato. È rotazione che si costruisce da sola.\n\nLe porto i tre articoli con cui si parte e le condizioni: [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Far visualizzare il meccanismo del riacquisto',
        noteUso: 'La storia è più efficace di qualsiasi statistica su questo target. Se hai visto marchi concorrenti a scaffale, cita il posizionamento: "sopra al marchio che ha già, non al posto suo".',
      },
      {
        ordine: 4,
        tipo: 'email',
        offsetGiorni: 15,
        oggettoTemplate: 'RE: L\'artigiano che torna a chiedere "quelli lì"',
        corpoTemplate:
          'Buongiorno [Nome],\n\nle tolgo l\'unico dubbio ragionevole: "e se poi non gira?".\n\nSi parte con un espositore compatto — meno di un metro — con i soli articoli a rotazione certa: pantaloni artigiano, guanti, un modello di scarpa. Investimento iniziale minimo, riassortimento solo su ciò che vende. In più le lascio un paio di pantaloni da tenere al banco: quando l\'artigiano li tocca, il capo si vende da solo.\n\nDefiniamo tutto in 20 minuti: [giorno 1] o [giorno 2]?\n\n' + FIRMA,
        obiettivo: 'Ingresso a rischio zero',
        noteUso: 'Molti titolari di ferramenta non sono attivi su LinkedIn: se il tocco LinkedIn viene saltato, anticipa la telefonata a G+15.',
        messaggioLinkedin:
          'Buongiorno [Nome], sono Mattia, Area Manager Blåkläder — sono passato nella sua ferramenta di recente. Mi collego con i rivenditori della zona: condivido novità di gamma e materiali utili per il banco. A presto!',
        linkedinSaltabile: true,
      },
      {
        ordine: 5,
        tipo: 'telefonata',
        offsetGiorni: 18,
        scriptTelefonata:
          '"Buongiorno [Nome], Mattia Parlangeli di Blåkläder — sono passato in ferramenta qualche settimana fa e le ho scritto un paio di email. Un minuto solo.\n\n[pausa]\n\nI suoi clienti artigiani i pantaloni da lavoro li comprano già, da qualche parte. Io le propongo di venderglieli lei: espositore piccolo, tre categorie che girano, e un argomento che nessun altro le dà — la garanzia a vita sulle cuciture. Al banco si vende da solo.\n\nPasso [giorno] con i campioni: 20 minuti e vede tutto?"\n\nGestione risposte rapide:\n- "Ho già Beta/U-Power/altro" → "Perfetto: quelli coprono la fascia media. Blåkläder si mette sopra, per l\'artigiano che vuole il meglio e paga per averlo."\n- "Il premium qui non si vende" → "È quello che mi dicevano anche altre ferramenta della zona — finché non hanno messo il campione sul banco."\n- "Non ho spazio" → "Meno di un metro. Glielo faccio vedere di persona."',
        obiettivo: 'Conversione con proposta espositore compatto',
        noteUso: 'Se il tocco LinkedIn è stato saltato, questa telefonata va anticipata a G+15.',
      },
      {
        ordine: 6,
        tipo: 'email',
        offsetGiorni: 25,
        oggettoTemplate: 'Ultima email — poi passo e basta',
        corpoTemplate:
          'Buongiorno [Nome],\n\nnon voglio insistere oltre: se il workwear premium non è una priorità per la sua ferramenta, va bene così.\n\nIo in zona passo regolarmente, e prima o poi ci conosceremo di persona al banco. Se nel frattempo un cliente le chiede "quei pantaloni svedesi con la garanzia a vita" — perché succederà — sa chi chiamare.\n\nBuon lavoro,\n\n' + FIRMA,
        obiettivo: 'Chiusura leggera, coerente col rapporto di prossimità territoriale',
      },
    ],
  },
];
