export enum BufferMessageType {
    'TEXT' = 0x01,
    'JSON' = 0x02,
    'BUFFER' = 0x03,
    'PROXY' = 0x04
}



export function gBufferMessage(type: BufferMessageType, data: any) {
    let txt: string;
    switch (type) {
        case BufferMessageType.TEXT:
            txt = <string>data;
            break;
        case BufferMessageType.JSON:
            txt = JSON.stringify(data);
            break;
        case BufferMessageType.BUFFER:
            txt = Buffer.from(<string>data).toString();
        case BufferMessageType.PROXY:
            txt = Buffer.from(data).toString();
        default:
            break;
    }
    const textbuf = Buffer.from(txt);
    const length = Buffer.alloc(2);
    length.writeIntBE(textbuf.length, 0, 2);
    const buffer = Buffer.concat([Buffer.from([type]), length, textbuf]);
    return buffer;
}

export function pBufferMessage(buffer: Buffer) {
    const type = buffer.slice(0, 1);
    const length = buffer.slice(1, 3);
    const content = buffer.slice(3, buffer.length);
    // console.log(type);
    // console.log(length);
    // console.log(content.length === length.readIntBE(0, 4));
    return {
        type: type[0],
        length: length.readIntBE(0, 2),
        content: content
    }
}