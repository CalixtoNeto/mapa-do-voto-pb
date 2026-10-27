// Agrega as seções lidas dos boletins de urna por município e separa as seções atípicas. Horários são a hora local da urna.
// Biometria = o grupo do meio de porIdentificacao, o maior dos três em que o boletim divide o comparecimento.
export const LIMITES = { abriuTarde: 15, abriuMuitoTarde: 60, fechouTarde: 30, prorrogada: 60, semDigital: 0.5, minimoParaSemDigital: 30 };
const BIOMETRIA = 1;

// '2026-10-25T08:15:30' e '08:00' → 15.5 (minutos depois do horário de referência)
export function minutosApos(iso, referencia) {
  if (!iso) return null;
  const [h, m] = referencia.split(':').map(Number);
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16)) + Number(iso.slice(17, 19)) / 60 - (h * 60 + m);
}

export function classificar(s) {
  const bio = s.porIdentificacao?.[BIOMETRIA], atraso = minutosApos(s.abertura, '08:00'), fim = minutosApos(s.encerramento, '17:00');
  return { semDigital: s.comparecimento >= LIMITES.minimoParaSemDigital && bio != null && bio / s.comparecimento <= LIMITES.semDigital,
    abriuTarde: atraso > LIMITES.abriuTarde, fechouTarde: fim > LIMITES.fechouTarde, prorrogada: fim > LIMITES.prorrogada };
}

const votosDe = (s, numeros) => numeros.map(n => s.candidatos?.find(c => c.numero === n)?.qtd || 0);
const somar = (acumulado, valores) => valores.forEach((v, i) => { acumulado[i] += v; });

function novoMunicipio(s, uf) {
  return { cd: s.municipio, uf, nome: s.nome, lidas: 0, semBoletim: 0, totais: Array(7).fill(0), marcas: Array(4).fill(0), normal: [0, 0, 0, 0], prorrog: [0, 0, 0, 0] };
}

function somarSecao(m, s, numeros, marcas) {
  m.lidas++;
  somar(m.totais, [s.aptos, s.comparecimento, ...s.porIdentificacao, s.brancos, s.nulos]);
  somar(m.marcas, [marcas.semDigital, marcas.abriuTarde, marcas.fechouTarde, marcas.prorrogada].map(Number));
  somar(marcas.prorrogada ? m.prorrog : m.normal, [1, s.comparecimento, ...votosDe(s, numeros)]);
}

// Marca da seção atípica: 1 = sem digital, 2 = abriu mais de 1 hora depois das 08:00 (somam quando as duas).
const marcaAtipica = (marcas, s) => Number(marcas.semDigital) + (minutosApos(s.abertura, '08:00') > LIMITES.abriuMuitoTarde ? 2 : 0);

// lidas: saída de coletarSecoes; numeros: números dos candidatos que interessam (na ordem). Devolve { municipios, atipicas }.
export function agregarSecoes(lidas, { uf, numeros }) {
  const porMunicipio = new Map(), atipicas = [];
  for (const s of lidas) {
    const m = porMunicipio.get(s.municipio) || novoMunicipio(s, uf);
    porMunicipio.set(s.municipio, m);
    if (s.erro) { m.semBoletim++; continue; }
    const marcas = classificar(s), marca = marcaAtipica(marcas, s);
    somarSecao(m, s, numeros, marcas);
    if (marca) atipicas.push([uf, s.municipio, s.zona, s.secao, marca, s.comparecimento, Math.round(100 * s.porIdentificacao[BIOMETRIA] / s.comparecimento) || 0,
      s.abertura.slice(11, 16), s.encerramento.slice(11, 16), ...votosDe(s, numeros)]);
  }
  const municipios = [...porMunicipio.values()].map(m => [m.cd, m.uf, m.nome, m.lidas, m.semBoletim, ...m.totais, ...m.marcas, m.normal, m.prorrog]);
  return { municipios, atipicas };
}

// O pleito do turno: os pleitos do ano (ele-c.json) em ordem de data; o 1º turno vem primeiro.
export function pleitoDoTurno(config, ano, turno) {
  const data = p => p.dt.split('/').reverse().join('');
  const pleitos = (config?.pl || []).filter(p => p.c === `ele${ano}`).sort((a, b) => data(a).localeCompare(data(b)));
  if (!pleitos[turno - 1]) throw new Error(`Sem pleito do ${turno}º turno de ${ano} na configuração do TSE`);
  return pleitos[turno - 1].cd;
}
