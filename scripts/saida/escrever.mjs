// Um arquivo por turno (ANO-tTURNO.json) e, quando há detalhe por escola, o ANO-tTURNO-locais.json.
import { writeFile, mkdir } from 'node:fs/promises';
import { UF } from '../eleicao/config.mjs';
import { podarLocais } from './podar-locais.mjs';
import { indexar } from './indice.mjs';

export async function escreverEleicao(pasta, ano, porTurno, locaisPorTurno) {
  await mkdir(pasta, { recursive: true });
  for (const [turno, apuracao] of Object.entries(porTurno)) {
    const nome = `${pasta}/${ano}-t${turno}`, resumo = resumoDoTurno(ano, turno, apuracao, new Date());
    await writeFile(`${nome}.json`, JSON.stringify(resumo));
    const locais = locaisPorTurno?.[turno];
    if (locais) { podarLocais(locais, apuracao); await writeFile(`${nome}-locais.json`, JSON.stringify(locais)); }
    const detalhe = locais ? ' + locais de votação' : '';
    console.log(`  → ${nome}.json (${resumo.cands.length} candidatos, fonte ${apuracao.fonte})${detalhe}`);
  }
  await indexar(pasta);
}

export function resumoDoTurno(ano, turno, apuracao, agora) {
  const cands = [...apuracao.cands.values()].sort((a, b) => a.cargo.localeCompare(b.cargo) || b.total - a.total);
  const cargos = [...new Map(cands.map(c => [c.cargo, c.cargoNome])).entries()].map(([cd, nome]) => ({ cd, nome }));
  const { fonte, final, tot } = apuracao, atualizadoEm = apuracao.atualizadoEm || agora.toISOString();
  return { ano, turno, uf: UF, fonte, final, atualizadoEm, cargos, cands, tot };
}
