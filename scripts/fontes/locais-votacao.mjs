// Tabela "Eleitorado por local de votação": diz em qual escola funciona cada seção.
// Em 2026 o CSV por seção veio com o nome do local como "#NULO#"; o nome certo está aqui.
import { CDN, baixar, lerCsvsDoZip } from '../lib/tse.mjs';
import { porRegistro } from '../lib/csv.mjs';
import { UF, PASTA_DOWNLOADS } from '../eleicao/config.mjs';

export const nomeAusente = nome => !nome || /^#.*#$/.test(nome.trim());

export const chaveDaSecao = (municipio, zona, secao) => `${municipio}|${zona}|${secao}`;

export async function nomesDosLocais(ano) {
  const zip = `${PASTA_DOWNLOADS}/local-votacao-${ano}.zip`;
  if (!await baixar(`${CDN}/eleitorado_locais_votacao/eleitorado_local_votacao_${ano}.zip`, zip)) return null;
  const nomes = new Map();
  await lerCsvsDoZip(zip, [{ padrao: /\.csv$/i, aoLinha: leitorDeNomesDosLocais(nomes) }]);
  return nomes;
}

export function leitorDeNomesDosLocais(nomes) {
  return porRegistro({
    descartarRapido: linha => !linha.includes(`"${UF}"`),
    aoRegistro: (campos, colunas) => {
      if (campos[colunas.SG_UF] !== UF) return;
      const chave = chaveDaSecao(campos[colunas.CD_MUNICIPIO], campos[colunas.NR_ZONA], campos[colunas.NR_SECAO]);
      const nome = campos[colunas.NM_LOCAL_VOTACAO];
      if (!nomes.has(chave) && !nomeAusente(nome)) nomes.set(chave, nome.trim());
    },
  });
}

// Devolve quantos dos locais pendentes ganharam nome.
export function preencherNomes(pendentes, nomes) {
  let preenchidos = 0;
  for (const { local, chave } of pendentes) {
    const nome = nomes?.get(chave);
    if (nome) { local.n = nome; preenchidos++; }
  }
  return preenchidos;
}
