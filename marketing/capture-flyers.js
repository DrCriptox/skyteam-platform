/**
 * SKY TEAM — Exportador de Flyers a PNG
 *
 * Genera los 6 flyers como imágenes PNG de 1080×1080 reales.
 * Las imágenes quedan en: marketing/png/
 *
 * REQUISITOS:
 *   node capture-flyers.js
 *
 * Si falta puppeteer, instálalo primero:
 *   npm install puppeteer
 *
 * Ejecuta desde la carpeta raíz del proyecto:
 *   node marketing/capture-flyers.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs   = require('fs');

const flyers = [
  { file: 'flyer-2dias.html', name: '01-faltan-2-dias' },
  { file: 'flyer-1dia.html',  name: '02-falta-1-dia'   },
  { file: 'flyer-8h.html',    name: '03-faltan-8h'     },
  { file: 'flyer-4h.html',    name: '04-faltan-4h'     },
  { file: 'flyer-2h.html',    name: '05-faltan-2h'     },
  { file: 'flyer-1h.html',    name: '06-falta-1h'      },
];

const OUT_DIR = path.join(__dirname, 'marketing', 'png');
const IN_DIR  = path.join(__dirname, 'marketing', 'flyers');

async function run() {
  // Create output dir
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('\n🚀 Sky Team — Exportando flyers a PNG...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const f of flyers) {
    const filePath = path.join(IN_DIR, f.file);
    const fileUrl  = 'file:///' + filePath.replace(/\\/g, '/');
    const outPath  = path.join(OUT_DIR, f.name + '.png');

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(500); // Let animations settle

    // Screenshot just the .canvas div (1080×1080)
    const element = await page.$('.canvas');
    if (element) {
      await element.screenshot({ path: outPath, type: 'png' });
      console.log('  ✓ ' + f.name + '.png');
    } else {
      // Fallback: full page screenshot
      await page.screenshot({ path: outPath, type: 'png', clip: { x:0, y:0, width:1080, height:1080 } });
      console.log('  ✓ ' + f.name + '.png (full page)');
    }

    await page.close();
  }

  await browser.close();

  console.log('\n✅ Listo! Imágenes guardadas en: marketing/png/');
  console.log('   Comparte directamente por WhatsApp desde esa carpeta.\n');
}

run().catch(err => {
  console.error('\n❌ Error:', err.message);
  if (err.message.includes("Cannot find module 'puppeteer'")) {
    console.error('\n👉 Instala puppeteer primero:\n   npm install puppeteer\n');
  }
  process.exit(1);
});
