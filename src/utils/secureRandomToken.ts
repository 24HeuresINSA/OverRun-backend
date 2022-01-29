import crypto from 'crypto';


export const secureRandomToken = (length: number) => {
    return crypto.randomBytes(length, (err, buffer) => {
        return buffer.toString('hex');
    });
};