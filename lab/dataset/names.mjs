// Nomi di fantasia per il dataset del laboratorio. Nessun cliente reale, nessun marchio
// reale: aziende, località e prodotti sono inventati o generici.

export const FIRST_NAMES = [
  'Marco', 'Giulia', 'Luca', 'Francesca', 'Andrea', 'Chiara', 'Matteo', 'Sara', 'Davide', 'Elena',
  'Simone', 'Valentina', 'Paolo', 'Martina', 'Stefano', 'Laura', 'Alessandro', 'Federica', 'Roberto', 'Silvia',
  'Fabio', 'Monica', 'Nicola', 'Elisa', 'Giorgio', 'Alessia', 'Massimo', 'Ilaria', 'Claudio', 'Barbara',
  'Daniele', 'Cristina', 'Riccardo', 'Serena', 'Emanuele', 'Roberta', 'Gianluca', 'Anna', 'Enrico', 'Paola',
];

export const LAST_NAMES = [
  'Bellandi', 'Rossetti', 'Ferrandi', 'Galbiati', 'Morandini', 'Castelli', 'Pedrazzi', 'Locatelli', 'Brambati', 'Zanardi',
  'Guarnieri', 'Tironi', 'Mazzoleni', 'Carminati', 'Bonacina', 'Ravasio', 'Pesenti', 'Agazzi', 'Vitali', 'Colombi',
  'Fumagalli', 'Brivio', 'Sangalli', 'Cattaneo', 'Riva', 'Gritti', 'Bertoli', 'Scotti', 'Previtali', 'Belotti',
  'Testa', 'Mangili', 'Ghisleni', 'Rota', 'Valsecchi', 'Arrigoni', 'Moretti', 'Donadoni', 'Facchinetti', 'Salvi',
  'Benaglia', 'Corna', 'Perico', 'Milesi', 'Gamba', 'Invernizzi', 'Capelli', 'Nava', 'Ongaro', 'Plebani',
];

// Località inventate (usate per enti pubblici e indirizzi).
export const TOWNS = [
  'Valdarena', 'Montebrisa', 'Roccalta', 'Borgoselva', 'Pietrafonte', 'Collebruno', 'Fontechiara', 'Riomarino',
  'Castelvento', 'Prato Lungo', 'Acquaserena', 'Sassorotondo', 'Valcorvo', 'Poggiolino', 'Lagobianco', 'Ripalta Serena',
];

export const DEALER_PREFIX = [
  'Antinfortunistica', 'Forniture Industriali', 'Sicurezza e Lavoro', 'Abbigliamento Professionale',
  'Ferramenta', 'Emporio del Lavoro', 'Tutto Protezione', 'Casa della Divisa',
];

export const ENDUSER_PREFIX = [
  'Costruzioni', 'Officine Meccaniche', 'Impianti Elettrici', 'Logistica', 'Carpenteria Metallica',
  'Autotrasporti', 'Edilizia', 'Termoidraulica', 'Lavanderia Industriale', 'Manutenzioni', 'Serramenti', 'Giardini e Verde',
];

export const PUBLIC_PREFIX = [
  'Comune di', 'Azienda Sanitaria di', 'Consorzio di Bonifica di', 'Istituto Comprensivo di', 'Unione dei Comuni di',
];

export const LEGAL = ['Srl', 'Snc', 'Sas', 'Spa', 'Srl'];

// Prodotti generici (nessun marchio).
export const PRODUCTS = [
  'giacche softshell', 'pantaloni da lavoro multitasche', 'polo in piquet', 'felpe con zip', 'gilet alta visibilità',
  'scarpe antinfortunistiche S3', 't-shirt in cotone', 'giubbotti invernali imbottiti', 'pile leggeri',
  'pantaloni alta visibilità classe 2', 'camici da laboratorio', 'cappellini con visiera', 'guanti antitaglio',
  'tute intere da officina', 'grembiuli da cucina',
];

export const GENERIC_DOMAINS = ['gmail.com', 'libero.it', 'hotmail.it', 'yahoo.it'];

/**
 * Parole che non devono MAI comparire nel dataset (nessun marchio o cliente reale).
 * Il test del dataset le cerca in tutto il JSON generato.
 */
export const FORBIDDEN_WORDS = ['blåkläder', 'blaklader', 'blakläder', 'blåklader', 'blaklder'];
