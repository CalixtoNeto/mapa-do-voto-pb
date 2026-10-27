// "Urnas": o que os boletins de urna mostram por UF (biometria, sem digital, abertura e fechamento) e as seções com marca de atenção.
// Biometria = o grupo do meio em que o boletim divide o comparecimento (o maior dos três); o TSE não rotula esses grupos nos arquivos abertos.
import { nf, pct, nomeDeQuem } from '../formato.mjs';
import { Cartao, Aviso } from '../cartao.mjs';
import { Abas, Bloco } from '../estrutura.mjs';
import { MapaDoBrasil, SeletorDeUf } from './mapa-do-brasil.mjs';
import { nomeDaUf } from './ufs.mjs';
import { METRICAS, totaisDasUrnas, urnasPorUf, valorDaMetrica } from './calculos-urnas.mjs';
import { TabelaDeAtipicas, atipicasDaUf } from './atipicas-urnas.mjs';
import { ProrrogadasUrnas } from './prorrogadas-urnas.mjs';
const { html, useState, useMemo } = window.htmPreact;

const Item = ({ nome, valor, nota }) => html`<div><dt>${nome}</dt><dd>${valor}${nota && html` <small>${nota}</small>`}</dd></div>`;

function NumerosDasUrnas({ titulo, t }) {
  const taxa = id => valorDaMetrica(t, id);
  return html`<${Cartao} tipo="Números do recorte" titulo=${titulo} sub=${`${nf.format(t.lidas)} seções lidas; ${nf.format(t.semBoletim)} sem boletim publicado.`}
      nota="Seções atípicas: poucos eleitores no grupo da biometria (metade ou menos, em seções com 30 eleitores ou mais), abertura depois das 8h15, fechamento depois das 17h30. Horários são a hora local da urna.">
    <dl class="numeros-nacional">
      <${Item} nome="Biometria" valor=${pct(taxa('biometria') ?? 0, 1)} nota="do comparecimento" />
      <${Item} nome="Poucos na biometria" valor=${nf.format(t.semDigital)} nota=${pct(taxa('semDigital') ?? 0, 2)} />
      <${Item} nome="Abriram tarde" valor=${nf.format(t.abriuTarde)} nota=${pct(taxa('abriuTarde') ?? 0, 2)} />
      <${Item} nome="Fecharam depois das 17h30" valor=${nf.format(t.fechouTarde)} nota=${pct(taxa('fechouTarde') ?? 0, 2)} />
      <${Item} nome="Fecharam depois das 18h" valor=${nf.format(t.prorrogadas)} nota=${pct(taxa('prorrogadas') ?? 0, 2)} />
    </dl><//>`;
}

export function UrnasNacionais({ urnas, uf, setUf }) {
  const [metrica, setMetrica] = useState('biometria');
  const dados = useMemo(() => {
    const ufs = urnasPorUf(urnas.municipios), nomes = new Map(urnas.municipios.map(l => [l[0], l[2]]));
    return { ufs, nomes, total: totaisDasUrnas(urnas.municipios) };
  }, [urnas]);
  const linhas = uf ? urnas.municipios.filter(l => l[1] === uf) : urnas.municipios, t = uf ? dados.ufs.find(u => u.uf === uf) : dados.total;
  const m = METRICAS.find(x => x.id === metrica), nomesDosCandidatos = urnas.candidatos.map(c => nomeDeQuem(c.urna));
  return html`<${Bloco} id="nc-urnas" titulo="Urnas: biometria, abertura e fechamento" colunas="metade"
        lede="O que os boletins de urna de cada seção mostram: quantos eleitores votaram com a biometria, quando a urna abriu e quando fechou. Toque num estado para ver os números dele.">
      <${Cartao} tipo="Mapa" titulo=${m.rotulo} sub="A escala vai do roxo ao amarelo, do menor ao maior valor entre os estados: é neutra, sem cor de partido.">
        <${Abas} itens=${METRICAS.map(x => [x.id, x.curto])} valor=${metrica} aoMudar=${setMetrica} rotulo="Medida" estilo="pilula" />
        <${MapaDoBrasil} ufs=${dados.ufs} valorDe=${u => valorDaMetrica(u, metrica) ?? 0} uf=${uf} aoEscolher=${setUf} casas=${metrica === 'biometria' ? 0 : 1} rotulo=${`${m.rotulo}, ${m.nota}`} />
        <${SeletorDeUf} ufs=${dados.ufs} uf=${uf} aoEscolher=${setUf} /><//>
      <${NumerosDasUrnas} titulo=${uf ? nomeDaUf(uf) : 'Brasil'} t=${t} /><//>
    <${Bloco} id="nc-atipicas" titulo="Seções com marca de atenção" lede="Seções com poucos eleitores no grupo da biometria ou que abriram mais de 1 hora depois das 8h, com mais eleitores primeiro.">
      <${Cartao} tipo="Seções" titulo=${uf ? nomeDaUf(uf) : 'Brasil'} classe="largo">
        <${TabelaDeAtipicas} lista=${atipicasDaUf(urnas, uf)} nomes=${dados.nomes} candidatos=${nomesDosCandidatos} />
        <${Aviso}>É uma conta do site sobre o boletim de urna, não uma avaliação de legalidade. Seções assim têm causas comuns: leitor biométrico com defeito (a votação segue pela digitação do título), atraso na instalação e filas.<//><//><//>
    <${Bloco} id="nc-prorrogadas" titulo="Seções que fecharam depois das 18h" lede="A parcela de cada candidato nas seções que fecharam tarde, comparada às outras seções do mesmo município.">
      <${ProrrogadasUrnas} linhas=${linhas} candidatos=${nomesDosCandidatos} /><//>`;
}
