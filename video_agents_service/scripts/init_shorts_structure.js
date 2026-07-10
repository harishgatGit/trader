const fs = require('fs');
const path = require('path');

const OUTPUTS_DIR = path.join(__dirname, '..', 'outputs', 'videos');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeTemplate(tickerDir, ticker, dateDir) {
  const shortsDir = path.join(tickerDir, 'shorts_for_generation');
  ensureDir(shortsDir);

  const template = {
    ticker,
    date: path.basename(dateDir),
    short_spec: {
      duration_seconds: 30,
      segments: [
        { start: 0, end: 3, role: 'hook', text: 'Show chart crashing or shooting up. Bold statement: "This stock is about to crash 20% tomorrow."' },
        { start: 4, end: 20, role: 'proof', text: 'Highlight one specific metric or news headline here (replace with real metric/news).' },
        { start: 21, end: 30, role: 'cta', text: 'Ask a question: "Are you buying or selling this? Let me know below."' }
      ],
      guidance: 'Use bold text, quick cuts, chart animation, and AI voiceover. See https://www.imagine.art/blogs/how-to-add-ai-voiceover-to-video'
    }
  };

  const outFile = path.join(shortsDir, 'short_template.json');
  fs.writeFileSync(outFile, JSON.stringify(template, null, 2));
}

function process() {
  if (!fs.existsSync(OUTPUTS_DIR)) {
    console.error('Outputs directory not found:', OUTPUTS_DIR);
    process.exit(1);
  }

  const dateDirs = fs.readdirSync(OUTPUTS_DIR).map(d => path.join(OUTPUTS_DIR, d)).filter(p => fs.statSync(p).isDirectory());
  dateDirs.forEach(dateDir => {
    const tickers = fs.readdirSync(dateDir).map(d => path.join(dateDir, d)).filter(p => fs.statSync(p).isDirectory());
    tickers.forEach(tickerDir => {
      const ticker = path.basename(tickerDir);
      // create current_video and shorts_for_generation folders
      const currentVideoDir = path.join(tickerDir, 'current_video');
      ensureDir(currentVideoDir);

      writeTemplate(tickerDir, ticker, dateDir);
    });
  });

  console.log('Initialized shorts structure for all tickers under', OUTPUTS_DIR);
}

if (require.main === module) process();

module.exports = { process };
