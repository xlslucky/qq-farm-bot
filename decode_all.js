const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const hexDir = path.join(__dirname, 'socket_message', 'hex');
const resDir = path.join(__dirname, 'socket_message', 'res');

if (!fs.existsSync(resDir)) {
    fs.mkdirSync(resDir, { recursive: true });
}

const files = fs.readdirSync(hexDir).filter(f => f.endsWith('.bin')).sort();

console.log(`Found ${files.length} binary files to decode\n`);
console.log('='.repeat(80));

for (const file of files) {
    const filePath = path.join(hexDir, file);
    const buf = fs.readFileSync(filePath);
    const hexStr = buf.toString('hex').replace(/(.{2})/g, '$1 ').trim();
    
    console.log(`\n>>> ${file}`);
    
    try {
        const isServer = file.includes('_server');
        const cmd = `node client.js --decode "${hexStr}" --hex --gate`;
        const output = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
        
        const outFile = file.replace('.bin', '.txt');
        const outPath = path.join(resDir, outFile);
        fs.writeFileSync(outPath, output);
        
        console.log(`  -> ${outFile}`);
    } catch (e) {
        console.log(`  Error: ${e.message}`);
    }
}

console.log('\n' + '='.repeat(80));
console.log('Done! All outputs written to socket_message/res/');
