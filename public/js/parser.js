// ---------- Leitura do arquivo oficial do TSE (votacao_candidato_munzona) ----------
const NORM = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();

function splitLine(s){
  const out=[]; const n=s.length; let i=0;
  while(i<=n){
    if(s.charCodeAt(i)===34){
      let j=i+1, val='';
      for(;;){
        const q=s.indexOf('"',j);
        if(q<0){ val+=s.slice(j); j=n; break; }
        val+=s.slice(j,q);
        if(s.charCodeAt(q+1)===34){ val+='"'; j=q+2; } else { j=q+1; break; }
      }
      out.push(val); i=j+1;
    } else {
      let q=s.indexOf(';',i); if(q<0) q=n;
      out.push(s.slice(i,q)); i=q+1;
    }
  }
  return out;
}

const REQ = ['ANO_ELEICAO','NR_TURNO','SG_UF','CD_MUNICIPIO','NM_MUNICIPIO','CD_CARGO','DS_CARGO','SQ_CANDIDATO','NR_CANDIDATO','NM_URNA_CANDIDATO','SG_PARTIDO'];

class Aggregator{
  constructor(uf, resolveMun){ this.uf=uf; this.resolve=resolveMun; this.header=null; this.cands=new Map(); this.tot={}; this.rows=0; this.unmatched=new Set(); this.err=null; }
  line(l){
    if(this.err) return;
    if(!l) return;
    if(l.charCodeAt(l.length-1)===13) l=l.slice(0,-1);
    if(!l) return;
    const c=splitLine(l);
    if(!this.header){
      const h=c.map(x=>x.trim().toUpperCase());
      const miss=REQ.filter(k=>h.indexOf(k)<0);
      const vk = h.indexOf('QT_VOTOS_NOMINAIS_VALIDOS')>=0 ? 'QT_VOTOS_NOMINAIS_VALIDOS' : (h.indexOf('QT_VOTOS_NOMINAIS')>=0 ? 'QT_VOTOS_NOMINAIS' : null);
      if(miss.length || !vk){ this.err='O arquivo não tem as colunas esperadas do TSE ('+(miss.concat(vk?[]:['QT_VOTOS_NOMINAIS']).slice(0,4).join(', '))+'). Use o arquivo “votação nominal por município e zona”.'; return; }
      const ix={}; h.forEach((k,i)=>ix[k]=i); ix.VOTOS=ix[vk]; this.ix=ix; this.header=h; return;
    }
    const ix=this.ix;
    if(c[ix.SG_UF]!==this.uf) return;
    this.rows++;
    const ibge=this.resolve(c[ix.CD_MUNICIPIO], c[ix.NM_MUNICIPIO]);
    if(!ibge){ this.unmatched.add(c[ix.NM_MUNICIPIO]); return; }
    const v=parseInt(c[ix.VOTOS],10)||0;
    const ano=c[ix.ANO_ELEICAO], turno=c[ix.NR_TURNO], cargo=c[ix.CD_CARGO];
    const key=ano+'|'+turno+'|'+cargo+'|'+c[ix.SQ_CANDIDATO];
    let k=this.cands.get(key);
    if(!k){
      k={key, ano, turno, cargo, cargoNome:c[ix.DS_CARGO], nr:c[ix.NR_CANDIDATO], urna:c[ix.NM_URNA_CANDIDATO],
         nome: ix.NM_CANDIDATO!=null ? c[ix.NM_CANDIDATO] : '', partido:c[ix.SG_PARTIDO],
         sit: ix.DS_SIT_TOT_TURNO!=null ? c[ix.DS_SIT_TOT_TURNO] : '', total:0, mun:{}};
      this.cands.set(key,k);
    }
    if(ix.DS_SIT_TOT_TURNO!=null && c[ix.DS_SIT_TOT_TURNO] && !/^#/.test(c[ix.DS_SIT_TOT_TURNO])) k.sit=c[ix.DS_SIT_TOT_TURNO];
    k.mun[ibge]=(k.mun[ibge]||0)+v; k.total+=v;
    const tk=ano+'|'+turno+'|'+cargo; const t=this.tot[tk]||(this.tot[tk]={});
    t[ibge]=(t[ibge]||0)+v;
  }
  result(fileName){
    return { fileName, uf:this.uf, rows:this.rows, unmatched:[...this.unmatched],
      cands:[...this.cands.values()], tot:this.tot, loadedAt:Date.now() };
  }
}

function makeLineFeeder(agg){
  const dec=new TextDecoder('windows-1252'); let buf='';
  return (chunk, final)=>{
    if(chunk && chunk.length) buf+=dec.decode(chunk,{stream:!final}); else if(final) buf+=dec.decode();
    let start=0, nl;
    while((nl=buf.indexOf('\n',start))>=0){ agg.line(buf.slice(start,nl)); start=nl+1; }
    buf=buf.slice(start);
    if(final && buf){ agg.line(buf); buf=''; }
  };
}

async function readStream(file, onChunk, onProgress){
  const reader=file.stream().getReader(); let read=0;
  for(;;){
    const {value, done}=await reader.read();
    if(done){ onChunk(null,true); break; }
    read+=value.length; onChunk(value,false); onProgress && onProgress(read/file.size);
    await new Promise(r=>setTimeout(r,0));
  }
}

async function parseTSE(file, uf, resolveMun, onProgress){
  const head=new Uint8Array(await file.slice(0,4).arrayBuffer());
  const isZip=head[0]===0x50 && head[1]===0x4B;
  if(!isZip){
    const agg=new Aggregator(uf,resolveMun); const feed=makeLineFeeder(agg);
    await readStream(file, feed, onProgress);
    if(agg.err) throw new Error(agg.err);
    return agg.result(file.name);
  }
  const pass = async (pattern, prog) => {
    const agg=new Aggregator(uf,resolveMun); let found=false, sawBrasil=false, ferr=null;
    const uz=new fflate.Unzip(); uz.register(fflate.UnzipInflate);
    uz.onfile=f=>{
      const base=f.name.split('/').pop();
      if(/_BRASIL\.csv$/i.test(base)) sawBrasil=true;
      if(!pattern.test(base)) return;
      found=true; const feed=makeLineFeeder(agg);
      f.ondata=(err,chunk,final)=>{ if(err){ ferr=err; return; } feed(chunk,final); };
      f.start();
    };
    await readStream(file,(chunk,final)=>{ uz.push(chunk||new Uint8Array(0),final); }, prog);
    if(ferr) throw new Error('Não foi possível descompactar o arquivo.');
    if(agg.err) throw new Error(agg.err);
    return {agg, found, sawBrasil};
  };
  const re=new RegExp('_'+uf+'\\.csv$','i');
  let r=await pass(re, p=>onProgress&&onProgress(p));
  if(!r.found && r.sawBrasil) r=await pass(/_BRASIL\.csv$/i, p=>onProgress&&onProgress(p));
  if(!r.found) throw new Error('O .zip não contém um CSV da '+uf+'. Confira se é o arquivo “votacao_candidato_munzona” do TSE.');
  return r.agg.result(file.name);
}
