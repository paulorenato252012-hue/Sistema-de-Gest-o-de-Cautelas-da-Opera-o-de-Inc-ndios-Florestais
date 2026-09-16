const cheerio = require('cheerio');
fetch('https://www.bombeiros.ms.gov.br/fale-conosco/unidades/unidades-regionais/')
  .then(r => r.text())
  .then(html => {
    const $ = cheerio.load(html);
    let results = new Set();
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      if ((text.includes('GBM') || text.includes('SGBM')) && text.length < 100) {
        if(text.match(/\d+.*GBM/)) results.add(text);
      }
    });
    console.log(Array.from(results).join('\n'));
  });
