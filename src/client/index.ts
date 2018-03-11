/// <reference path="../wrtc.d.ts" />
import * as SocketIO from "socket.io-client";
import * as Peer from "simple-peer";
import * as wrtc from "wrtc";
import { createInterface } from "readline";
import out from "../all/output";
import { readFileSync, existsSync, statSync, Stats } from "fs";
import { join, isAbsolute, resolve, basename } from "path";
import { gBufferMessage, BufferMessageType, pBufferMessage } from "./buffer";
import { ProxyClient, ProxyServer } from "./proxy";
import { MultiplexInstance } from "multiplex";

interface PeerData<T> {
    type: 'text' | 'fileinfo' | 'filepiece';
    data: T
}

interface FileInfo {
    name: string;
    size: number;
    hash: string;
    piece: string[];
}

class Client {

    io: SocketIOClient.Socket;
    peer: Peer.Instance;
    proxy: Peer.Instance;
    roomID: string = '';
    rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
    });

    private callingID = '';

    constructor(url: string) {
        this.io = SocketIO(url);
        out.info('Connecting...');
        this.bindIO();
    }

    static run() {
        const client = new Client(process.argv[2] || 'http://localhost:4000');
    }

    repl() {
        this.rl.question('', answer => {

            const m = answer.match(/^\/([A-z]+)/);
            if (m) {
                switch (m[1]) {
                    case 'logout':
                        out.info('Bye!');
                        process.exit(0);
                        break;
                    case 'offer':
                        if (answer.replace(m[0], '').trim().length) {
                            this.connect(answer.replace(m[0], '').trim())
                        }
                        break;
                    case 'answer':
                        if (answer.replace(m[0], '').trim().length || this.callingID.length) {
                            const id = answer.replace(m[0], '').trim().length ? answer.replace(m[0], '').trim() : this.callingID;
                            this.createPeer(id, false);
                            this.io.emit('answer', id);
                        }
                        break;
                    case 'list':
                        this.io.emit('list');
                        break;
                    case 'help':
                        const txt = readFileSync(join(__dirname, '../../text/help.txt'), 'utf-8').split('\n');
                        this.rl.pause();
                        for (const line of txt) {
                            out.help(line);
                        }
                        this.rl.prompt(true);
                        break;
                    case 'p':
                        this.sendMessageAsBuffer(answer.replace(m[0], '').trim());
                        break;
                    case 'f':
                        this.sendFileInfo(answer.replace(m[0], '').trim())
                        break;
                    case 'test':
                        this.peer.send(Buffer.alloc(1024 * Number(answer.replace(m[0], '').trim() || 4), 'test', 'utf-8'));
                        break;
                    case 'proxyc':
                        if (answer.replace(m[0], '').trim().length) {
                            this.connectProxy(answer.replace(m[0], '').trim());
                        }
                        break;
                    case 'proxys':
                        if (answer.replace(m[0], '').trim().length || this.callingID.length) {
                            const id = answer.replace(m[0], '').trim().length ? answer.replace(m[0], '').trim() : this.callingID;
                            this.createProxy(id, false, () => this.io.emit('answer', id));
                        }
                        break;
                    default:
                        this.rl.pause();
                        out.warn('Invalid Command!');
                        this.rl.prompt(true);
                        break;
                }
            } else {
                this.io.send(answer);
            }
            this.repl();
        });
    }

    bindIO() {
        this.io.on('connect', () => {
            out.log(`Your ID is ${this.io.id}`);
            this.repl();
        });
        this.io.on('message', (msg: string) => {
            this.rl.pause();
            out.message(msg);
            this.rl.prompt(true);
        });
        this.io.on('offer', (otherID: string) => {
            this.callingID = otherID;
            this.rl.pause();
            out.info(`You have a call from ${otherID}`);
            this.rl.prompt(true);
        });
        this.io.on('proxy', (otherID: string) => {
            this.callingID = otherID;
            this.rl.pause();
            out.info(`You have a proxy request from ${otherID}`);
            this.rl.prompt(true);
        });
        this.io.on('list', (list: string[]) => {
            this.rl.pause();
            for (let id of list) {
                out.message(`${id}${id === this.io.id ? ' - You' : ''}`);
            }
            this.rl.prompt(true);
        });
        this.io.on('disconnect', () => {
            this.rl.close();
            out.error('Disconnected!');
            process.exit(0);
        });
        this.io.on('error', (err: Error) => {
            console.log(err);
            process.exit(0);
        });
    }

    connect(id: string) {
        this.io.once('answer', (otherID: string) => {
            console.log(otherID);
            if (id === otherID) {
                this.createPeer(id, true);
            }
        });
        this.io.emit('offer', id);
    }

    connectProxy(id: string) {
        this.io.once('answer', (otherID: string) => {
            console.log(otherID);
            if (id === otherID) {
                console.log('create proxy client');
                this.createProxy(id, true);
            }
        });
        this.io.emit('proxy', id);
    }

    private createPeer(otherID: string, initor: boolean) {
        if (!this.peer) {
            this.peer = new Peer({ initiator: initor, wrtc: wrtc });
            this.io.on('signal', (id: string, signal: any) => {
                this.rl.pause();
                out.log(`Get signal from ${otherID}`);
                this.peer.signal(signal);
                this.rl.prompt(true);
            });
            this.peer.on('signal', (signal) => {
                this.io.emit('signal', otherID, signal);
            });
            this.peer.on('connect', () => {
                this.rl.pause();
                out.info(`Peer Connected with ${otherID}`);
                this.io.off('signal');
                this.rl.prompt(true);
            });
            this.peer.on('data', (msg: Buffer) => {
                const p = pBufferMessage(msg);
                switch (p.type) {
                    case BufferMessageType.TEXT:
                        this.rl.pause();
                        out.peer(p.content.toString());
                        this.rl.prompt(true);
                        break;

                    default:
                        this.rl.pause();
                        out.peer(`Get ${msg.length} bytes.`);
                        this.rl.prompt(true);
                        break;
                }
            });
            this.peer.on('close', () => {
                this.rl.pause();
                out.warn('Peer Disconnected!');
                this.peer.removeAllListeners();
                this.peer = null;
                this.rl.prompt(true);
            });
        }
    }

    createProxy(otherID: string, isClient: boolean, callback?: () => void) {
        if (!this.proxy) {
            // if (isClient) {
            console.log(`Create Proxy ${isClient ? 'Client' : 'Server'}`);
            const proxy = isClient ? new ProxyClient(this.io.id) : new ProxyServer(otherID);
            proxy.on('ready', (transfer: MultiplexInstance) => {

                this.proxy = new Peer({ initiator: isClient, wrtc: wrtc });

                this.io.on('signal', (id: string, signal: any) => {
                    this.rl.pause();
                    out.log(`Get signal from ${otherID}`);
                    this.proxy.signal(signal);
                    this.rl.prompt(true);
                });

                this.proxy.on('signal', (signal) => {
                    this.io.emit('signal', otherID, signal);
                });

                this.proxy.on('connect', () => {
                    this.rl.pause();
                    out.info(`Peer Connected with ${otherID}`);

                    this.io.off('signal');
                    transfer.pipe(this.proxy);
                    this.proxy.pipe(transfer);
                    this.rl.prompt(true);
                });

                this.proxy.on('close', () => {
                    this.rl.pause();
                    out.warn('Peer Disconnected!');
                    this.proxy.removeAllListeners();
                    this.proxy.destroy();
                    this.proxy = null;
                    this.rl.prompt(true);
                });

                if (!isClient) {
                    callback();
                }

            });
            if (isClient) {
                (<ProxyClient>proxy).listen();
            }
        }

    }

    sendMessageAsBuffer(msg: string) {
        if (this.peer) {
            const buf = gBufferMessage(BufferMessageType.TEXT, msg);
            this.peer.send(buf);
        } else {
            this.rl.pause();
            out.error('你还未连接到任何一个peer');
            this.rl.prompt(true);
        }
    }

    sendMessage(msg: string) {
        if (this.peer) {
            const data: PeerData<string> = {
                type: 'text',
                data: msg
            }
            this.peer.send(JSON.stringify(data));
        } else {
            this.rl.pause();
            out.error('你还未连接到任何一个peer');
            this.rl.prompt(true);
        }
    }

    async sendFileInfo(filepath: string) {
        if (!isAbsolute(filepath)) {
            filepath = resolve(process.cwd(), filepath);
        }
        this.rl.pause();
        if (existsSync(filepath)) {
            const stat = statSync(filepath);
            if (stat.isDirectory()) {
                out.info(`路径 ${filepath} 存在但为目录`);
            } else {
                out.info(`路径 ${filepath} 存在且为文件`);
                const data: PeerData<FileInfo> = {
                    type: 'fileinfo',
                    data: this.generateFileInfo(filepath)
                }
                this.peer.send(JSON.stringify(data));
            }
        } else {
            out.info(`路径 ${filepath} 不存在`)
        }
        // out.log(process.cwd());
        // if (this.peer) {

        // }
        this.rl.prompt(true);
    }

    generateFileInfo(filepath: string): FileInfo {
        const stats = statSync(filepath);
        const filename = basename(filepath);
        return {
            name: filename,
            size: stats.size,
            hash: '',
            piece: []
        };
    }


}

Client.run();