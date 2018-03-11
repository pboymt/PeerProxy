/// <reference path="../multiplex.d.ts" />

import { createServer, request, Server, IncomingMessage, ServerResponse } from "http";
import { connect, Socket } from "net";
import { parse } from "url";
import { EventEmitter } from "events";
import { Duplex } from "stream";
import * as Multiplex from "multiplex";
import { createCipheriv, createDecipheriv } from "crypto";

// function httpproxy(cReq: Request, cRes: Response) {
//     var u = url.parse(cReq.url);

//     var options = {
//         hostname: u.hostname,
//         port: u.port || 80,
//         path: u.path,
//         method: cReq.method,
//         headers: cReq.headers
//     };

//     var pReq = request(options, function (pRes) {
//         cRes.writeHead(pRes.statusCode, pRes.headers);
//         pRes.pipe(cRes);
//     }).on('error', function (e) {
//         cRes.end();
//     });

//     cReq.pipe(pReq);
// }

// function tunnel(cReq: Request, cSock: Socket) {
//     console.log('Connect');
//     var u = parse('http://' + cReq.url);

//     var pSock = connect(Number(u.port), u.hostname, function () {
//         cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
//         cSock.on('data', (chunk) => {
//             console.log(`>>> ${chunk.length}Byte`);
//             pSock.write(chunk);
//         });
//         // pSock.pipe(cSock);
//     }).on('error', function (e) {
//         // console.log(e);
//         cSock.end();
//     }).on('data', (chunk) => {
//         console.log(`<<< ${chunk.length}Byte`);
//         cSock.write(chunk);
//     });

//     // cSock.pipe(pSock);
// }

// createServer()
//     // .on('request', request)
//     .on('connect', tunnel)
//     .listen(6000, '0.0.0.0', () => {
//         console.log('Listening...');
//     });

// +--------+-------------------------------+
// | Scope  |   All        
// +--------+--------------+----------------+
// | Name   | Message Type | Message Length |
// +---+----+--------------+----------------+
// | Length |      1       |
// +---+----+--------------+

export interface StreamInfo {
    host: string;
    port: number;
}

function encrypt(data: string, key: string) {
    if (!data.length) return '';
    const iv = "";
    const clearEncoding = 'utf8';
    const cipherEncoding = 'hex';
    const cipherChunks = [];
    const cipher = createCipheriv('aes-128-ecb', Buffer.from(key), iv);
    cipher.setAutoPadding(true);

    cipherChunks.push(cipher.update(Buffer.from(data), clearEncoding, cipherEncoding));
    cipherChunks.push(cipher.final(cipherEncoding));

    return cipherChunks.join('');
}

function decrypt(data: string, key: string) {
    if (!data.length) return '';
    const iv = "";
    const clearEncoding = 'utf8';
    const decipherEncoding = 'hex';
    const decipherChunks = [];
    const decipher = createDecipheriv('aes-128-ecb', Buffer.from(key), iv);
    decipher.setAutoPadding(true);

    decipherChunks.push(decipher.update(Buffer.from(data), decipherEncoding, clearEncoding));
    decipherChunks.push(decipher.final(decipherEncoding));

    return decipherChunks.join('');
}

class TransferClient extends Duplex {
    constructor() {
        super();
    }

    _write(chunk: Buffer, encoding: string, callback: () => void) {

    }

    _read(size: number) {

    }
}

export class ProxyClient extends EventEmitter {

    private server: Server;
    private transfer: Multiplex.MultiplexInstance;

    constructor(
        private key: string
    ) {
        super();
        this.transfer = Multiplex();
        // console.log(this.transfer);
        this.server = createServer()
            .on('connect', (cReq, cltSock) => {
                this.tunnel(cReq, cltSock);
            });
    }

    tunnel(cReq: Request, cltSock: Socket) {
        const timeStamp = Date.now();
        const u = parse(`http://${cReq.url}`);
        const info: StreamInfo = {
            port: +u.port,
            host: u.hostname
        };
        const id = `${timeStamp}-${Math.round(9999 * Math.random()).toString().padStart(4, '0')}-${Buffer.from(JSON.stringify(info)).toString('hex')}`;
        const subStream = this.transfer.createStream(id);
        cltSock.on('data', data => {
            subStream.write(data);
        })
        subStream.on('data', (chunk) => {
            cltSock.write(chunk);
        });
        // const length = Buffer.alloc(2);
        // length.writeUIntBE(Number(u.port), 0, 2);
        // const header = Buffer.concat([Buffer.from([ProxyDataType.HANDSHAKE])]);

    }

    listen() {
        this.server.listen(6700, () => {
            // this.transfer.pipe(outStream);
            // outStream.pipe(this.transfer);
            this.emit('ready', this.transfer);
        });
    }

}

export class ProxyServer extends EventEmitter {

    private demuxer: Multiplex.MultiplexInstance;

    readonly idReg = /^[0-9]+-[0-9]+-([0-9a-f]+)$/;

    constructor(
        private key: string
        // private inStream: Duplex
    ) {
        super();
        // this.tunnel = this.tunnel.bind(this);
        this.demuxer = Multiplex((stream, id) => {
            this.tunnel(stream, id);
        });
        this.ready();
        // inStream.pipe(this.demuxer);
        // this.demuxer.pipe(inStream);
    }

    private ready() {
        setTimeout(() => {
            this.emit('ready', this.demuxer);
        }, 500);
    }

    tunnel(stream: Multiplex.MultiplexSubStream, id: string) {
        const idinfo = id.match(this.idReg);
        const info: StreamInfo = JSON.parse(Buffer.from(idinfo[1] || '', 'hex').toString());
        console.log(info);
        const pSock = connect(info.port, info.host,  ()=> {
            stream.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            stream.on('data', (chunk) => {
                // console.log(`>>> ${chunk.length}Byte`);
                pSock.write(chunk);
            });
            // pSock.pipe(stream);
        }).on('error', function (e) {
            console.log(e);
            // stream.end();
        })
        .on('data', (chunk) => {
            // console.log(`<<< ${chunk.length}Byte`);
            stream.write(chunk);
        });
        // stream.pipe(pSock);
    }

}