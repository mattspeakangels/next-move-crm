import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, '../../Blaklader/DATI_CONTATTI/blaklader_prodotti.csv');
const outputPath = path.join(__dirname, '../src/data/products.json');

const categoryMap = {
  'Pantaloni e Salopette': 'pantaloni',
  'Giacche e Parka': 'giacche',
  'Felpe e Pullover': 'felpe',
  'T-Shirt e Polo': 'tshirt',
  'Camicie': 'camicie',
  'Intimo e Calze': 'accessori',
  'Accessori e DPI': 'accessori'
};

const lineMap = {
  'X1900': 'X1900',
  'X1500': 'X1500',
  'X1600': 'X1600',
  'Striker': 'X1600',
  'High Vis': 'HiVis'
};

function detectLine(desc) {
  for (const [key, value] of Object.entries(lineMap)) {
    if (desc.includes(key)) return value;
  }
  return 'X1900';
}

function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',');
  const products = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = values[idx] || '';
    });

    const category = categoryMap[obj['Macrocategoria']] || 'accessori';
    const colors = obj['Colori Disponibili']
      .split(',')
      .map(c => c.trim())
      .filter(c => c && c !== 'Non disponibile nelle fonti');

    products.push({
      id: `prod_${obj['Codice Articolo']}`,
      code: obj['Codice Articolo'],
      name: obj['Descrizione'],
      description: obj['Descrizione'],
      category: category,
      price: 0,
      discount: 0,
      colors: colors,
      sizes: obj['Taglie Disponibili'],
      line: detectLine(obj['Descrizione'])
    });
  }

  return products;
}

try {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const products = parseCSV(csvContent);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
  console.log(`✅ ${products.length} prodotti importati`);
} catch (err) {
  console.error('❌ Errore:', err.message);
  process.exit(1);
}
