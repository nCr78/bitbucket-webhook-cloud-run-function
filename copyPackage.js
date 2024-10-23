const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, 'package.dist.json');
const destination = path.join(__dirname, 'dist', 'package.json');

fs.copyFileSync(source, destination);
console.log(`Copied ${source} to ${destination}`);
