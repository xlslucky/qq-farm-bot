#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const args = process.argv.slice(2);

let qlUrl, token, localPath, remotePath, username, password;

const tokenFilePath = path.join(__dirname, '.ql_token.json');

function loadToken() {
    try {
        if (fs.existsSync(tokenFilePath)) {
            return JSON.parse(fs.readFileSync(tokenFilePath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveToken(tokenValue) {
    const key = qlUrl + '|' + username;
    const data = loadToken();
    data[key] = { token: tokenValue };
    fs.writeFileSync(tokenFilePath, JSON.stringify(data, null, 2));
}

function getToken() {
    const key = qlUrl + '|' + username;
    const data = loadToken();
    return data[key] || null;
}

function clearToken() {
    const logoutIndex = args.findIndex(arg => arg === '--logout');
    if (logoutIndex !== -1) {
        const key = qlUrl ? qlUrl + '|' + username : null;
        const data = loadToken();
        if (key && data[key]) {
            delete data[key];
            fs.writeFileSync(tokenFilePath, JSON.stringify(data, null, 2));
            console.log('✓ 已清除缓存的 token');
        } else {
            if (fs.existsSync(tokenFilePath)) {
                fs.unlinkSync(tokenFilePath);
                console.log('✓ 已清除所有缓存的 token');
            }
        }
        process.exit(0);
    }
}

const logoutIndex = args.findIndex(arg => arg === '--logout');
if (logoutIndex !== -1) {
    clearToken();
    process.exit(0);
}

const loginIndex = args.findIndex(arg => arg === '--login' || arg === '-l');
const localIndex = args.findIndex(arg => arg === '--local');
const remoteIndex = args.findIndex(arg => arg === '--remote');

if (loginIndex !== -1) {
    if (loginIndex + 2 >= args.length) {
        console.log('用法: node deploy-to-ql.js <面板地址> --local <本地路径> [--remote 远程路径] --login <username> <password>');
        process.exit(1);
    }
    qlUrl = args[0];
    localPath = args[localIndex + 1];
    remotePath = remoteIndex !== -1 ? args[remoteIndex + 1] : '';
    username = args[loginIndex + 1];
    password = args[loginIndex + 2];
} else {
    if (args.length < 3) {
        console.log('用法: node deploy-to-ql.js <面板地址> <token> <本地路径> [远程路径]');
        console.log('       node deploy-to-ql.js <面板地址> --local <本地路径> [--remote 远程路径] --login <username> <password>');
        console.log('');
        console.log('参数说明:');
        console.log('  面板地址   青龙面板地址，如 http://192.168.1.1:5700');
        console.log('  token      青龙面板的 Authorization Token');
        console.log('  本地路径   要上传的文件夹/文件路径');
        console.log('  远程路径   青龙面板存放的文件夹（默认: 根目录）');
        console.log('  --login    使用账号密码登录获取 token');
        console.log('  --logout   清除缓存的 token');
        console.log('');
        console.log('示例:');
        console.log('  node deploy-to-ql.js http://localhost:5700 token ./dist');
        console.log('  node deploy-to-ql.js http://localhost:5700 ./dist qq-farm --login admin admin123');
        console.log('  node deploy-to-ql.js --logout');
        process.exit(1);
    }
    qlUrl = args[0];
    token = args[1];
    localPath = args[2];
    remotePath = args[3] || '';
}

const baseUrl = qlUrl.replace(/\/$/, '');
const isHttps = baseUrl.startsWith('https');
const httpModule = isHttps ? https : http;

function request(method, urlPath, data, useToken = true) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, baseUrl);
        const postData = JSON.stringify(data);
        
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
        };
        if (useToken && token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: method,
            headers,
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
    if (username && password) {
        const cached = getToken();
        if (cached && cached.token) {
            token = cached.token;
            console.log(`✓ 使用缓存的 token\n`);
        } else {
            console.log(`登录获取 token...`);
            try {
                const result = await request('POST', '/api/user/login', { username, password }, false);
                if (result.code === 200 && result.data && result.data.token) {
                    token = result.data.token;
                    saveToken(token);
                    console.log(`✓ 登录成功，Token 已缓存\n`);
                } else {
                    console.error(`✗ 登录失败: ${result.message || JSON.stringify(result)}`);
                    process.exit(1);
                }
            } catch (e) {
                console.error(`✗ 登录失败: ${e.message}`);
                process.exit(1);
            }
        }
    }

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
