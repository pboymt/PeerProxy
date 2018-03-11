import * as koa from "koa";
import * as SocketIO from "socket.io";

// const app = new koa();

// app.use(async (ctx, next) => {
//     await next();
// });

// app.listen(4000);

interface Room {
    listener: SocketIO.Socket;
    connecter: SocketIO.Socket;
}

const waitRoom: { [roomID: string]: Room } = {};

const io = SocketIO();

io.on('connection', socket => {
    console.log('connected');
    socket.send('Login Success!');
    socket.on('message', (msg: string) => {
        socket.send(msg);
    });
    socket.on('list', () => {
        console.log('request list');
        io.clients((error: Error, clients: string) => {
            if (error) throw error;
            socket.emit('list', clients); // => [6em3d4TJP8Et9EMNAAAA, G5p55dHhGgUnLUctAAAB]
        });
    });
    socket.on('offer', (otherID: string) => {
        const other = io.sockets.connected[otherID];
        if (other) {
            socket.send(`You are calling ${otherID}`);
            other.emit('offer', socket.id);
        } else {
            socket.send(`${otherID} is Offline`);
        }
    });
    socket.on('proxy', (otherID: string) => {
        const other = io.sockets.connected[otherID];
        if (other) {
            socket.send(`You are calling a proxy from ${otherID}`);
            other.emit('proxy', socket.id);
        } else {
            socket.send(`${otherID} is Offline`);
        }
    });
    socket.on('answer', (otherID: string) => {
        const other = io.sockets.connected[otherID];
        if (other) {
            socket.send(`You are answering ${otherID}`);
            other.emit('answer', socket.id);
        } else {
            socket.send(`${otherID} is Offline`);
        }
    });
    socket.on('signal', (otherID: string, signal: any) => {
        const other = io.sockets.connected[otherID];
        if (other) {
            socket.send(`You are signaling ${otherID}`);
            other.emit('signal', socket.id, signal);
        } else {
            socket.send(`${otherID} is Offline`);
        }
    });
    // socket.on('wait-peer', (matchID: string) => {

    // });
    socket.on('disconnect', () => {
        console.log('disconnected');
    });
});


io.listen(Number(process.argv[2]) || 4000);