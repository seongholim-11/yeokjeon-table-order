import data from './data.mjs';
import {menuById, recommendCombos, comboCartLine, cartTotals} from './engine.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const won = n => `${n.toLocaleString('ko-KR')}원`;
const storageKey = 'yeokjeon-table-order-v1';
let state = {page:'splash', cat:'best', cart:{}, orders:[], calls:[], roulette:null, roulettePercent:0, preferences:{people:2,budget:40000,spicy:'상관없어요',drink:'맥주'}};
try { const saved = JSON.parse(sessionStorage.getItem(storageKey)); if (saved?.cart && saved?.orders && saved?.preferences) state = saved; } catch { /* Storage can be disabled by the browser. */ }
let combos = [], spinning = false, toastTimer;
function save() { try { sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch {} }
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3000); }
function button(label, action, value = '', cls = '', disabled = false) { return `<button class="${cls}" data-action="${action}" data-value="${esc(value)}" ${disabled ? 'disabled' : ''}>${label}</button>`; }
function openModal(title, body) { $('#modal-title').textContent = title; $('#modal-body').innerHTML = body; if (!$('#modal').open) $('#modal').showModal(); }
function closeModal() { $('#modal').close(); }
function allLines() { return [...Object.values(state.cart), ...state.orders.flatMap(o => o.lines)]; }
function itemCount(id) { return Object.values(state.cart).reduce((sum,l) => sum + l.qty * (l.components ? l.components.filter(c => c.id === id).reduce((n,c) => n + c.qty,0) : Number(l.id === id)),0); }
function thumb(item, big = false) {
  const colors = data.categories.find(c => c[0] === item.cat)[3], count = itemCount(item.id);
  return `<div class="thumb${big ? ' big' : ''}" style="background:linear-gradient(135deg,${colors[0]},${colors[1]})"><span aria-hidden="true">${item.emoji}</span><div class="badges">${item.tags.map(t => `<span class="badge ${t === '매운맛' ? 'spicy' : t}">${t === '매운맛' ? '🌶 매운맛' : t}</span>`).join('')}</div>${count ? `<div class="incart">${count}개 담김</div>` : ''}${item.soldout ? '<div class="soldout">품절</div>' : ''}</div>`;
}
function render() {
  save();
  if (state.page === 'splash') { renderWelcome(); return; }
  const totals = cartTotals(state.cart, state.roulettePercent);
  $('#app').innerHTML = `<header class="header"><div class="brand"><div class="logo">🍺</div><div><div class="name">${data.store.name}</div><div class="sub">${data.store.branch}</div></div></div><div class="table-chip">TABLE <b>12</b></div><div class="header-actions">${button('🔔 직원호출','staff')}${button(`🧾 주문내역${state.orders.length ? ` (${state.orders.length})` : ''}`,'orders')}${button(`🛒 장바구니 (${totals.count})`,'cart')}${button('🏠 처음으로','home')}</div></header><div class="layout"><nav class="categories" aria-label="메뉴 카테고리">${data.categories.map(([id,emoji,name]) => button(`${emoji} ${name}`,'category',id,state.cat === id ? 'primary' : '')).join('')}</nav><section id="menu-content" aria-label="메뉴"></section><aside class="desktop-cart" aria-label="장바구니">${cartHTML()}</aside></div><p class="demo-note">테이블오더 데모 · 실제 주문, 결제, 직원 호출은 전송되지 않습니다. 데이터는 이 브라우저 탭에서만 유지됩니다.</p>`;
  renderMenu();
}
function renderWelcome() {
  const prizes = data.prizes, seg = 360 / prizes.length;
  const background = prizes.map((p,i) => `${p.color} ${i*seg}deg ${(i+1)*seg-1.2}deg,#fff ${(i+1)*seg-1.2}deg ${(i+1)*seg}deg`).join(',');
  const prize = state.roulette ? prizes[state.roulette.idx] : null;
  $('#app').innerHTML = `<section class="welcome"><div class="rw-title"><div class="fork">🍴</div><div class="q">오늘, 어떤 메뉴가 좋을까요?</div><h2>행운의 <span>룰렛</span>을 돌려보세요!</h2><div class="s">맛있는 식사와 함께 작은 행운도 받아가세요!</div></div><div class="roulette-box"><div class="rw-stage"><div class="rw-stand"></div><div class="rw-ring"></div>${Array.from({length:16},(_,k) => `<div class="rw-dot" style="transform:rotate(${k*360/16}deg)"><i></i></div>`).join('')}<div class="rw-pin"></div><div class="rw-wheel${spinning ? ' spin' : ''}" style="--to:${state.roulette?.angle || 0}deg;background:conic-gradient(from ${-seg/2}deg,${background})">${prizes.map((p,i) => `<div class="rw-label" style="transform:rotate(${i*seg}deg)"><span style="transform:rotate(${-i*seg}deg)">${p.label}<em>${p.emoji}</em></span></div>`).join('')}</div>${button('START','spin','','roulette-start',Boolean(state.roulette))}</div></div>${prize && !spinning ? `<div class="rw-result"><div class="t">축하합니다! 오늘의 행운은</div><div class="p">${prize.emoji} ${prize.short}</div><div class="n">${prize.kind === 'discount' ? '다음 주문에 자동 적용돼요' : '장바구니에 담아 두었어요'}</div></div>` : ''}<div class="welcome-bottom"><div class="welcome-info">${data.store.name} ${data.store.branch}<br>테이블 12 · 룰렛은 탭당 한 번 참여할 수 있어요</div>${button('🍴 메뉴선택 ›','start','','primary',spinning)}</div><p class="demo-note">데모 이벤트입니다. 실제 매장에서 사용할 수 있는 혜택은 아닙니다.</p></section>`;
}
function renderMenu() {
  if (state.cat === 'ai') { renderRecommendations(); return; }
  const [,icon,name] = data.categories.find(c => c[0] === state.cat);
  const items = data.menu.filter(m => state.cat === 'best' ? m.tags.includes('BEST') : m.cat === state.cat);
  $('#menu-content').innerHTML = `<div class="section-title">${icon} ${name} <span>${items.length}</span></div><div class="menu-grid">${items.map(item => `<article class="menu-card">${thumb(item)}<div class="mname">${esc(item.name)}</div><div class="mdesc">${esc(item.desc)}</div><div class="mprice">${won(item.price)}</div>${button(item.soldout ? '품절' : '담기','item',item.id,'wide',item.soldout)}</article>`).join('')}</div>`;
}
function selectField(label, name, values, format = value => value) { return `<label>${label}<select data-pref="${name}">${values.map(value => `<option value="${esc(value)}" ${state.preferences[name] === value ? 'selected' : ''}>${format(value)}</option>`).join('')}</select></label>`; }
function renderRecommendations() {
  const {people,budget,spicy,drink} = state.preferences;
  combos = recommendCombos(people,budget,spicy,drink,allLines());
  $('#menu-content').innerHTML = `<div class="ai-hero"><div class="ai-eyebrow">✨ 오늘의 맞춤 메뉴</div><h2>AI 추천 조합</h2><p>취향에 맞는 한 상, 조합 할인까지 한 번에.</p><span class="ai-offer">조합으로 주문하면 ${data.discountPercent}% 할인</span></div><div class="ai-preferences"><b>어떤 한 상을 원하세요?</b><div class="ai-fields">${selectField('주문 인원','people',[1,2,3,4,5,6],n => `${n}명`)}${selectField('조합 예산','budget',[20000,30000,40000,60000,100000],n => `${won(n)} 이하`)}${selectField('맵기 취향','spicy',['상관없어요','맵지 않게','매콤하게'])}${selectField('함께 마실 음료','drink',['맥주','소주','음료','없이'])}</div><div class="mdesc">예산은 한 조합의 할인 후 총액 기준입니다.</div></div><div class="section-title ai-results-title">나에게 맞는 추천 <span>${combos.length}</span><small>${people}명 · ${won(budget)} 이하</small></div>${combos.length ? combos.map((combo,i) => `<article class="combo-card"><div class="combo-heading"><span class="combo-rank rank-${i+1}">${i+1}위</span><h3>${combo.name}</h3>${i === 0 ? '<span class="combo-top">가장 추천해요</span>' : ''}</div><div class="combo-items">${combo.components.map(c => `<div class="combo-item"><span class="combo-emoji">${c.emoji}</span><span>${c.name}<small>${c.opt}</small></span><b>× ${c.qty}</b></div>`).join('')}</div><div class="combo-reason"><strong>✨ 이 조합을 추천한 이유</strong><p>${combo.reason}</p></div><div class="combo-pricing"><span class="combo-discount">10% 할인</span><del>${won(combo.original)}</del><strong>${won(combo.price)}</strong><small>${won(combo.discount)} 절약</small></div>${button(`${i+1}위 조합 담기 · ${won(combo.price)}`,'combo',i,`wide${i === 0 ? ' primary' : ''}`)}</article>`).join('') : '<p>선택한 조건에 맞는 조합이 없어요. 예산이나 음료·인원 조건을 바꿔 주세요.</p>'}<p class="mdesc">취향과 주문 정보를 반영한 데모 추천입니다. 조합 할인은 세트 단위로 적용됩니다.</p>`;
}
function cartHTML() {
  const totals = cartTotals(state.cart,state.roulettePercent), lines = Object.entries(state.cart);
  return `<div class="cart-panel"><div class="cart-title">🛒 장바구니 <span>${totals.count}</span></div><div class="cart-items">${lines.length ? lines.map(([key,l]) => `<div class="cart-row"><div class="cart-line"><div><div class="n">${esc(l.name)}</div><div class="o">${esc(l.opt)}</div></div><div class="p">${won(l.unit*l.qty)}</div></div><div class="stepper">${button('−','decrement',key)}<span aria-label="수량">${l.qty}</span>${button('+','increment',key)}${button('🗑','remove',key)}</div></div>`).join('') : '<div class="cart-empty"><span class="emoji">🍻</span>메뉴를 담아주세요</div>'}</div>${totals.savings ? `<div class="cart-savings">✨ AI 조합으로 ${won(totals.savings)} 할인받았어요</div>` : ''}${totals.roulette ? `<div class="cart-savings">🎟️ 룰렛 ${state.roulettePercent}% 할인 −${won(totals.roulette)}</div>` : ''}<div class="total-row"><span>총 주문금액</span><b>${won(totals.total)}</b></div>${button('주문 확인하기','confirm','','wide primary',!lines.length)}</div>`;
}
function addItem(item,opt,unit,qty) { const key = `${item.id}|${opt}`; if (state.cart[key]) state.cart[key].qty += qty; else state.cart[key] = {id:item.id,name:item.name,opt,unit,qty}; }
function showConfirm() {
  const lines = Object.values(state.cart); if (!lines.length) return;
  const totals = cartTotals(state.cart,state.roulettePercent);
  openModal('주문 확인', `${lines.map(l => `<div class="order-item"><span>${esc(l.name)}${l.opt ? ` (${esc(l.opt)})` : ''} × ${l.qty}</span><span>${won(l.unit*l.qty)}</span></div>`).join('')}${totals.savings ? `<p class="mdesc">AI 조합 할인 −${won(totals.savings)} 적용</p>` : ''}${totals.roulette ? `<p class="mdesc">룰렛 할인 −${won(totals.roulette)} 적용</p>` : ''}<div class="total-row"><span>총 주문금액</span><b>${won(totals.total)}</b></div><p class="mdesc">주문 데모입니다. 실제 매장에 주문이 전송되지 않습니다.</p><div class="dialog-actions">${button('돌아가기','cart')}${button('주문하기','order','','primary')}</div>`);
}
function showOrders() {
  openModal('주문내역', state.orders.length ? `${[...state.orders].reverse().map(o => {const elapsed = (Date.now()-o.ts)/1000; return `<div class="order-box"><div class="order-head"><span>주문 #${o.no} · ${o.time}</span><span class="status">${elapsed < 15 ? '접수완료' : elapsed < 45 ? '조리중' : '서빙완료'}</span></div>${o.lines.map(l => `<div class="order-item"><span>${esc(l.name)} × ${l.qty}<small class="mdesc">${esc(l.opt)}</small></span><span>${won(l.unit*l.qty)}</span></div>`).join('')}<div class="total-row"><span>소계</span><b>${won(o.total)}</b></div></div>`;}).join('')}<div class="total-row"><span>누적 주문금액</span><b>${won(state.orders.reduce((sum,o) => sum+o.total,0))}</b></div><p class="mdesc">데모: 시간이 지나면 주문 상태가 바뀝니다. 다시 열면 갱신돼요.</p>` : '<div class="cart-empty">아직 주문 내역이 없어요</div>');
}
function spin() {
  if (state.roulette) return;
  const bytes = new Uint32Array(1); crypto.getRandomValues(bytes);
  const idx = Math.floor(bytes[0] / 4294967296 * data.prizes.length), prize = data.prizes[idx];
  state.roulette = {idx,angle:1800-idx*360/data.prizes.length};
  if (prize.kind === 'discount') state.roulettePercent = prize.percent;
  else addItem(menuById[prize.item_id],'룰렛 서비스',0,1);
  spinning = true; render();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => { spinning = false; render(); toast(prize.short); }, reduced ? 100 : 4600);
}
document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]'); if (!target || target.disabled) return;
  const {action,value} = target.dataset;
  switch (action) {
    case 'start': state.page = 'menu'; render(); break;
    case 'home': state.page = 'splash'; render(); break;
    case 'category': state.cat = value; render(); break;
    case 'item': {
      const item = menuById[value]; if (!item || item.soldout) break;
      addItem(item,'',item.price,1); render(); break;
    }
    case 'cart': openModal('장바구니',cartHTML()); break;
    case 'confirm': showConfirm(); break;
    case 'orders': showOrders(); break;
    case 'spin': spin(); break;
    case 'increment': case 'decrement': case 'remove': {
      const line = state.cart[value]; if (!line) break;
      if (action === 'remove') delete state.cart[value];
      else { line.qty += action === 'increment' ? 1 : -1; if (line.qty <= 0) delete state.cart[value]; }
      render(); if ($('#modal').open) openModal('장바구니',cartHTML()); break;
    }
    case 'combo': {
      const combo = combos[Number(value)]; if (!combo || combo.components.some(c => menuById[c.id].soldout)) break;
      const [key,line] = comboCartLine(combo);
      if (state.cart[key]) state.cart[key].qty += 1; else state.cart[key] = line;
      render(); toast('할인된 가격으로 조합을 담았어요'); break;
    }
    case 'order': {
      if (!Object.keys(state.cart).length) break;
      const ts = Date.now();
      state.orders.push({no:state.orders.length+1,ts,time:new Date(ts).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}),lines:structuredClone(Object.values(state.cart)),total:cartTotals(state.cart,state.roulettePercent).total});
      state.cart = {}; state.roulettePercent = 0; closeModal(); render(); toast(`주문이 접수되었습니다 (주문번호 #${state.orders.length})`); break;
    }
    case 'staff': openModal('직원 호출', `<form id="staff-form"><p class="mdesc">필요한 항목을 선택해 주세요. 실제 직원에게 전송되지 않습니다.</p><div class="staff-options">${data.staffCalls.map((name,i) => `<label><input type="checkbox" name="request" value="${i}"> ${name}</label>`).join('')}</div><button class="wide primary" type="submit" id="staff-submit" disabled>호출하기</button></form>`); break;
  }
});
document.addEventListener('change', event => {
  if (event.target.dataset.pref) {
    const name = event.target.dataset.pref;
    state.preferences[name] = ['people','budget'].includes(name) ? Number(event.target.value) : event.target.value;
    save(); renderRecommendations();
  }
  if (event.target.closest('#staff-form')) $('#staff-submit').disabled = !$('#staff-form input:checked');
});
document.addEventListener('submit', event => {
  if (event.target.id === 'staff-form') {
    event.preventDefault(); const picks = new FormData(event.target).getAll('request').map(i => data.staffCalls[Number(i)]); if (!picks.length) return;
    state.calls.push({ts:Date.now(),picks}); save(); closeModal(); toast('직원 호출 데모가 접수되었습니다 🙋');
  }
});
$('#close-modal').addEventListener('click',closeModal);
$('#modal').addEventListener('click',event => { if (event.target === $('#modal')) { const r = $('#modal').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });
render();
