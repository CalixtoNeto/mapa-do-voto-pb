// O perfil do estado fica em public/data/perfis/: um estado-ANO.json e um estado-ANO-detalhe.json por ano,
// assembleia.json e o index.json que diz ao site o que existe.
import { writeFile, mkdir, readdir } from 'node:fs/promises';

export const PASTA_PERFIS = 'public/data/perfis';

export async function escreverPerfil(nome, dados) {
  await mkdir(PASTA_PERFIS, { recursive: true });
  await writeFile(`${PASTA_PERFIS}/${nome}.json`, JSON.stringify(dados));
  console.log(`  → ${PASTA_PERFIS}/${nome}.json`);
}

export async function indexarPerfis(atualizadoEm) {
  const arquivos = await readdir(PASTA_PERFIS).catch(() => []);
  const anos = arquivos.map(a => a.match(/^estado-(\d{4})\.json$/)?.[1]).filter(Boolean).sort().reverse();
  await escreverPerfil('index', { atualizadoEm, anos, assembleia: arquivos.includes('assembleia.json') });
}
