// Aba "Cenário nacional": o presidente em todo o país, com foco no que dá para conferir nos arquivos abertos do TSE.
import { nf, pct, nomeDeQuem } from '../formato.mjs';
import { Cabecalho, Indicadores, Abas, Bloco } from '../estrutura.mjs';
import { SeletorDeAno } from '../perfil/cabecalho-perfil.mjs';
import { usarIndiceNacional, usarNacional } from './dados-nacional.mjs';
import { linhasDoTurno, totaisDasLinhas, totaisPorUf } from './calculos-nacional.mjs';
import { municipiosDistantes } from './calculos-distantes.mjs';
import { MapaDoBrasil, SeletorDeUf } from './mapa-do-brasil.mjs';
import { nomeDaUf } from './ufs.mjs';
import { ResumoDoRecorte } from './resumo-nacional.mjs';
import { ConferenciasNacionais } from './conferencias-nacional.mjs';
import { DistantesNacionais } from './distantes-nacional.mjs';
import { CrescimentoDeVotos } from './crescimento-nacional.mjs';
import { crescimentoDeVotos } from './calculos-crescimento.mjs';
import { usarUrnas } from './dados-urnas.mjs';
import { UrnasNacionais } from './urnas-nacional.mjs';
const { html, useState, useMemo } = window.htmPreact;

function indicadores(t, cands) {
  const v = t.validos || 1, lider = cands[t.margem >= 0 ? 0 : 1];
  return [{ rotulo: `Vantagem de ${nomeDeQuem(lider.urna).split(' ')[0]}`, valor: nf.format(Math.abs(t.margem)), nota: `${pct(Math.abs(t.margem) / v, 1)} dos válidos` },
    ...cands.slice(0, 2).map((c, i) => ({ rotulo: nomeDeQuem(c.urna), valor: pct(t.votos[i] / v, 1), nota: `${nf.format(t.votos[i])} votos` })),
    { rotulo: 'Abstenção', valor: pct(t.abstencao / (t.aptos || 1), 1), nota: `${nf.format(t.abstencao)} eleitores` },
    { rotulo: 'Brancos e nulos', valor: pct((t.brancos + t.nulos) / (t.comp || 1), 1), nota: 'do comparecimento' }];
}

