const fs = require('fs');
const path = require('path');
const { loadProto, types, getRoot } = require('./src/proto');
const { decodeGateMessage } = require('./src/decode');
const { toNum } = require('./src/utils');
const cryptoWasm = require('./src/utils/crypto-wasm');

const hexDir = path.join(__dirname, 'socket_message', 'hex');
const resDir = path.join(__dirname, 'socket_message', 'res');

async function main() {
    await loadProto();
    const root = getRoot();

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

            const msg = types.GateMessage.decode(buf);
            const meta = msg.meta;
            const svc = meta.service_name || '';

            if (svc === 'gamepb.plantpb.PlantService' && msg.body && msg.body.length > 0) {
                const rawBody = Buffer.from(msg.body);
                const mtd = meta.method_name || '';
                const isReq = meta.message_type === 1;
                const suffix = isReq ? 'Request' : 'Reply';
                const autoType = `${svc.replace('Service', '')}.${mtd}${suffix}`;

                let bodyType = null;
                try { bodyType = root.lookupType(autoType); } catch (e) {}
                if (!bodyType) {
                    const parts = svc.split('.');
                    if (parts.length >= 2) {
                        const ns = parts.slice(0, parts.length - 1).join('.');
                        try { bodyType = root.lookupType(`${ns}.${mtd}${suffix}`); } catch (e) {}
                    }
                }

                if (bodyType) {
                    let decoded;
                    try {
                        decoded = bodyType.decode(rawBody);
                    } catch (e) {
                        try {
                            const decryptedBody = await cryptoWasm.decryptBuffer(rawBody);
                            decoded = bodyType.decode(decryptedBody);
                        } catch (e2) {
                            console.log(`  Warning: 无法解码 body: ${e2.message}`);
                        }
                    }

                    if (decoded) {
                        const json = decoded.toJSON();
                        if (json.lands) {
                            fs.writeFileSync(path.join(__dirname, 'lands.json'), JSON.stringify({ lands: json.lands }, null, 2));
                            console.log(`  -> 已写入 lands.json (${json.lands.length} 块土地)`);
                        }
                    }
                }
            }
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Done! All outputs written to socket_message/res/');
}

main();
