import data from './data.mjs';
export const menuById = Object.fromEntries(data.menu.map(item => [item.id, item]));

export function recommendCombos(people = 2, budget = 40000, spicy = '상관없어요', drink = '맥주', lines = []) {
  const counts = {}, affinity = {};
  for (const line of lines) {
    for (const c of line.components || [{id: line.id, qty: 1}]) {
      counts[c.id] = (counts[c.id] || 0) + c.qty * line.qty;
    }
  }
  for (const [id, count] of Object.entries(counts)) {
    if (menuById[id]) affinity[menuById[id].cat] = (affinity[menuById[id].cat] || 0) + count;
  }
  const recommendations = [];
  for (const [id, name, baseIds, pairingReason] of data.pairings) {
    const ids = baseIds.map(id => spicy === '매콤하게' && ['a2','a3'].includes(id) ? `${id}-hot` : id);
    const drinkId = data.drinks[drink];
    const selected = drinkId ? [...ids, drinkId] : [...ids];
    if (selected.some(id => menuById[id].soldout)) continue;
    const spicyItems = ids.filter(id => menuById[id].tags.includes('매운맛'));
    if (spicy === '맵지 않게' && spicyItems.length) continue;
    const components = selected.map(id => {
      const item = menuById[id];
      return {id, name: item.name, emoji: item.emoji, qty: id === drinkId ? people : people >= 4 ? 2 : 1, opt:'', unit: item.price};
    });
    const original = components.reduce((sum, c) => sum + c.unit * c.qty, 0);
    const discount = Math.floor(original * data.discountPercent / 100);
    const price = original - discount;
    if (price > budget) continue;
    const overlap = ids.filter(id => counts[id] > 0).length;
    let score = ids.filter(id => menuById[id].tags.includes('BEST')).length * 4
      + ids.reduce((sum, id) => sum + Math.min(affinity[menuById[id].cat] || 0, 3), 0) * 2 - overlap * 15;
    if (spicy === '매콤하게') score += spicyItems.length ? 20 : -10;
    score += 3 * (1 - Math.abs(price - budget * .8) / budget);
    let reason = `${people}명이 나눠 먹도록 안주 수량을 맞췄어요. ${pairingReason}`;
    if (spicy === '맵지 않게') reason += ' 매운맛 메뉴는 제외했어요.';
    else if (spicy === '매콤하게' && spicyItems.length) reason += ' 선택한 매콤한 취향을 반영했어요.';
    if (drink !== '없이') reason += ` ${drink}도 1인당 1개씩 포함했어요.`;
    if (Object.keys(counts).length) reason += overlap ? ' 기존 주문과 겹치는 안주가 포함되어 있어요.' : ' 장바구니·주문 내역의 안주와 겹치지 않게 골랐어요.';
    recommendations.push({id, name, components, original, discount, price, reason, score});
  }
  return recommendations.sort((a, b) => b.score - a.score || a.price - b.price || (a.id < b.id ? -1 : 1)).slice(0, 3);
}

export function comboCartLine(combo) {
  const signature = combo.components.map(c => `${c.id}:${c.qty}:${c.opt}`).join(';');
  const key = `combo:${combo.id}|${signature}|${combo.price}`;
  const opt = combo.components.map(c => `${c.name} × ${c.qty}${c.opt ? ` (${c.opt})` : ''}`).join(' + ');
  return [key, {id: `combo:${combo.id}`, name: `[AI 조합] ${combo.name}`, opt, unit: combo.price,
    original_unit: combo.original, qty: 1, components: structuredClone(combo.components)}];
}

export function cartTotals(cart, percent = 0) {
  const lines = Object.values(cart);
  const subtotal = lines.reduce((sum, l) => sum + l.unit * l.qty, 0);
  const roulette = Math.floor(Math.floor(subtotal * percent / 100) / 10) * 10;
  const savings = lines.reduce((sum, l) => sum + ((l.original_unit ?? l.unit) - l.unit) * l.qty, 0);
  return {subtotal, roulette, savings, total: subtotal - roulette, count: lines.reduce((sum, l) => sum + l.qty, 0)};
}
