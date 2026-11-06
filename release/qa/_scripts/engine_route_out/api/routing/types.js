"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasMapboxCredentials = hasMapboxCredentials;
/** True when the token is present and plausibly shaped (pk.* / sk.*). */
function hasMapboxCredentials(token) {
    return typeof token === 'string' && /^(pk|sk)\./.test(token);
}
