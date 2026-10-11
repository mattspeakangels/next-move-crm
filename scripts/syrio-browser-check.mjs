import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Browser-only fixtures: authentication/sync modules are intercepted in this
// isolated browser. No bypass is shipped in the app and no cloud data is used.
const out = path.resolve('.playwright-cli/syrio');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const now = Date.now();
const contact = { id: 'syrio-test-client', company: 'Cliente verifica locale', contactName: 'Referente test', role: 'Acquisti', email: 'test@example.invalid', phone: '0000000000', city: 'Milano', region: 'Lombardia', sector: 'Edilizia', status: 'cliente', customerType: 'dealer', segment: 'dealer', createdAt: now, updatedAt: now, locations: [], stakeholders: [], lat: 45.46, lng: 9.19, notes: '' };
const deal = { id: 'syrio-test-deal', contactId: contact.id, title: 'Verifica interfaccia', value: 1250, stage: 'qualificato', nextAction: 'Verifica prossima azione', nextActionType: 'chiama', nextActionDeadline: now - 86400000, nextActionPriority: 'alta', createdAt: now, updatedAt: now };
await context.addInitScript(({ contact, deal }) => {
  const date = new Date(); date.setHours(10,30,0,0);
  localStorage.setItem('next-move-storage', JSON.stringify({ state: { profile: { name: 'Verifica Locale', company: 'Ambiente isolato', role: 'Commerciale', defaultMonthlyTarget: 10000, customProducts: [] }, contacts: { [contact.id]: contact }, deals: { [deal.id]: deal }, activities: { 'syrio-test-visit': { id: 'syrio-test-visit', contactId: contact.id, type: 'visita', date: date.getTime(), outcome: 'da-fare', notes: 'Visita di verifica locale', createdAt: date.getTime() } }, theme: 'dark', products: { 'syrio-test-product': { id: 'syrio-test-product', name: 'Prodotto verifica', code: 'TEST', category: 'accessori', line: 'X1900', price: 25, discount: 0, colors: [], sizes: [] } } }, version: 0 }));
  localStorage.setItem('nm_last_view', 'dashboard');
}, { contact, deal });
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.pathname === '/src/lib/authContext.tsx') return route.fulfill({ contentType: 'application/javascript', body: `const state={user:{uid:'syrio-local-test',providerData:[],email:'test@example.invalid'},loading:false,logout:async()=>{},loginWithGoogle:async()=>{},loginWithEmail:async()=>{},registerWithEmail:async()=>{},resetPassword:async()=>{},clearLoginError:()=>{}}; export function AuthProvider({children}){return children}; export function useAuth(){return state}` });
  if (url.pathname === '/src/lib/useFirestoreSync.ts') return route.fulfill({ contentType: 'application/javascript', body: 'export function useFirestoreSync(){}' });
  if (url.pathname === '/src/lib/storicoFirestore.ts') return route.fulfill({ contentType: 'application/javascript', body: 'export async function loadStoricoFromFirestore(){return null};export async function saveStoricoToFirestore(){throw new Error("Cloud non connesso nel test locale")};export async function deleteStoricoFromFirestore(){}' });
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
  if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Servizio non disponibile nella verifica locale"}' });
  return route.continue();
});
const page = await context.newPage();
page.on('pageerror', err => errors.push(err.stack));
await page.goto('http://127.0.0.1:5173');
await page.getByRole('button', { name: 'Dashboard', exact: true }).first().waitFor();
await page.locator('main h1').first().waitFor();
const phase = process.argv[2] || 'after';
const checks = [];
async function resize(size) {
  await page.setViewportSize(size);
  // Let ResizeObserver/ResponsiveContainer finish before measuring charts.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function overflow(label) {
  const value = await page.evaluate(() => {
    const main = document.querySelector('main');
    return { page: document.documentElement.scrollWidth > innerWidth, main: main ? main.scrollWidth > main.clientWidth : false, offenders: [...document.querySelectorAll('main *')].filter(el => { const r=el.getBoundingClientRect(); return r.width && (r.right>innerWidth+1||r.left<0); }).slice(0,8).map(el=>({tag:el.tagName,cls:el.className?.baseVal??el.className})) };
  });
  checks.push({ label, ...value });
}
await page.screenshot({animations: 'disabled', path: `${out}/dashboard-desktop-${phase}.png`, fullPage: true });
await resize({ width: 390, height: 844 });
await page.screenshot({animations: 'disabled', path: `${out}/dashboard-mobile-${phase}.png`, fullPage: true });
await overflow('Dashboard mobile');
for (const name of ['Clienti','Pipeline','Offerte','Prodotti','Agenda','Attività','Mappa','To Do','Strategia','Analytics','Storico','Legal','Impostazioni']) {
  await resize({ width: 1440, height: 1000 });
  await page.locator('aside').getByRole('button',{name,exact:true}).first().click();
  await expect(page.locator('main')).not.toHaveText('');
  await page.waitForFunction(() => document.querySelector('main')?.textContent.trim().length > 20);
  await expect(page.locator('main .animate-spin')).toHaveCount(0);
  await page.screenshot({animations: 'disabled', path: `${out}/${name.replaceAll(' ','-')}-desktop.png`, fullPage: true });
  await resize({ width: 390, height: 844 });
  await page.screenshot({animations: 'disabled', path: `${out}/${name.replaceAll(' ','-')}-mobile.png`, fullPage: true });
  await overflow(`${name} mobile`);
}
const flows = [];
async function navigate(name) {
  await resize({ width: 1440, height: 1000 });
  await page.locator('aside').getByRole('button',{name,exact:true}).first().click();
  await expect(page.locator('main .animate-spin')).toHaveCount(0);
}
async function state() { return page.evaluate(async () => { const s=(await import('/src/store/useStore.ts')).useStore.getState(); return { contacts:s.contacts, offers:s.offers, deals:s.deals, activities:s.activities, theme:s.theme,textSize:s.textSize }; }); }
async function flow(name, fn) {
  try { await fn(); flows.push({ name, passed:true }); }
  catch(err) { flows.push({ name, passed:false, error:err.message }); await page.screenshot({animations: 'disabled',path:`${out}/failure-${flows.length}.png`,fullPage:true}); await page.keyboard.press('Escape'); }
  await writeFile(`${out}/flows.json`,JSON.stringify(flows,null,2));
}
await flow('cliente → offerta → salvataggio', async () => {
  await navigate('Clienti');
  await page.locator('main').getByRole('button',{name:'Storico',exact:true}).first().click();
  await page.getByRole('button',{name:'Nuova offerta',exact:true}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading',{name:'Nuovo Preventivo'})).toBeVisible();
  await dialog.getByRole('button',{name:'Solo totale ordine'}).click();
  await dialog.getByPlaceholder('0.00').fill('125.50');
  await resize({width:390,height:844});
  await page.screenshot({animations: 'disabled',path:`${out}/offerta-editor-mobile.png`,fullPage:true});
  await dialog.getByRole('button',{name:'Salva',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  const offer = Object.values((await state()).offers).find(o=>o.contactId===contact.id);
  expect(offer?.totalAmount).toBe(125.5); expect(offer?.status).toBe('bozza');
});
await flow('opportunità → esito → prossima azione', async () => {
  await navigate('Dashboard');
  await page.getByRole('button',{name:'Fatto',exact:true}).click();
  await page.getByRole('dialog').locator('textarea').fill('Interesse confermato nella verifica locale');
  await page.getByRole('button',{name:'Salva e continua'}).click();
  await page.getByRole('button',{name:/Programma i prossimi passi/}).click();
  await page.getByPlaceholder('Es. Chiamare Mario per conferma ordine...').fill('Richiamare per verifica');
  await page.getByRole('dialog').locator('input[type=date]').fill('2026-10-20');
  await resize({width:390,height:844});
  await page.screenshot({animations: 'disabled',path:`${out}/prossima-azione-mobile.png`,fullPage:true});
  await page.getByRole('button',{name:'Salva Prossima Azione'}).click();
  const s=await state(); expect(s.deals[deal.id].nextAction).toContain('Richiamare per verifica');
  expect(Object.values(s.activities).some(a=>a.dealId===deal.id&&a.results==='Interesse confermato nella verifica locale')).toBe(true);
});
await flow('appuntamento → esito', async () => {
  await navigate('Agenda');
  await page.getByTitle('Chiudi appuntamento',{exact:true}).first().click();
  await page.getByPlaceholder('Descrivi come è andata la visita, cosa è stato discusso, prossimi passi...').fill('Visita completata nella verifica locale');
  await resize({width:390,height:844});
  await page.screenshot({animations: 'disabled',path:`${out}/esito-visita-mobile.png`,fullPage:true});
  await page.getByRole('dialog').getByRole('button',{name:'Chiudi Appuntamento',exact:true}).click();
  const visit=(await state()).activities['syrio-test-visit']; expect(visit.outcome).toBe('fatto'); expect(visit.results).toBe('Visita completata nella verifica locale');
});
await flow('importazione → consultazione risultati locali', async () => {
  await navigate('Storico');
  const csv='Cliente,Item ID,Prodotto,Data,Anno,Importo,Quantita\nCliente verifica locale,TEST,Prodotto verifica,2026-10-01,2026,125.50,5\n';
  await page.locator('main input[type=file]').setInputFiles({name:'syrio-verifica.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await expect(page.locator('main')).toContainText('Cliente verifica locale');
  const saved=await page.evaluate(async()=> (await import('/src/store/storicoStore.ts')).useStoricoStore.getState().clienti);
  expect(saved.length).toBe(1); expect(saved[0].fatturato2026).toBe(125.5);
  await page.screenshot({animations: 'disabled',path:`${out}/storico-risultati-desktop.png`,fullPage:true});
  await resize({width:390,height:844});
  await page.screenshot({animations: 'disabled',path:`${out}/storico-risultati-mobile.png`,fullPage:true});
  await overflow('Risultati importazione mobile');
});
await flow('conferma annullata e tastiera', async () => {
  await navigate('Clienti');
  await page.getByRole('button',{name:`Elimina ${contact.company}`,exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('Conferma operazione');
  await resize({width:390,height:844});
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await page.screenshot({animations: 'disabled',path:`${out}/conferma-mobile.png`,fullPage:true});
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); expect((await state()).contacts[contact.id]).toBeTruthy();
});
await flow('tema chiaro e dimensione testo conservati', async () => {
  await navigate('Impostazioni');
  await page.getByRole('switch',{name:'Tema scuro'}).click();
  expect((await state()).theme).toBe('light');
  await page.getByTitle('Grande',{exact:true}).click();
  expect((await state()).textSize).toBe('large');
  await expect(page.locator('html')).toHaveCSS('font-size','19px');
  await navigate('Dashboard');
  await page.screenshot({animations: 'disabled',path:`${out}/dashboard-light-desktop.png`,fullPage:true});
  await resize({width:390,height:844});
  await page.screenshot({animations: 'disabled',path:`${out}/dashboard-light-large-mobile.png`,fullPage:true});
  await overflow('Tema chiaro, testo grande mobile');
});
await flow('pannello AI: apertura e chiusura da tastiera', async () => {
  await page.getByRole('button',{name:'Registra attività',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText('Registra attività');
  await page.screenshot({animations: 'disabled',path:`${out}/ai-capture-mobile.png`,fullPage:true});
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
});
for (const name of ['Clienti','Pipeline','Agenda','Offerte','Storico','Impostazioni']) {
  await navigate(name); await resize({width:390,height:844});
  await overflow(`${name} chiaro testo grande`);
}
await page.evaluate(async()=> (await import('/src/store/useStore.ts')).useStore.getState().setProfile(null));
await expect(page.getByRole('heading',{name:'Benvenuto',exact:true})).toBeVisible();
await page.screenshot({animations: 'disabled',path:`${out}/onboarding-mobile.png`,fullPage:true});
const loginContext=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await loginContext.route('**/*',route=> ['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
const login=await loginContext.newPage(); await login.goto('http://127.0.0.1:5173');
await expect(login.getByRole('heading',{name:'Benvenuto in SYRIO'})).toBeVisible();
await login.screenshot({animations: 'disabled',path:`${out}/login-desktop.png`,fullPage:true});
await login.setViewportSize({width:390,height:844});
await login.screenshot({animations: 'disabled',path:`${out}/login-mobile.png`,fullPage:true});
await login.getByRole('button',{name:'Password dimenticata?'}).click();
await login.screenshot({animations: 'disabled',path:`${out}/recupero-accesso-mobile.png`,fullPage:true});
await login.getByRole('button',{name:'Torna al login'}).click();
await login.getByRole('button',{name:'Non hai un account? Registrati'}).click();
await login.screenshot({animations: 'disabled',path:`${out}/registrazione-mobile.png`,fullPage:true});
await loginContext.close();
await writeFile(`${out}/results-${phase}.json`, JSON.stringify({ phase, errors, checks }, null, 2));
await writeFile(`${out}/last-dom.txt`, await page.locator('body').innerText());
await browser.close();
console.log(JSON.stringify({ out, phase, errors, flows, checks: checks.map(({label,page,main})=>({label,page,main})) }));
if(errors.length||flows.some(f=>!f.passed)||checks.some(c=>c.page||c.main))process.exitCode=1;
