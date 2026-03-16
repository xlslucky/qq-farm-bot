import { NextRequest, NextResponse } from 'next/server';
import { loadProto } from '../../../lib/proto';
import { decodeGateMessage } from '../../../lib/decode';

let protoLoaded = false;

export async function POST(req: NextRequest) {
  try {
    if (!protoLoaded) {
      await loadProto();
      protoLoaded = true;
    }
    
    const { getRoot } = await import('../../../lib/proto');
    const root = getRoot();
    
    const { data, isHex } = await req.json();
    
    if (!data) {
      return NextResponse.json({ success: false, error: '缺少数据' });
    }

    let buf;
    try {
      if (isHex || /^[0-9a-fA-F\s]+$/.test(data)) {
        buf = Buffer.from(data.replace(/\s+/g, ''), 'hex');
      } else {
        buf = Buffer.from(data.trim(), 'base64');
      }
    } catch (e: any) {
      return NextResponse.json({ success: false, error: `数据解析失败: ${e.message}` });
    }

    try {
      const result = await decodeGateMessage(buf, root);
      return NextResponse.json({ success: true, output: result.output, matureGroups: result.matureGroups });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: `解码失败: ${e.message}` });
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}