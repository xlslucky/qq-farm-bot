#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
const qlUrl = args[0];
const token = args[1];
const localPath = args[2];
const remotePath = args[3] || '';

if (!qlUrl || !token || !localPath) {
    console.log('用法: node deploy-to-ql.js <面板地址> <token> <本地路径> [远程路径]');
    console.log('');
    console.log('参数说明:');
    console.log('  面板地址   青龙面板地址，如 http://192.168.1.1:5700');
    console.log('  token      青龙面板的 Authorization Token');
    console.log('  本地路径   要上传的文件夹/文件路径');
    console.log('  远程路径   青龙面板存放的文件夹（默认: 根目录）');
    console.log('');
    console.log('示例:');
    console.log('  node deploy-to-ql.js http://localhost:5700 token ./dist');
    console.log('  node deploy-to-ql.js http://localhost:5700 token ./dist qq-farm');
    console.log('  node deploy-to-ql.js http://localhost:5700 token ./myfolder bot/qq-farm');
    process.exit(1);
}

const baseUrl = qlUrl.replace(/\/$/, '');
const isHttps = baseUrl.startsWith('https');
const httpModule = isHttps ? https : http;

function request(method, urlPath, data) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, baseUrl);
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        const req = httpModule.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(30000);
        req.write(postData);
        req.end();
    });
}

async function uploadFile(filePath, relativePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath);
    const remoteDir = remotePath ? path.join(remotePath, path.dirname(relativePath)).replace(/\\/g, '/') : path.dirname(relativePath);

    console.log(`上传: ${relativePath} -> ${remoteDir || '(根目录)'}`);

    try {
        const result = await request('POST', '/api/scripts', {
            filename,
            path: remoteDir || '',
            content,
        });
        
        if (result.code === 200) {
            console.log(`  ✓ 成功`);
        } else {
            console.log(`  ✗ 失败: ${result.message || JSON.stringify(result)}`);
        }
    } catch (e) {
        console.log(`  ✗ 错误: ${e.message}`);
    }
}

async function walkDir(dir, baseDir = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(baseDir, entry.name).replace(/\\/g, '/');
        if (entry.isDirectory()) {
            await walkDir(fullPath, relativePath);
        } else {
            await uploadFile(fullPath, relativePath);
        }
    }
}

async function main() {
    const srcPath = path.isAbsolute(localPath) ? localPath : path.join(__dirname, localPath);
    
    if (!fs.existsSync(srcPath)) {
        console.error(`错误: ${srcPath} 不存在`);
        process.exit(1);
    }

    const stat = fs.statSync(srcPath);
    console.log(`开始上传到 ${baseUrl}`);
    console.log(`本地路径: ${srcPath}`);
    console.log(`远程路径: ${remotePath || '(根目录)'}\n`);

    if (stat.isFile()) {
        await uploadFile(srcPath, path.basename(srcPath));
    } else {
        await walkDir(srcPath, '');
    }

    console.log('\n上传完成!');
}

main().catch(console.error);
