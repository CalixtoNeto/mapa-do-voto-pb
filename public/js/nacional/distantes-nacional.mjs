// "Municípios que mudaram diferente do estado": quem mais se afastou do município típico da própria UF entre os dois turnos.
// Uma comparação estatística, não uma acusação: município pequeno varia mais e uma mudança grande pode ter explicação local.
import { nf, nomeDeQuem } from '../formato.mjs';
import { Cartao, Aviso } from '../cartao.mjs';
import { Abas } from '../estrutura.mjs';
import { nomeDaUf } from './grade-de-ufs.mjs';
import { semOsDestacados } from './calculos-distantes.mjs';
const { html, useState } = window.htmPreact;

const SINAIS = {
  parcela: { rotulo: 'Voto no candidato', titulo: 'Mudança na parcela do candidato mais votado', coluna: 'Mudança' },
  abstencao: { rotulo: 'Abstenção', titulo: 'Mudança na abstenção', coluna: 'Mudança' },
  brancoNulo: { rotulo: 'Brancos e nulos', titulo: 'Mudança nos brancos e nulos', coluna: 'Mudança' },
};
const MOSTRAR = 25;
const pp = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.`;

function Tabela({ lista, nome }) {
  return html`<div class="calor-rolagem"><table class="tabela-nacional"><caption class="so-leitor">${nome}</caption>
    <thead><tr><th scope="col">Município</th><th scope="col">Mudança</th><th scope="col">Típico na UF</th><th scope="col">Saldo no 2º turno</th></tr></thead>
    <tbody>${lista.slice(0, MOSTRAR).map(m => html`<tr><th scope="row">${nomeDeQuem(m.nome)} <small>${nomeDaUf(m.uf)}</small></th><td>${pp(m.valor)}</td><td>${pp(m.esperado)}</td><td>${nf.format(m.saldo)}</td></tr>`)}</tbody></table></div>`;
}

function Efeito({ nac, lista, turno, candidato }) {
  if (!lista.length) return null;
  const e = semOsDestacados(nac, lista, turno), lado = n => n >= 0 ? candidato : 'o outro candidato';
  return html`<p class="efeito">Os ${nf.format(e.destacados)} municípios desta lista somam um saldo de ${nf.format(Math.abs(e.saldoDeles))} votos para ${lado(e.saldoDeles)}.
    Sem eles, a vantagem nacional de ${nf.format(Math.abs(e.margemTotal))} votos seria de ${nf.format(Math.abs(e.margemSemEles))}${e.margemSemEles * e.margemTotal < 0 ? ' para o outro lado' : ''}.</p>`;
}

export function DistantesNacionais({ nac, distantes, turno, candidato }) {
  const [sinal, setSinal] = useState('parcela'), lista = distantes[sinal], s = SINAIS[sinal];
  return html`<${Cartao} tipo="Valores distantes" titulo=${s.titulo} classe="largo"
      sub=${`Comparado ao município típico da mesma UF (${nf.format(distantes.testados)} municípios com ao menos 500 votos válidos nos dois turnos).`}
      nota="Cada município é comparado só com os da sua UF. Destaca quem está a 4 desvios ou mais do típico. Saldo: votos do primeiro menos os do segundo colocado.">
    <${Abas} itens=${Object.entries(SINAIS).map(([id, x]) => [id, `${x.rotulo} (${distantes[id].length})`])} valor=${sinal} aoMudar=${setSinal} rotulo="Tipo de mudança" estilo="pilula" />
    ${lista.length ? html`<${Tabela} lista=${lista} nome=${s.titulo} /><${Efeito} nac=${nac} lista=${lista} turno=${turno} candidato=${candidato} />`
      : html`<p class="hint">Nenhum município ficou tão distante do típico da UF nesta medida.</p>`}
    <${Aviso}>É uma comparação do site, não uma avaliação de legalidade: ela só diz quem mudou diferente dos vizinhos. Mudanças grandes têm causas conhecidas (candidato local forte, obras, chuvas, transporte no dia da votação).<//><//>`;
}
