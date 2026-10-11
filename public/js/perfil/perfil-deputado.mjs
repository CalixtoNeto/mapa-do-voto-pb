// Perfil de um deputado estadual (SAPL da ALPB): mandato, presença, votos nominais, com quem vota junto, matérias, partido
// e doadores e fornecedores da campanha que também receberam do estado.
import { pct, nf } from '../formato.mjs';
import { Bloco } from '../estrutura.mjs';
import { Cartao } from '../cartao.mjs';
import { taxa, ligacoesDoCandidato } from './calculos-perfil.mjs';
import { CabecalhoDoPerfil } from './cabecalho-perfil.mjs';
import { Voltar, Ligacoes, ano, nomeProprio } from './pecas.mjs';
import { Materias, Votacoes, Partidos } from './deputado-secoes.mjs';
import { PAGADOR_ESTADO } from './estado-governo.mjs';
const { html } = window.htmPreact;

const indicadores = (v, a) => [
  { rotulo: 'Presença nas sessões', valor: taxa(v.presenca) == null ? null : pct(taxa(v.presenca), 0), nota: `${v.presenca[0]} de ${v.presenca[1]} sessões` },
  { rotulo: 'Matérias apresentadas', valor: nf.format(v.materias.total) },
  { rotulo: `Votos em ${a.eleicao}`, valor: v.eleicao == null ? null : nf.format(v.eleicao) }];

export function PerfilDeputado({ v, assembleia, anos, aoVerNoMapa }) {
  const nomes = new Map(assembleia.vereadores.map(x => [x.id, x.nome]));
  const mandato = `Deputado(a) estadual · ${v.partido || 'sem partido'} · ${ano(v.inicio)}–${ano(v.fim)}${v.titular ? '' : ' · suplente'}`;
  return html`<article class="perfil">
    <${Voltar} para="#perfil/assembleia" texto="Assembleia Legislativa" />
    <${CabecalhoDoPerfil} foto=${v.foto} rotulo=${`Perfil do estado · ${mandato}`} titulo=${v.nome} indicadores=${indicadores(v, assembleia)}
      lede=${[nomeProprio(v.completo), !v.emExercicio && `Fora do mandato desde ${v.fim.split('-').reverse().join('/')}`].filter(Boolean).join(' · ')}>
      ${v.chaveNoMapa && html`<button type="button" class="link" onClick=${() => aoVerNoMapa(v.chaveNoMapa)}>Ver os votos de ${assembleia.eleicao} no mapa</button>`}<//>
    <${Bloco} id="dv" titulo="Votos nominais" colunas="metade" lede="O que o deputado votou nas votações nominais e com quem mais vota junto.">
      <${Cartao} tipo="Barra empilhada · votos" titulo="Sim, não e abstenção"><${Votacoes} v=${v} nomes=${nomes} /><//>
      <${Cartao} tipo="Lista · matérias" titulo="Matérias de autoria"><${Materias} m=${v.materias} /><//><//>
    <${Bloco} id="dp" titulo="Filiação" colunas="metade" lede="O partido atual e os que o deputado já teve, segundo o SAPL."><${Cartao} tipo="Filiação" titulo="Partido"><${Partidos} v=${v} /><//><//>
    ${v.chave && html`<${Bloco} id="dc" titulo="Campanha e pagamentos do estado">
      <${Cartao} classe="largo" tipo="Lista · campanha" titulo="Doadores e fornecedores da campanha" sub="Que também receberam do estado">
        <${Ligacoes} ligacoes=${ligacoesDoCandidato(anos, v.chave, assembleia.eleicao)} pagador=${PAGADOR_ESTADO} /><//><//>`}
    <p class="fonte">Fontes: SAPL da Assembleia Legislativa da Paraíba (legislatura ${assembleia.legislatura.numero}, desde ${ano(assembleia.legislatura.inicio)}), API de dados abertos do Governo da Paraíba e TSE. A ligação com a candidatura é pelo nome completo; pode haver homônimos.</p>
  </article>`;
}
