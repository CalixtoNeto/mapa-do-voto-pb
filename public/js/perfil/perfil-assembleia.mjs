// A Assembleia Legislativa em números: presença, partidos, votos nominais e alinhamento com a maioria dos deputados em exercício.
import { nf, pct } from '../formato.mjs';
import { Aviso } from '../cartao.mjs';
import { CabecalhoDoPerfil } from './cabecalho-perfil.mjs';
import { presencaMedia } from './calculos-camara.mjs';
import { ano } from './pecas.mjs';
import { QuemAparece, OsDeputados } from './assembleia-presenca.mjs';
import { ComoVotam, QuemVotaComAMaioria } from './assembleia-votos.mjs';
const { html } = window.htmPreact;

const indicadores = (a, ativos) => [
  { rotulo: 'Deputados em exercício', valor: String(ativos), nota: `${a.legislatura.numero}ª legislatura` },
  { rotulo: 'Sessões', valor: nf.format(a.sessoes), nota: 'com presença ou voto registrado' },
  { rotulo: 'Votações nominais', valor: nf.format(a.votacoesNominais), nota: 'com voto de cada deputado' },
  { rotulo: 'Presença média', valor: presencaMedia(a.vereadores) == null ? null : pct(presencaMedia(a.vereadores), 0), nota: 'das sessões em que podiam estar' }];

export function PerfilAssembleia({ assembleia: a }) {
  if (!a) return html`<article class="perfil"><${CabecalhoDoPerfil} pagina="assembleia" rotulo="Perfil do estado · Assembleia" titulo="Assembleia Legislativa" /><${Aviso}>Os dados da Assembleia ainda não foram gerados.<//></article>`;
  const deputados = a.vereadores, ativos = deputados.filter(v => v.emExercicio).length;
  return html`<article class="perfil">
    <${CabecalhoDoPerfil} pagina="assembleia" rotulo=${`Perfil do estado · Legislatura ${a.legislatura.numero} · ${ano(a.legislatura.inicio)}–${ano(a.legislatura.fim)}`} titulo="Assembleia Legislativa da Paraíba"
      lede=${`Presença nas sessões e votos nominais dos ${ativos} deputados estaduais em exercício. Dados do SAPL da Assembleia.`} indicadores=${indicadores(a, ativos)} />
    <${QuemAparece} deputados=${deputados} /><${OsDeputados} deputados=${deputados} />
    <${ComoVotam} deputados=${deputados} votacoes=${a.votacoesNominais} /><${QuemVotaComAMaioria} deputados=${deputados} />
    <p class="fonte">Fonte: SAPL da Assembleia Legislativa da Paraíba (sessões, presença e votos nominais da legislatura ${a.legislatura.numero}). Votações simbólicas só registram o resultado, não o voto de cada deputado. O registro de presença do SAPL tem falhas; licenças e missões oficiais podem aparecer como ausência. Os pontos da dispersão têm o nome do deputado ao passar o cursor.</p>
  </article>`;
}
