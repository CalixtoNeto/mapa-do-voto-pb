// Boletim de urna (arquivo -bu.dat): envelope SEQUENCE com o boletim num OCTET STRING. Lê a janela de votação (abertura e encerramento
// da urna, hora local), os contadores da seção e os votos. Conferido em João Pessoa (2º turno de 2026): a soma das seções bate com os
// totais oficiais de aptos, comparecimento, votos de cada candidato, brancos e nulos.
import { lerBer, inteiro, texto, ehNo, procurar } from './ber.mjs';

const ehData = no => /^\d{8}T\d{6}$/.test(texto(no) || '');
const SEQUENCIA = no => ehNo(no, 0, 16), INTEIRO = no => ehNo(no, 0, 2);
const TIPO = { NOMINAL: 1, BRANCO: 2, NULO: 3 };

// '20261025T080001' → '2026-10-25T08:00:01' (hora local da urna)
const iso = s => s && `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}`;

// Cada votável é { [1] tipo, [2] quantidade, [3] { partido, número } (só nos nominais), posição, hash }.
function votos(bu) {
  const lista = procurar(bu, no => SEQUENCIA(no) && ehNo(no.filhos?.[0], 2, 1) && ehNo(no.filhos?.[1], 2, 2))
    .map(no => ({ tipo: inteiro(no.filhos[0]), qtd: inteiro(no.filhos[1]), numero: inteiro(procurar(no.filhos[2] || {}, INTEIRO).at(-1)) }));
  const soma = tipo => lista.filter(v => v.tipo === tipo).reduce((s, v) => s + v.qtd, 0);
  return { candidatos: lista.filter(v => v.tipo === TIPO.NOMINAL).map(({ numero, qtd }) => ({ numero, qtd })), brancos: soma(TIPO.BRANCO), nulos: soma(TIPO.NULO) };
}

// porIdentificacao: o comparecimento dividido em três grupos que somam o total, na ordem do boletim; o do meio é o maior (biometria).
export function lerBoletim(buf) {
  const envelope = lerBer(buf)?.[0], octeto = envelope?.filhos?.find(no => ehNo(no, 0, 4)), bu = octeto && lerBer(octeto.bytes)?.[0];
  if (!bu) throw new Error('Boletim de urna ilegível');
  const filhos = bu.filhos, janela = filhos.find(no => ehNo(no, 2, 0) && no.filhos?.length === 2 && no.filhos.every(ehData));
  const apos = filhos.slice(filhos.indexOf(janela) + 1), grupos = apos.find(no => ehNo(no, 2, 1) && no.filhos?.length === 3);
  const resultado = procurar(bu, no => SEQUENCIA(no) && no.filhos?.length >= 4 && no.filhos.slice(0, 4).every(INTEIRO))[0];
  const [eleicao, aptos, cadastroA, cadastroB] = resultado?.filhos.slice(0, 4).map(inteiro) || [];
  return { emissao: iso(texto(filhos.find(ehData))), abertura: iso(texto(janela?.filhos[0])), encerramento: iso(texto(janela?.filhos[1])),
    eleicao, aptos, comparecimento: inteiro(apos.find(INTEIRO)), porIdentificacao: grupos?.filhos.map(inteiro), aptosPorCadastro: [cadastroA, cadastroB], ...votos(bu) };
}
