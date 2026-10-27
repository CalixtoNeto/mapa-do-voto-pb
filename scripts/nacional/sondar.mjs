// Sondagem temporária da API de resultados do TSE: status e campos de cada endereço, para descobrir o formato do 2º turno e dos totais.
import { API, pad } from '../lib/tse.mjs';

async function ver(rotulo, url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'mapa-do-voto/1.0 (sondagem)', Accept: 'application/json' } });
    const texto = r.ok ? await r.text() : '';
    let campos = '';
    if (texto) { const j = JSON.parse(texto); campos = ` raiz: ${Object.keys(j).join(',')} | carg[0]: ${Object.keys(j.carg?.[0] || {}).join(',')} | abr[0]: ${Object.keys(j.abr?.[0] || {}).join(',')}`; }
    console.log(`${r.status} ${rotulo} ${url}${campos}`);
  } catch (e) { console.log(`ERRO ${rotulo} ${url} ${e.message}`); }
}

export async function sondar(ano) {
  const config = await (await fetch(`${API}/comum/config/ele-c.json`)).json();
  const e = (config.pl || []).filter(p => p.c === `ele${ano}`).flatMap(p => p.e).find(x => x.tp === '1');
  console.log('eleição:', JSON.stringify({ ...e, abr: undefined }), 'abr[0]:', JSON.stringify(e?.abr?.[0] || {}).slice(0, 400));
  for (const [t, cd] of [['t1', e.cd], ['t2', e.cdt2]]) {
    const c = pad(cd, 6), base = `${API}/ele${ano}/${cd}`;
    await ver(`${t} nacional simplificado`, `${base}/dados-simplificados/br/br-c0001-e${c}-r.json`);
    await ver(`${t} nacional completo`, `${base}/dados/br/br-c0001-e${c}-u.json`);
    await ver(`${t} estado PB presidente`, `${base}/dados/pb/pb-c0001-e${c}-u.json`);
    await ver(`${t} João Pessoa presidente`, `${base}/dados/pb/pb20516-c0001-e${c}-u.json`);
    await ver(`${t} Acrelândia presidente`, `${base}/dados/ac/ac01120-c0001-e${c}-u.json`);
    await ver(`${t} João Pessoa governador`, `${base}/dados/pb/pb20516-c0003-e${c}-u.json`);
  }
}
