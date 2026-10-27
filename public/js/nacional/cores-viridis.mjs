// Escala viridis: sequencial, percebida por igual por quem não enxerga cores e sem relação com cores de partido.
export const PARADAS_VIRIDIS = ['#440154', '#472d7b', '#3b528b', '#2c728e', '#21908c', '#27ad81', '#5dc863', '#aadc32', '#fde725'];

const canais = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const hex = valores => '#' + valores.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

// t de 0 a 1; fora disso, trava nas pontas.
export function corViridis(t) {
  const x = Math.min(1, Math.max(0, t)) * (PARADAS_VIRIDIS.length - 1), i = Math.min(PARADAS_VIRIDIS.length - 2, Math.floor(x)), f = x - i;
  const [a, b] = [canais(PARADAS_VIRIDIS[i]), canais(PARADAS_VIRIDIS[i + 1])];
  return hex(a.map((v, k) => v + (b[k] - v) * f));
}

export function textoSobre(cor) {
  const [r, g, b] = canais(cor);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55 ? '#ffffff' : '#15212c';
}
