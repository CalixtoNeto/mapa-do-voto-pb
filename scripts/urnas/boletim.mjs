// Boletim de urna (arquivo -bu.dat): envelope SEQUENCE com o boletim num OCTET STRING. Lê a janela de votação (abertura e encerramento
// da urna), os contadores da seção e os votos por votável.
import { lerBer, inteiro, texto, ehNo, procurar } from './ber.mjs';

const ehData = no => /^\d{8}T\d{6}$/.test(texto(no) || '');
const SEQUENCIA = no => ehNo(no, 0, 16), INTEIRO = no => ehNo(no, 0, 2);

// '20261025T080001' → '2026-10-25T08:00:01' (hora local da urna)
const iso = s => s && `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}`;

function votos(bu) {
  return procurar(bu, no => SEQUENCIA(no) && ehNo(no.filhos?.[0], 2, 1) && ehNo(no.filhos?.[1], 2, 2)).map(no => ({
    tipo: inteiro(no.filhos[0]), qtd: inteiro(no.filhos[1]), numero: inteiro(procurar(no.filhos[2] || {}, INTEIRO)[0]) }));
}

export function lerBoletim(buf) {
  const envelope = lerBer(buf)?.[0], octeto = envelope?.filhos?.find(no => ehNo(no, 0, 4)), bu = octeto && lerBer(octeto.bytes)?.[0];
  if (!bu) throw new Error('Boletim de urna ilegível');
  const filhos = bu.filhos, janela = filhos.find(no => ehNo(no, 2, 0) && no.filhos?.length === 2 && no.filhos.every(ehData));
  const apos = filhos.slice(filhos.indexOf(janela) + 1), trio = apos.find(no => ehNo(no, 2, 1) && no.filhos?.length === 3);
  const resultado = procurar(bu, no => SEQUENCIA(no) && no.filhos?.length >= 4 && no.filhos.slice(0, 4).every(INTEIRO))[0];
  return { emissao: iso(texto(filhos.find(ehData))), abertura: iso(texto(janela?.filhos[0])), encerramento: iso(texto(janela?.filhos[1])),
    comparecimentoX: inteiro(apos.find(INTEIRO)), trio: trio?.filhos.map(inteiro), eleicao: resultado?.filhos.slice(0, 4).map(inteiro), votos: votos(bu) };
}
