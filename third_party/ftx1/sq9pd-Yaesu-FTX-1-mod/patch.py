#!/usr/bin/env python3
"""Verified FTX-1 SFL unpack -> patch -> repack. Python 3.9+, standard library."""
import argparse,hashlib,json,re,struct,zlib
from pathlib import Path
DATA=Path(__file__).resolve().parent/'site/patch-data.js'
def load_data():return json.loads(DATA.read_text(encoding='utf-8').split(' = ',1)[1].strip().removesuffix(';'))
def sha(b):return hashlib.sha256(b).hexdigest()
def check_sfl(raw):
 if len(raw)<576 or raw[:8]!=b'********':raise ValueError('Nieprawidłowy nagłówek SFL')
 m=re.search(rb'\r\n(MC|PC) +([0-9]+) +([0-9A-F]{8})',raw[:576])
 if not m or int(m[2])!=len(raw):raise ValueError('Nieprawidłowy rozmiar/tag SFL')
 crc=zlib.crc32(struct.pack('<I',0x35C6938F),zlib.crc32(raw[576:]))&0xffffffff
 if crc!=int(m[3],16):raise ValueError('Nieprawidłowy CRC SFL')
def apply_runs(buf,runs):
 end=0
 for pos,old,new in runs:
  old,new=bytes.fromhex(old),bytes.fromhex(new)
  if pos<end or len(old)!=len(new) or pos+len(old)>len(buf) or buf[pos:pos+len(old)]!=old:raise ValueError('Nieprawidłowy patch / bajty źródłowe')
  buf[pos:pos+len(old)]=new;end=pos+len(old)
 return buf
def patch(raw,data=None):
 data=data or load_data()
 c=next((c for c in data['components'] if c['input_sha256']==sha(raw)),None)
 if c is None:raise ValueError('Nieznany SHA-256 wejścia. Wymagany dokładny oryginalny firmware FTX-1; plik zmodyfikowany też jest odrzucany.')
 if len(raw)!=c['size']:raise ValueError('Błędny rozmiar')
 check_sfl(raw);key=bytes.fromhex(data['key_hex'])
 decoded=bytearray((v-key[i%len(key)])&255 for i,v in enumerate(raw[576:]))
 if sha(decoded)!=c['decoded_input_sha256']:raise ValueError('Błędny hash rozpakowanego wejścia')
 decoded=apply_runs(decoded,c['payload_patches'])
 if sha(decoded)!=c['decoded_output_sha256']:raise ValueError('Błędny hash rozpakowanego wyniku')
 header=apply_runs(bytearray(raw[:576]),c['header_patches'])
 result=bytes(header)+bytes((v+key[i%len(key)])&255 for i,v in enumerate(decoded))
 check_sfl(result)
 if sha(result)!=c['output_sha256']:raise ValueError('Błędny SHA-256 wyniku; plik nie zostanie zapisany')
 return c,result

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('files',nargs='+',type=Path,help='Oryginalny DISPLAY i/lub MAIN SFL')
 p.add_argument('-o','--out',required=True,type=Path,help='Nowy katalog wynikowy (nie może istnieć)')
 a=p.parse_args()
 # Verify the entire selection before creating any output.
 results=[patch(f.read_bytes()) for f in a.files]
 if len({c['component'] for c,_ in results})!=len(results):p.error('Powtórzony komponent')
 a.out.mkdir(parents=True,exist_ok=False)
 for c,b in results:
  with (a.out/c['filename']).open('xb') as f:f.write(b)
 report=[{k:c[k] for k in ['component','version','filename','input_sha256','output_sha256']} for c,_ in results]
 (a.out/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2))
if __name__=='__main__':
 try:main()
 except (ValueError,OSError) as e:raise SystemExit('BŁĄD: '+str(e))
