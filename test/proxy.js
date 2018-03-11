const createServer = require('http').createServer;
const connect = require('net').connect;
const parse = require('url').parse;

let currentInMax = 0;
let currentOutMax = 0;

function checkIfInLarger(length) {
    if (length > currentInMax) {
        currentInMax = length;
        console.log(`Current In Max Length ${currentInMax}`);
    }
}

function checkIfOutLarger(length) {
    if (length > currentOutMax) {
        currentOutMax = length;
        console.log(`Current Out Max Length ${currentOutMax}`);
    }
}

function tunnel(cReq, cSock) {
    console.log('cSock Open');
    var u = parse('http://' + cReq.url);
    cSock
        .on('error', () => {
            console.log('cSock Error');
        })
        .on('close', () => {
            console.log('pSock Close');
        });

    var pSock = connect(Number(u.port), u.hostname, function () {
        console.log('pSock Open');
        cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        cSock.on('data', (chunk) => {
            // console.log(`>>> ${chunk.length}Byte`);
            // checkIfOutLarger(chunk.length);
            pSock.write(chunk);
        });
        // pSock.pipe(cSock);
    }).on('error', function (e) {
        console.log('pSock Error');
        // console.log(e);
        cSock.end();
    }).on('data', (chunk) => {
        // console.log(`<<< ${chunk.length}Byte`);
        // checkIfInLarger(chunk.length);
        cSock.write(chunk);
    }).on('close', () => {
        console.log('pSock Close');
        cSock.destroy();
    }); 

    // cSock.pipe(pSock);
}

createServer()
    // .on('request', request)
    .on('connect', tunnel)
    .listen(6000, '0.0.0.0', () => {
        console.log('Listening...');
    });