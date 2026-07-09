const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('f:/product/workflow 3.0/src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content
      .replace(/\bbg-\[\#F0F8FF\]\b/g, 'bg-slate-50')
      .replace(/\bborder-4\b/g, 'border')
      .replace(/\bborder-b-4\b/g, 'border-b')
      .replace(/\bborder-r-4\b/g, 'border-r')
      .replace(/\bborder-t-4\b/g, 'border-t')
      .replace(/\bfont-black\b/g, 'font-semibold')
      .replace(/\brounded-3xl\b/g, 'rounded-xl')
      .replace(/\brounded-2xl\b/g, 'rounded-lg')
      .replace(/\brounded-\[3rem\]\b/g, 'rounded-xl')
      .replace(/Bot Builder <span className="text-blue-500">Playground<\/span>/g, 'Workflow Builder')
      .replace(/Let's Build Something!/g, 'Workflow Canvas')
      .replace(/Drag blocks from the left side and drop them here to start building\./g, 'Drag and drop nodes from the palette to get started.')
      .replace(/Use a Template!/g, 'Browse Templates')
      .replace(/>Tidy Up</g, '>Auto Layout<')
      .replace(/>Clear Everything</g, '>Reset Canvas<')
      .replace(/>PLAY!</g, '>Run Workflow<')
      .replace(/>STOP</g, '>Stop<')
      .replace(/>Toy Box</g, '>Node Palette<')
      .replace(/>Drag toys to build!</g, '>Drag nodes to canvas<')
      .replace(/>Oh no! 🙈</g, '>No results found<')
      .replace(/>We couldn't find that toy.</g, '>Try a different search term.<')
      .replace(/>Find a block\.\.\.</g, '>Search nodes...<')
      .replace(/shadow-\[0_6px_0_rgb\([^)]+\)\]/g, 'shadow-sm')
      .replace(/active:translate-y-1/g, 'active:scale-[0.98]')
      .replace(/animate-bounce/g, '')
      .replace(/uppercase tracking-widest/g, 'uppercase tracking-wider')
      .replace(/uppercase tracking-tight/g, '')
      .replace(/shadow-\[-4px_0_15px_rgba\(0,0,0,0\.05\)\]/g, 'shadow-sm')
      .replace(/shadow-\[4px_0_15px_rgba\(0,0,0,0\.02\)\]/g, 'shadow-sm');
      
    if (content !== newContent) {
      console.log('Updated:', filePath);
      fs.writeFileSync(filePath, newContent, 'utf8');
    }
  }
});
