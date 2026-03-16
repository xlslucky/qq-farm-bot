const fs = require('fs');
const path = require('path');
const { loadProto } = require('./src/proto');
const { decodeGateMessage } = require('./src/decode');

const hexDir = path.join(__dirname, 'socket_message', 'hex');
const resDir = path.join(__dirname, 'socket_message', 'res');

async function main() {
    await loadProto();
    const root = require('./src/proto').getRoot();

    if (!fs.existsSync(resDir)) {
        fs.mkdirSync(resDir, { recursive: true });
    } else {
        const existingFiles = fs.readdirSync(resDir);
        for (const f of existingFiles) {
            fs.unlinkSync(path.join(resDir, f));
        }
        console.log(`Cleared ${existingFiles.length} files from ${resDir}\n`);
    }

    const binFiles = fs.readdirSync(hexDir).filter(f => f.endsWith('.bin')).sort();
    const txtFiles = fs.readdirSync(hexDir).filter(f => f.endsWith('.txt')).sort();
    const files = [...binFiles.map(f => ({ name: f, isHex: false })), ...txtFiles.map(f => ({ name: f, isHex: true }))];

    console.log(`Found ${binFiles.length} binary files and ${txtFiles.length} hex files to decode\n`);
    console.log('='.repeat(80));

    for (const { name: file, isHex } of files) {
        const filePath = path.join(hexDir, file);
        let buf;
        if (isHex) {
            const hexContent = fs.readFileSync(filePath, 'utf-8').replace(/\s+/g, '').trim();
            buf = Buffer.from(hexContent, 'hex');
        } else {
            buf = fs.readFileSync(filePath);
        }
        
        console.log(`\n>>> ${file}${isHex ? ' (hex)' : ''}`);
        
        try {
            const output = await decodeGateMessage(buf, root);
            
            let suffix = '.txt';
            if (output.includes('未能自动推断类型')) {
                suffix = '-unknown.txt';
            }
            const outFile = file.replace(/\.(bin|txt)$/, suffix);
            const outPath = path.join(resDir, outFile);
            fs.writeFileSync(outPath, output);
            
            console.log(`  -> ${outFile}`);
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Done! All outputs written to socket_message/res/');
}

main();
