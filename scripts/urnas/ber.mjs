// Leitor BER/DER mínimo para os arquivos de urna do TSE: devolve a árvore de nós { classe, tag, construido, filhos | bytes }.
// classe: 0 universal, 1 aplicação, 2 contexto, 3 privada.
function cabecalho(buf, i, fim) {
  if (i >= fim) return null;
  const classe = buf[i] >> 6, construido = !!(buf[i] & 0x20); let tag = buf[i] & 0x1f; i++;
  if (tag === 0x1f) { tag = 0; do { if (i >= fim) return null; tag = (tag << 7) | (buf[i] & 0x7f); } while (buf[i++] & 0x80); }
  if (i >= fim) return null;
  let tam = buf[i++];
  if (tam & 0x80) { const n = tam & 0x7f; if (!n || n > 4 || i + n > fim) return null; tam = 0; for (let k = 0; k < n; k++) tam = tam * 256 + buf[i++]; }
  return i + tam > fim ? null : { classe, construido, tag, corpo: i, fim: i + tam };
}

// Lê todos os nós irmãos entre ini e fim; devolve null se os bytes não forem BER bem formado (serve para testar OCTET STRING aninhado).
export function lerBer(buf, ini = 0, fim = buf.length) {
  const nos = [];
  for (let i = ini; i < fim;) {
    const h = cabecalho(buf, i, fim);
    if (!h) return null;
    const filhos = h.construido ? lerBer(buf, h.corpo, h.fim) : null;
    if (h.construido && !filhos) return null;
    nos.push({ classe: h.classe, tag: h.tag, construido: h.construido, ...(h.construido ? { filhos } : { bytes: buf.subarray(h.corpo, h.fim) }) });
    i = h.fim;
  }
  return nos;
}

export const inteiro = no => no?.bytes ? no.bytes.reduce((s, b) => s * 256 + b, 0) : null;
export const texto = no => no?.bytes ? no.bytes.toString('latin1') : null;
export const ehNo = (no, classe, tag) => no?.classe === classe && no.tag === tag;

// Procura em profundidade os nós que satisfazem o teste.
export function procurar(no, teste, achados = []) {
  if (teste(no)) achados.push(no);
  for (const filho of no.filhos || []) procurar(filho, teste, achados);
  return achados;
}
