/* No networking. Same patch data as patch.py. */
(function (root) {
'use strict';
const hex = s => Uint8Array.from(s.match(/../g) || [], x => parseInt(x, 16));
async function sha(bytes) {
 const h = await root.crypto.subtle.digest('SHA-256', bytes);
 return Array.from(new Uint8Array(h), x => x.toString(16).padStart(2,'0')).join('');
}
function crc32(bytes, initial = 0) {
 let crc = (initial ^ 0xffffffff) >>> 0;
 for (const b of bytes) { crc ^= b; for (let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
 return (crc ^ 0xffffffff) >>> 0;
}
function checkSfl(raw) {
 const header = new TextDecoder().decode(raw.subarray(0,576));
 const m = header.match(/\r\n(MC|PC) +([0-9]+) +([0-9A-F]{8})/);
 if (!header.startsWith('********') || !m || Number(m[2])!==raw.length) throw Error('Nieprawidłowy nagłówek SFL');
 const crc=crc32(new Uint8Array([0x8f,0x93,0xc6,0x35]),crc32(raw.subarray(576)));
 if (crc!==parseInt(m[3],16)) throw Error('Nieprawidłowy CRC SFL');
}
function applyRuns(buf,runs) {
 let end=0;
 for(const [pos,oldHex,newHex] of runs) {
  const old=hex(oldHex),replacement=hex(newHex);
  if(pos<end || old.length!==replacement.length || pos+old.length>buf.length) throw Error('Nieprawidłowy patch');
  for(let i=0;i<old.length;i++) if(buf[pos+i]!==old[i]) throw Error('Niezgodne bajty źródłowe');
  buf.set(replacement,pos);end=pos+old.length;
 }
}
async function patch(raw,data=root.FTX1_PATCH,onOutputHash) {
 if(!root.crypto || !root.crypto.subtle) throw Error('Brak Web Crypto. Użyj aktualnej przeglądarki i HTTPS lub localhost.');
 const digest=await sha(raw),c=data.components.find(c=>c.input_sha256===digest);
 if(!c) throw Error('Nieznany SHA-256 wejścia. Wybierz oryginalny plik FTX-1 w obsługiwanej wersji.');
 if(raw.length!==c.size) throw Error('Nieprawidłowy rozmiar');
 checkSfl(raw);
 const key=hex(data.key_hex),decoded=raw.slice(576);
 for(let i=0;i<decoded.length;i++) decoded[i]=(decoded[i]-key[i%key.length])&255;
 if(await sha(decoded)!==c.decoded_input_sha256) throw Error('Błędny hash rozpakowanego wejścia');
 applyRuns(decoded,c.payload_patches);
 if(await sha(decoded)!==c.decoded_output_sha256) throw Error('Błędny hash rozpakowanego wyniku');
 const result=raw.slice();applyRuns(result.subarray(0,576),c.header_patches);
 for(let i=0;i<decoded.length;i++) result[576+i]=(decoded[i]+key[i%key.length])&255;
 checkSfl(result);
 const outputHash=await sha(result);
 if(onOutputHash) onOutputHash(outputHash);
 if(outputHash!==c.output_sha256) throw Error('Błędny SHA-256 wyniku; pobranie zablokowane');
 return {component:c,bytes:result};
}
root.FTX1_CORE={patch,sha,checkSfl};
})(globalThis);
