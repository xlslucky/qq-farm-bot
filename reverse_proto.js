const protobuf = require('protobufjs');

function isPrintableUtf8(buf) {
  try {
    const s = Buffer.from(buf).toString('utf8');
    if (!s) return false;
    let ok = 0;
    for (const c of s) {
      const code = c.charCodeAt(0);
      if (code >= 32 || c === '\n' || c === '\t') ok++;
    }
    return ok / s.length > 0.8;
  } catch {
    return false;
  }
}

function reverseMessage(buf, name = 'Root', depth = 0, known = new Map()) {
  const reader = protobuf.Reader.create(buf);
  const fields = new Map();

  while (reader.pos < reader.len) {
    const tag = reader.uint32();
    const fieldNum = tag >>> 3;
    const wireType = tag & 7;

    if (!fields.has(fieldNum)) {
      fields.set(fieldNum, { wireType, count: 0, samples: [] });
    }

    const f = fields.get(fieldNum);
    f.count++;

    switch (wireType) {
      case 0:
        f.samples.push(reader.int64());
        break;
      case 1:
        reader.fixed64();
        break;
      case 2: {
        const bytes = reader.bytes();
        f.samples.push(bytes);
        break;
      }
      case 5:
        reader.fixed32();
        break;
      default:
        reader.skipType(wireType);
    }
  }

  const proto = [];
  proto.push(`message ${name} {`);

  for (const [num, info] of [...fields.entries()].sort((a, b) => a[0] - b[0])) {
    const repeated = info.count > 1 ? 'repeated ' : '';
    let type = 'bytes';

    if (info.wireType === 0) {
      const vals = info.samples.map(v => Number(v));
      const uniq = new Set(vals);
      if ([0, 1].every(v => uniq.has(v))) {
        type = 'bool';
      } else {
        type = 'uint32';
      }
    }

    if (info.wireType === 2 && info.samples.length > 0) {
      const sample = info.samples[0];

      if (isPrintableUtf8(sample)) {
        type = 'string';
      } else {
        // 尝试递归解析为 message
        try {
          const subName = `${name}_Field${num}`;
          if (!known.has(subName)) {
            known.set(subName, sample);
          }
          type = subName;
        } catch {
          type = 'bytes';
        }
      }
    }

    proto.push(`  ${repeated}${type} field_${num} = ${num};`);
  }

  proto.push(`}`);
  proto.push('');

  for (const [subName, subBuf] of known.entries()) {
    proto.push(...reverseMessage(subBuf, subName, depth + 1, known));
    known.delete(subName);
  }

  return proto;
}

/* ========= CLI ========= */

if (require.main === module) {
  const input = process.argv[2];
  const isHex = process.argv.includes('--hex');

  if (!input) {
    console.log(`用法:
node reverse_proto.js <base64|hex> [--hex]`);
    process.exit(1);
  }

  const buf = isHex
    ? Buffer.from(input, 'hex')
    : Buffer.from(input, 'base64');

  const proto = reverseMessage(buf);
  console.log(proto.join('\n'));
}