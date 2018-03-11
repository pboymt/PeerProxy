const crypto = require('crypto');

function encrypt(data, key) {
    if (!data.length)
        return '';
    const iv = "";
    const clearEncoding = 'utf8';
    const cipherEncoding = 'hex';
    const cipherChunks = [];
    const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from(key), iv);
    cipher.setAutoPadding(true);
    cipherChunks.push(cipher.update(Buffer.from(data), clearEncoding, cipherEncoding));
    cipherChunks.push(cipher.final(cipherEncoding));
    return cipherChunks.join('');
}

console.log(encrypt('32323','321'));