// Cálculos do perfil do Governo e das emendas estaduais (sem DOM): credores privados, emendas por secretaria e por ano.

// Quem recebe do estado e é do próprio poder público (secretarias, previdência, tribunais, prefeituras…) não é fornecedor.
const ORGAO_PUBLICO = /^(secretaria|sec\.? de est|policia|corpo de bombeiros|tribunal|assembleia|ministerio|defensoria|universidade|prefeitura|municipio|governo|pbprev|paraiba previdencia|inss|fundo |fundacao|empresa par\. de pesq|departamento|instituto)/i;
const semAcento = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const ehOrgaoPublico = nome => ORGAO_PUBLICO.test(semAcento(nome));

// credores: [nome, documento, pago, vezes]; devolve os `quantos` maiores que não são órgãos públicos e quantos ficaram de fora.
export function credoresPrivados(credores, quantos = 10) {
  const privados = credores.filter(c => !ehOrgaoPublico(c[0])).sort((a, b) => b[2] - a[2]);
  return { lista: privados.slice(0, quantos).map(([n, , v, vezes]) => ({ n, v, vezes })), fora: credores.length - privados.length };
}

// arvore: { filhos: [[deputado, valor, [[secretaria, valor, …]]]] } → [{ n, v }] por secretaria, do maior ao menor.
export function emendasPorSecretaria(arvore) {
  const somas = new Map();
  for (const [, , secretarias] of arvore?.filhos || []) for (const [nome, v] of secretarias || []) somas.set(nome, (somas.get(nome) || 0) + v);
  return [...somas].map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v);
}

// a.emendas.porDeputado: [[autor, valor, emendas]]
export function resumoDasEmendas(a) {
  const e = a?.emendas;
  if (!e?.total || !e.porDeputado?.length) return null;
  const [nome, valor] = [...e.porDeputado].sort((x, y) => y[1] - x[1])[0];
  return { total: e.total, emendas: e.porDeputado.reduce((s, d) => s + d[2], 0), autores: e.porDeputado.length, maior: { nome, valor, fracao: valor / e.total } };
}

export const serieDeEmendas = anos => anos.filter(a => a.emendas?.total > 0).map(a => ({ ano: a.ano, total: a.emendas.total }))
  .sort((x, y) => x.ano.localeCompare(y.ano));

const chave = s => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// O Governo escreve o autor como o deputado é conhecido ("DRA. PAULA"); o SAPL traz o nome parlamentar e o completo.
export function deputadoDoAutor(autor, deputados) {
  const alvo = chave(autor);
  return (deputados || []).find(d => chave(d.nome) === alvo || chave(d.completo) === alvo) || null;
}
