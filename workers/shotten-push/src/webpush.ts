function b64urlEncode(bytes: Uint8Array): string {
    let bin = '';
    for (const byte of bytes) bin += String.fromCharCode(byte);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(value: string): Uint8Array {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

async function hmacSha256(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, data);
    return new Uint8Array(sig);
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const prk = await hmacSha256(salt, ikm);
    const block = await hmacSha256(prk, concat(info, new Uint8Array([1])));
    return block.slice(0, length);
}

async function importPublicKey(uncompressed: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'raw',
        uncompressed,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        [],
    );
}

async function encryptPayload(
    userPublicRaw: Uint8Array,
    userAuth: Uint8Array,
    payload: Uint8Array,
): Promise<Uint8Array> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const userKey = await importPublicKey(userPublicRaw);
    const secret = new Uint8Array(
        await crypto.subtle.deriveBits({ name: 'ECDH', public: userKey }, local.privateKey, 256),
    );
    const localPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));

    const ikm = await hkdf(
        secret,
        userAuth,
        concat(new TextEncoder().encode('WebPush: info\0'), userPublicRaw, localPublic),
        32,
    );
    const cek = await hkdf(ikm, salt, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
    const nonce = await hkdf(ikm, salt, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

    const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
    const padded = concat(payload, new Uint8Array([2]));
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded),
    );

    const rs = new Uint8Array(4);
    new DataView(rs.buffer).setUint32(0, 4096);
    return concat(salt, rs, new Uint8Array([localPublic.length]), localPublic, ciphertext);
}

async function vapidHeader(
    audience: string,
    subject: string,
    publicRaw: Uint8Array,
    privateJwk: JsonWebKey,
): Promise<string> {
    const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: subject,
    })));
    const signingInput = `${header}.${payload}`;
    const key = await crypto.subtle.importKey(
        'jwk',
        privateJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign'],
    );
    const sig = new Uint8Array(
        await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput)),
    );
    const jwt = `${signingInput}.${b64urlEncode(sig)}`;
    return `vapid t=${jwt}, k=${b64urlEncode(publicRaw)}`;
}

export async function sendWebPush(options: {
    endpoint: string;
    p256dh: string;
    auth: string;
    payload: unknown;
    vapidPublicRaw: Uint8Array;
    vapidPrivateJwk: JsonWebKey;
    vapidSubject: string;
}): Promise<{ ok: boolean; status: number; text: string }> {
    const body = await encryptPayload(
        b64urlDecode(options.p256dh),
        b64urlDecode(options.auth),
        new TextEncoder().encode(JSON.stringify(options.payload)),
    );

    const audience = new URL(options.endpoint).origin;
    const authorization = await vapidHeader(
        audience,
        options.vapidSubject,
        options.vapidPublicRaw,
        options.vapidPrivateJwk,
    );

    const response = await fetch(options.endpoint, {
        method: 'POST',
        headers: {
            Authorization: authorization,
            TTL: '60',
            Urgency: 'high',
            'Content-Encoding': 'aes128gcm',
        },
        body,
    });

    return {
        ok: response.ok,
        status: response.status,
        text: await response.text(),
    };
}

export function parseVapidPrivateJwk(raw: string): JsonWebKey {
    return JSON.parse(raw) as JsonWebKey;
}

export function parseVapidPublicRaw(b64url: string): Uint8Array {
    return b64urlDecode(b64url);
}
