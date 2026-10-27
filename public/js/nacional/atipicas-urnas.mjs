// Seções com marca de atenção nos boletins de urna: poucos eleitores no grupo da biometria ou abertura com mais de 1 hora de atraso.
import { nf, nomeDeQuem } from '../formato.mjs';
import { siglaDaUf } from './ufs.mjs';
const { html } = window.htmPreact;

const MARCAS = { 1: 'Poucos no grupo da biometria', 2: 'Abriu mais de 1 h depois das 8h', 3: 'As duas marcas' };
const MOSTRAR = 25;

// atipica: [uf, cd, zona, seção, marca, comparecimento, % biometria, abertura, encerramento, A, B]
export function TabelaDeAtipicas({ lista, nomes, candidatos }) {
  return html`<div class="calor-rolagem"><table class="tabela-nacional"><caption class="so-leitor">Seções com marca de atenção</caption>
    <thead><tr><th scope="col">Município · zona e seção</th><th scope="col">Marca</th><th scope="col">Compareceram</th><th scope="col">Biometria</th><th scope="col">Abriu</th><th scope="col">Fechou</th>
      <th scope="col">${candidatos[0]}</th><th scope="col">${candidatos[1]}</th></tr></thead>
    <tbody>${lista.slice(0, MOSTRAR).map(a => html`<tr><th scope="row">${nomeDeQuem(nomes.get(a[1]) || a[1])} <small>${siglaDaUf(a[0])} · z${+a[2]} s${+a[3]}</small></th>
      <td>${MARCAS[a[4]]}</td><td>${nf.format(a[5])}</td><td>${a[6]}%</td><td>${a[7]}</td><td>${a[8]}</td><td>${nf.format(a[9])}</td><td>${nf.format(a[10])}</td></tr>`)}</tbody></table></div>
    ${lista.length > MOSTRAR && html`<p class="hint">Mostrando ${MOSTRAR} de ${nf.format(lista.length)} seções, as com mais eleitores primeiro.</p>`}`;
}

export const atipicasDaUf = (urnas, uf) => urnas.atipicas.filter(a => !uf || a[0] === uf).sort((a, b) => b[5] - a[5]);
