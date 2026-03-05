const { TextEncoder } = require("util");
const fs = require("fs")



/**
 * protobuf wire type
 */
const WireType = {
  VARINT: 0,
  FIXED64: 1,
  LENGTH_DELIMITED: 2,
  START_GROUP: 3,
  END_GROUP: 4,
  FIXED32: 5,
};

function readVarint(buffer, offset) {
  let result = 0n;
  let shift = 0n;
  let pos = offset;

  while (true) {
    const byte = buffer[pos];
    pos++;

    result |= BigInt(byte & 0x7f) << shift;

    if ((byte & 0x80) === 0) break;
    shift += 7n;
  }

  return {
    value: result,
    offset: pos,
  };
}

function tryParseString(buf) {
  try {
    const str = buf.toString("utf8");
    if (/[\x00-\x08]/.test(str)) return null;
    return str;
  } catch {
    return null;
  }
}

function parseMessage(buffer, depth = 0) {
  let offset = 0;

  while (offset < buffer.length) {
    const tag = readVarint(buffer, offset);
    offset = tag.offset;

    const fieldNumber = Number(tag.value >> 3n);
    const wireType = Number(tag.value & 7n);

    const indent = " ".repeat(depth * 2);

    if (wireType === WireType.VARINT) {
      const val = readVarint(buffer, offset);
      offset = val.offset;

      console.log(`${indent}${fieldNumber}: ${val.value}`);

    } else if (wireType === WireType.LENGTH_DELIMITED) {
      const len = readVarint(buffer, offset);
      offset = len.offset;

      const length = Number(len.value);
      const subBuf = buffer.slice(offset, offset + length);

      offset += length;

      const str = tryParseString(subBuf);

      if (str) {
        console.log(`${indent}${fieldNumber}: "${str}"`);
      } else {
        console.log(`${indent}${fieldNumber}: {`);
        parseMessage(subBuf, depth + 1);
        console.log(`${indent}}`);
      }

    } else if (wireType === WireType.FIXED32) {
      const val = buffer.readUInt32LE(offset);
      offset += 4;

      console.log(`${indent}${fieldNumber}: ${val}`);

    } else if (wireType === WireType.FIXED64) {
      const val = buffer.readBigUInt64LE(offset);
      offset += 8;

      console.log(`${indent}${fieldNumber}: ${val}`);

    } else {
      console.log(`${indent}${fieldNumber}: [unsupported wire type ${wireType}]`);
      break;
    }
  }
}

const buf = fs.readFileSync("ws_000059_server.bin")

/**
 * 输入数据
 */
const input = buf.toString('hex')

console.log(input, 'input')

/**
 * 转成buffer
 */
const buffer = Buffer.from(input, "binary");

console.log("====== protobuf decode ======");
parseMessage(buffer);