'use strict';

const CABINET_ORIGIN = 'https://triplecode.ru';

/** @typedef {'guest'|'waiting'|'signed-in'} AccountUiState */

function accountStatusLabel(state, email = '') {
  if (state === 'waiting') return 'Вход…';
  if (state === 'signed-in') {
    const short = String(email || '').split('@')[0] || 'TripleCode';
    return short.length > 18 ? `${short.slice(0, 16)}…` : short;
  }
  return 'Войти в TripleCode';
}

function accountStatusTooltip(state, email = '') {
  if (state === 'waiting') return 'Ожидание подтверждения входа в браузере';
  if (state === 'signed-in') return `${email || 'TripleCode'} · Pilot · BYOK`;
  return 'Войти в TripleCode';
}

function accountMenuItems(email) {
  return [
    { label: email, description: 'Pilot · BYOK · soft usage', kind: 'header' },
    { label: 'Открыть кабинет', kind: 'cabinet', url: `${CABINET_ORIGIN}/account` },
    { label: 'Использование', kind: 'usage', url: `${CABINET_ORIGIN}/account/usage` },
    { label: 'План', kind: 'plan', url: `${CABINET_ORIGIN}/account/plan` },
    { label: 'Сессии устройств', kind: 'sessions', url: `${CABINET_ORIGIN}/account/sessions` },
    { label: 'Выйти из TripleCode', kind: 'logout' }
  ];
}

function softPlanCopy() {
  return {
    id: 'pilot-byok',
    title: 'Pilot · BYOK',
    blurb: 'Inference идёт через ваш ключ/Ollama. Сервер TripleCode считает только usage events для кабинета, без жёсткого биллинга.'
  };
}

module.exports = {
  CABINET_ORIGIN,
  accountStatusLabel,
  accountStatusTooltip,
  accountMenuItems,
  softPlanCopy
};
