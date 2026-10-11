// Os quatro números do topo do Governo: pago, compras, folha e emendas estaduais.
import { nf, dinheiro, pct } from '../formato.mjs';
import { pagoDoAno, anoParcial, ultimoMesComDado } from './calculos-municipio.mjs';
import { mesAno } from './calculos-perfil.mjs';
import { resumoDasEmendas } from './calculos-estado.mjs';

export function indicadoresDoAno(a) {
  const pago = pagoDoAno(a), mes = ultimoMesComDado(a), emendas = resumoDasEmendas(a);
  return [
    { rotulo: `Pago em ${a.ano}`, valor: pago ? dinheiro(pago) : null, nota: anoParcial(a) && mes ? `até ${mesAno(a.ano + String(mes).padStart(2, '0'))}` : 'no ano inteiro' },
    { rotulo: 'Compras, serviços e obras', valor: a.despesas?.compras ? dinheiro(a.despesas.compras) : null, nota: pago ? `${pct(a.despesas.compras / pago, 0)} do pago` : null },
    { rotulo: 'Folha bruta', valor: a.folha ? dinheiro(a.folha.total) : null, nota: a.folha && `${nf.format(a.folha.pessoas)} vínculos em ${mesAno(a.folha.mes)}` },
    { rotulo: 'Emendas estaduais indicadas', valor: emendas ? dinheiro(emendas.total) : null, nota: emendas && `${emendas.autores} autores` }];
}
