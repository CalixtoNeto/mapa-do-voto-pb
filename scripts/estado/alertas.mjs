// Valores atípicos nas compras do estado, calculados pelo site (as mesmas regras do perfil de Bayeux, na escala do
// orçamento estadual). Descrevem o dado; não avaliam a legalidade da despesa. As despesas do estado não trazem a
// modalidade de licitação, então não há a conta "sem licitação acima do valor de referência".
import { centavos } from '../perfis/somas.mjs';

const PICO = 3, PICO_MINIMO = 5e6, MESES_MINIMOS = 6, CONCENTRACAO = 0.7, CONCENTRACAO_MINIMA = 20e6, MOSTRADOS = 15;
// Água, energia, telefone, correios e bancos só têm um fornecedor possível: concentração ali não diz nada.
const FORNECEDOR_UNICO = /energisa|cagepa|correios|empresa paraibana de comunica|imprensa oficial|banco do brasil|caixa econ[oô]mica|telefonica|claro|oi s/i;

const mediana = valores => { const v = [...valores].sort((a, b) => a - b), m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const maiores = lista => lista.sort((a, b) => b[3] - a[3]).slice(0, MOSTRADOS);

function picos(d) {
  return maiores(Object.entries(d.mensal).flatMap(([elemento, meses]) => {
    const valores = Object.values(meses);
    if (valores.length < MESES_MINIMOS) return [];
    const m = mediana(valores);
    return Object.entries(meses).filter(([, v]) => v >= PICO_MINIMO && v > PICO * m).map(([mes, v]) => ['pico', elemento, mes, centavos(v), centavos(m)]);
  }));
}

function concentracoes(d) {
  return maiores(Object.entries(d.porElemento).filter(([, e]) => e.v >= CONCENTRACAO_MINIMA).flatMap(([elemento, e]) => {
    const [credor, v] = Object.entries(e.credores).sort((a, b) => b[1] - a[1])[0];
    return v / e.v >= CONCENTRACAO && !FORNECEDOR_UNICO.test(credor) ? [['concentracao', elemento, credor, centavos(v), centavos(e.v)]] : [];
  }));
}

export const alertasDoEstado = d => [...picos(d), ...concentracoes(d)];
