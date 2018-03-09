/// <reference path="../wrtc.d.ts" />
import * as SocketIO from "socket.io-client";
import * as Peer from "simple-peer";
import * as wrtc from "wrtc";
import { createInterface } from "readline";
import out from "../all/output";
import { readFileSync } from "fs";
import { join } from "path";

class Client {

    io: SocketIOClient.Socket;
    peer: Peer.Instance;
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
                        if (this.peer) {
                            this.peer.send(answer.replace(m[0], '').trim());
                        } else {
                            this.rl.pause();
                            out.error('你还未连接到任何一个peer');
                            this.rl.prompt(true);
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
            this.peer.on('data', (msg: string) => {
                this.rl.pause();
                out.peer(msg);
                this.rl.prompt(true);
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


}

Client.run();