function Conteudo({ nac, turno, uf, setUf, urnas }) {
  const [candidato, setCandidato] = useState(0);
  const dados = useMemo(() => {
    const linhas = linhasDoTurno(nac, turno), anterior = turno === '1' ? null : linhasDoTurno(nac, '1');
    return { linhas, totais: totaisDasLinhas(linhas), ufs: totaisPorUf(linhas), anterior, distantes: anterior && nac.turnos['1'] ? municipiosDistantes(nac, { primeiro: turno, anterior: '1' }) : null };
  }, [nac, turno]);
  const cands = nac.turnos[turno].cands, daUf = uf && dados.ufs.find(u => u.uf === uf);
  const antesDaUf = uf && dados.anterior ? totaisDasLinhas(dados.anterior.filter(l => l.uf === uf)) : null;
  return html`<${Indicadores} itens=${indicadores(dados.totais, cands)} />
    <${Bloco} id="nc-ufs" titulo="Como cada estado votou" colunas="metade"
        lede="A cor de cada estado vai do roxo ao amarelo conforme a parcela do candidato escolhido nos votos válidos: é uma escala neutra, sem cor de partido. Toque num estado para ver os números dele.">
      <div class="cartao">
        <${Abas} itens=${cands.slice(0, 4).map((c, i) => [String(i), nomeDeQuem(c.urna)])} valor=${String(candidato)} aoMudar=${i => setCandidato(+i)} rotulo="Candidato que dá a cor" estilo="pilula" />
        <${MapaDoBrasil} ufs=${dados.ufs} valorDe=${u => u.votos[candidato] / (u.validos || 1)} uf=${uf} aoEscolher=${setUf} rotulo=${`Parcela de ${nomeDeQuem(cands[candidato].urna)} nos votos válidos`} />
        <${SeletorDeUf} ufs=${dados.ufs} uf=${uf} aoEscolher=${setUf} /></div>
      <${ResumoDoRecorte} titulo=${uf ? nomeDaUf(uf) : 'Brasil'} t=${daUf || dados.totais} anterior=${uf ? antesDaUf : dados.anterior && totaisDasLinhas(dados.anterior)} cands=${cands} /><//>
    ${dados.anterior && nac.turnos['1'] && html`<${Bloco} id="nc-crescimento" titulo="Do 1º para o 2º turno" lede="Quanto cada candidato ganhou (ou perdeu) de votos em cada estado entre os dois turnos.">
      <${CrescimentoDeVotos} dados=${crescimentoDeVotos(nac, { anterior: '1', turno })} anterior="1" turno=${turno} /><//>`}
    ${urnas && html`<${UrnasNacionais} urnas=${urnas} uf=${uf} setUf=${setUf} />`}
    <${Bloco} id="nc-contas" titulo="Auditoria: as contas fecham?" lede="Conferências que qualquer pessoa pode refazer com os arquivos abertos do TSE.">
      <${ConferenciasNacionais} linhas=${dados.linhas} totais=${dados.totais} tse=${nac.tse?.[turno]} turno=${turno} /><//>
    ${dados.distantes && html`<${Bloco} id="nc-distantes" titulo="Municípios que mudaram diferente do estado" lede="Do 1º para o 2º turno, quem mais se afastou do município típico da própria UF.">
      <${DistantesNacionais} nac=${nac} distantes=${dados.distantes} turno=${turno} candidatos=${[nomeDeQuem(cands[0].urna), nomeDeQuem(cands[1].urna)]} /><//>`}`;
}

export function PaginaNacional() {
  const indice = usarIndiceNacional(), [ano, setAno] = useState(null), [turno, setTurno] = useState(null), [uf, setUf] = useState(null);
  const escolhido = ano || indice?.anos?.[0]?.ano, nac = usarNacional(escolhido);
  const turnos = indice?.anos.find(a => a.ano === escolhido)?.turnos || [], atual = turnos.includes(turno) ? turno : turnos[turnos.length - 1];
  const urnas = usarUrnas(escolhido, atual);
  if (!indice) return html`<p class="hint" role="status">Carregando o cenário nacional…</p>`;
  if (!indice.anos.length) return html`<p class="hint">O cenário nacional ainda não foi gerado.</p>`;
  return html`<article class="perfil nacional">
    <${Cabecalho} rotulo=${`Cenário nacional · Presidente · ${escolhido}${atual === '2' ? ' · 2º turno' : ''}`} titulo="O país votou: o que dá para conferir"
        lede="Votos e comparecimento de todos os municípios do Brasil, com as contas de auditoria que fecham (ou não) nos arquivos abertos do TSE.">
      <${SeletorDeAno} anos=${indice.anos} ano=${escolhido} setAno=${a => { setAno(a); setUf(null); }} />
      ${turnos.length > 1 && html`<${Abas} itens=${turnos.map(t => [t, `${t}º turno`])} valor=${atual} aoMudar=${setTurno} rotulo="Turno" estilo="pilula" />`}<//>
    ${!nac ? html`<p class="hint" role="status">Carregando ${escolhido}…</p>` : nac.vazio ? html`<p class="hint">Não foi possível ler os dados de ${escolhido}.</p>`
      : html`<${Conteudo} nac=${nac} turno=${atual} uf=${uf} setUf=${setUf} urnas=${urnas || null} />`}
    <p class="fonte">Fonte: Dados Abertos do TSE (votação e detalhe da votação por município e zona, presidente) e, para o turno ainda não publicado em arquivo, a API de resultados do TSE. Totais conferidos com o total nacional publicado pelo TSE quando disponível.</p>
  </article>`;
}
