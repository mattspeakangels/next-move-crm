// Unico punto di accesso alla libreria dei fogli di calcolo (SheetJS).
// Il pacchetto arriva dalla distribuzione ufficiale cdn.sheetjs.com, non dal registro npm
// (lì è fermo alla 0.18.5, con vulnerabilità note): per aggiornarlo basta cambiare
// l'indirizzo in package.json. Le viste importano da qui, mai da 'xlsx' direttamente.
export { read, utils, writeFile } from 'xlsx';
