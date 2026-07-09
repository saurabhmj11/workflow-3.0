const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [search, replace] of replacements) {
        if (content.includes(search)) {
            content = content.replaceAll(search, replace);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated ' + filePath);
    }
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const replacements = [
    ['/builder', '/build'],
    ['/testing', '/test'],
    ['/deployments', '/deploy']
];

walkDir('src', function(filePath) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        replaceInFile(filePath, replacements);
    }
});
