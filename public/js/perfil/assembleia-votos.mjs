// Assembleia: como cada deputado votou nas votações nominais (barras empilhadas e rosca) e quem vota com a maioria.
import { nf, pct } from '../formato.mjs';
import { Bloco } from '../estrutura.mjs';
import { Cartao } from '../cartao.mjs';
import { Pilhas100 } from '../colunas-pilhas.mjs';
import { Rosca } from '../graficos.mjs';
import { Dispersao } from '../dispersao.mjs';
import { Ranking } from '../ranking.mjs';
import { Legenda } from '../legenda.mjs';
import { slug } from './calculos-perfil.mjs';
import { votosPorVereador, totalDeVotos, alinhamentos, presencaXAlinhamento } from './calculos-camara.mjs';
const { html } = window.htmPreact;

const TIPOS = [['sim', 'Sim', 'var(--s1)'], ['nao', 'Não', 'var(--s2)'], ['abstencao', 'Abstenção', 'var(--s3)'], ['outros', 'Outros', 'var(--s4)'], ['semVoto', 'Sem voto registrado', 'var(--trilho)']];
const pct0 = v => pct(v, 0);

function VotosPorDeputado({ linhas, total }) {
  const itens = linhas.map(l => ({ nome: l.nome, rotulo: `${l.sim} · ${l.nao} · ${l.abstencao}`,
    partes: TIPOS.map(([k, nome, cor]) => ({ nome, v: l[k], cor, texto: String(l[k]) })) }));
  const legenda = TIPOS.filter(([k]) => k !== 'outros' || linhas.some(l => l.outros));
  return html`<${Cartao} tipo="Barras empilhadas · votos por deputado" titulo="Sim, não e abstenção" sub=${html`<${Legenda} itens=${legenda.map(([, nome, cor]) => [nome, cor])} />`}
    nota=${`Cada barra tem as ${nf.format(total)} votações nominais; a parte clara é onde não houve voto registrado, por ausência ou por ainda não ter mandato. À direita: sim · não · abstenção.`}>
    <${Pilhas100} linhas=${itens} descricao="Votos de cada deputado nas votações nominais" /><//>`;
}

function TotalDeVotos({ t }) {
  const partes = TIPOS.slice(0, 4).filter(([k]) => t[k] > 0).map(([k, nome, cor]) => ({ nome, v: t[k], cor, rotulo: `${nf.format(t[k])} · ${pct(t[k] / t.total, 1)}` }));
  return html`<${Cartao} tipo="Rosca · total de votos" titulo="Soma de todos os votos" nota="Votos de todos os deputados somados, sem contar quem não votou.">
    <${Rosca} partes=${partes} centro=${{ rotulo: 'Votos', valor: nf.format(t.total) }} descricao=${'Total de votos: ' + partes.map(p => `${p.nome} ${p.rotulo}`).join('; ')} /><//>`;
}

export function ComoVotam({ deputados, votacoes }) {
  const linhas = votosPorVereador(deputados, votacoes);
  return html`<${Bloco} id="cv" titulo="Como votam" colunas="dois-tercos"
    lede=${`Barras empilhadas mostram o que cada deputado fez nas ${nf.format(votacoes)} votações nominais. A parte clara é onde não houve voto registrado.`}>
    <${VotosPorDeputado} linhas=${linhas} total=${votacoes} /><${TotalDeVotos} t=${totalDeVotos(linhas)} /><//>`;
}

function Alinhamento({ deputados }) {
  const lista = alinhamentos(deputados);
  return html`<${Cartao} tipo="Barra horizontal · ranking" titulo="Alinhamento com a maioria" sub="Não diz quem está certo: só quem votou junto com a maioria da Assembleia."
    nota="A barra mede votações em que votou como a maioria sobre as votações em que a maioria se formou e ele votou.">
    <${Ranking} descricao="Alinhamento de cada deputado com a maioria" itens=${lista.map(l => ({ n: html`<a href=${'#perfil/' + slug(l.nome)}>${l.nome}</a>`, v: l.fracao, rotulo: pct0(l.fracao), lado: `${l.com} de ${l.de}` }))} /><//>`;
}

function PresencaEAlinhamento({ deputados }) {
  const pontos = presencaXAlinhamento(deputados);
  if (pontos.length < 2) return null;
  return html`<${Cartao} tipo="Dispersão · presença × alinhamento" titulo="Presença e alinhamento juntos"
    nota="Cada ponto é um deputado: quanto mais à direita, mais presença; quanto mais alto, mais votos com a maioria. Passe o cursor para ver o nome.">
    <${Dispersao} pontos=${pontos} descricao="Presença nas sessões e alinhamento com a maioria, um ponto por deputado"
      eixos=${{ x: { titulo: 'Presença nas sessões', formato: pct0 }, y: { titulo: 'Alinhamento com a maioria', formato: pct0 } }} /><//>`;
}

export function QuemVotaComAMaioria({ deputados }) {
  return html`<${Bloco} id="cm" titulo="Quem vota com a maioria" colunas="dois-tercos"
    lede="A conta é: votações em que o deputado votou como a maioria, sobre as votações em que a maioria se formou e ele votou.">
    <${Alinhamento} deputados=${deputados} /><${PresencaEAlinhamento} deputados=${deputados} /><//>`;
}
