import Long from 'long';
import { getMatureGroups, type MatureGroup } from './schedule';

export interface DecodeResult {
    output: string;
    matureGroups: MatureGroup[];
}

function longReplacer(_key: string, value: any) {
    if (value && typeof value === 'object' && value.low !== undefined && value.high !== undefined) {
        return Long.fromBits(value.low, value.high, true).toString();
    }
    if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
        return `<${value.data.length} bytes>`;
    }
    return value;
}

function toNum(val: any) {
    if (Long.isLong(val)) return val.toNumber();
    return val || 0;
}

interface ServiceHandler {
    service: string;
    method?: string;
    handler: (json: any) => MatureGroup[];
}

function createMatureScheduleHandler(): ServiceHandler {
    return {
        service: 'gamepb.plantpb.PlantService',
        method: 'AllLands',
        handler: (json: any): MatureGroup[] => {
            if (!json.lands) return [];
            return getMatureGroups(json.lands);
        }
    };
}

const serviceHandlers: ServiceHandler[] = [
    createMatureScheduleHandler(),
];

export async function decodeGateMessage(buf: Buffer, root: any): Promise<DecodeResult> {
    const { types }: any = await import('./proto');
    const msg = types.GateMessage.decode(buf);
    const meta = msg.meta;

    let output = buf.toString('hex') + '\n';
    output += '=== gatepb.Message (外层) ===\n';
    output += `  service:     ${meta.service_name}\n`;
    output += `  method:      ${meta.method_name}\n`;
    output += `  type:        ${meta.message_type} (${meta.message_type === 1 ? 'Request' : meta.message_type === 2 ? 'Response' : 'Notify'})\n`;
    output += `  client_seq:  ${toNum(meta.client_seq)}\n`;
    output += `  server_seq:  ${toNum(meta.server_seq)}\n`;
    if (toNum(meta.error_code) !== 0) {
        output += `  error_code:  ${toNum(meta.error_code)}\n`;
        output += `  error_msg:   ${meta.error_message}\n`;
    }
    output += '\n';

    let matureGroups: MatureGroup[] = [];

    if (msg.body && msg.body.length > 0) {
        const rawBody = Buffer.from(msg.body);
        const svc = meta.service_name || '';
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
            try {
                const decoded = bodyType.decode(rawBody);
                const json = decoded.toJSON();
                output += `body hex (未加密): ${rawBody.toString('hex')}\n`;
                output += `=== ${bodyType.fullName} (body 未加密) ===\n`;
                output += JSON.stringify(json, longReplacer, 2) + '\n';

                for (const handler of serviceHandlers) {
                    if (handler.service === svc && (!handler.method || handler.method === mtd)) {
                        matureGroups = handler.handler(json);
                    }
                }
            } catch (e: any) {
                output += `body hex (加密): ${rawBody.toString('hex')}\n`;
                output += `  解码失败: 需要解密 (${e.message})\n`;
            }
        } else {
            output += `body hex: ${rawBody.toString('hex')}\n`;
            output += '  未能自动推断类型\n';
        }
    }

    return { output, matureGroups };
}