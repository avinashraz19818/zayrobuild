import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://panel.example.test/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.confirm = () => true;
const { createRoot } = await import('react-dom/client');
const server = await createServer({ root: new URL('..', import.meta.url).pathname, server: { middlewareMode: true }, appType: 'custom' });
const calls = [];
const user = { id: 1, username: 'Tester', coins: 100, telegram_id: '123' };
const order = { id: 5, user_id: 1, app_name: 'Example', status: 'done', apk_file: 'Example.apk', fake_register_url: 'https://fake.example.test', fake_sites: [{ id: 9, fake_number: 2, status: 'done' }] };
globalThis.fetch = async (url, options = {}) => {
  const body = options.body ? JSON.parse(options.body) : null;
  calls.push({ url, method: options.method || 'GET', body });
  let result = {};
  if (options.method === 'POST' && url.endsWith('/coins')) {
    user.coins -= body.amount; result = { success: true, coins: user.coins };
  } else if (url === '/api/admin/users') result = options.method === 'DELETE' ? { success: true } : [user];
  else if (url === '/api/admin/users/1/orders') result = { user, orders: [order], stats: { total: 1, completed: 1, failed: 0, pending: 0, building: 0, apk_count: 1, coins_spent: 10 }, coin_history: [] };
  else if (url.includes('/firebase?')) result = { firebase_path: 'testPath', register_url: 'https://example.test/register', config: { minDeposit: 10 }, users: [{ key: 'demo123', value: { isDemo: true } }], order: { has_fake: true, fake_sites: order.fake_sites } };
  else if (url.startsWith('/api/admin/orders?')) result = { orders: [order], pagination: { totalPages: 2 } };
  else if (url.startsWith('/api/admin/all-orders?')) result = { orders: [{ kind: 'site', id: 7, user_id: 1, user_name: 'Tester', title: 'Netflix Premium', detail: 'fake · monthly', amount: 150, status: 'done', created_at: '2026-10-04 09:00:00', has_apk: 0 }], pagination: { total: 1, page: 1, limit: 20, totalPages: 1 } };
  else result = { success: true };
  return { ok: true, status: 200, text: async () => JSON.stringify(result) };
};
const root = createRoot(document.getElementById('root'));
const tick = async (ms = 0) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
const button = text => {
  const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes(text));
  assert.ok(b, `Missing button: ${text}`); return b;
};
const click = async el => { await act(async () => el.click()); await tick(); };
const select = async (el, value) => { await act(async () => { el.value = value; el.dispatchEvent(new window.Event('change', { bubbles: true })); }); await tick(); };
try {
  const { UsersTab, OrdersTab } = await server.ssrLoadModule('/src/views/admin/AdminManagement.jsx');
  const { ToastProvider } = await server.ssrLoadModule('/src/components/Toast.jsx');
  await act(async () => root.render(React.createElement(ToastProvider, null, React.createElement(UsersTab))));
  await tick();
  await click(button('+ / − Wallet'));
  await select(document.querySelector('select'), 'subtract');
  await act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  await tick();
  assert.ok(calls.some(c => c.url.endsWith('/1/coins') && c.body.action === 'subtract' && c.body.amount === 100));
  await click(button('Full profile & APKs'));
  assert.match(document.body.textContent, /Available APK files/);
  await click(button('Manage links & demo'));
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1, 'only the active nested sheet is mounted');
  await select(document.querySelector('select'), 'fake');
  assert.ok(calls.some(c => c.url.endsWith('/firebase?variant=fake')));
  const demoInput = document.querySelector('input[aria-label="Demo account key"]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(demoInput, 'demo456');
    demoInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await act(async () => demoInput.closest('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  await tick();
  assert.ok(calls.some(c => c.method === 'POST' && c.url.endsWith('/firebase/users') && c.body.variant === 'fake' && c.body.user_key === 'demo456'));
  await click(button('Remove'));
  assert.ok(calls.some(c => c.method === 'DELETE' && c.url.endsWith('/firebase/users/demo123?variant=fake')));
  await act(async () => document.querySelectorAll('form')[0].dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
  await tick();
  assert.ok(calls.some(c => c.method === 'PATCH' && c.url.endsWith('/firebase/link') && c.body.variant === 'fake'));
  await select(document.querySelector('select'), 'fs9');
  assert.ok(calls.some(c => c.url.endsWith('/firebase?variant=fs9')));
  await click(document.querySelector('button[aria-label="Close"]'));
  await click(document.querySelector('button[aria-label="Close"]'));
  await click(document.querySelector('input[aria-label="Select user 1"]'));
  await click(button('Delete selected users'));
  assert.ok(calls.some(c => c.method === 'DELETE' && c.url === '/api/admin/users' && c.body.ids[0] === 1));
  await act(async () => root.render(React.createElement(ToastProvider, null, React.createElement(OrdersTab, { onCreate() {} }))));
  await tick(250);
  await click([...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'APK'));
  await tick(250);
  await click(document.querySelector('input[aria-label="Select order 5"]'));
  await click(button('Delete selected orders'));
  assert.ok(calls.some(c => c.method === 'DELETE' && c.url === '/api/admin/orders' && c.body.ids[0] === 5));
  await click(button('Next')); await tick(250);
  assert.ok(calls.some(c => c.url.includes('page=2')));
  await click(button('Website')); await tick(250);
  assert.ok(calls.some(c => c.url.startsWith('/api/admin/all-orders?') && c.url.includes('type=site')), 'website pill loads unified list');
  assert.match(document.body.textContent, /Netflix Premium · Website #7/);
  assert.equal(document.querySelector('input[aria-label="Select order 5"]'), null, 'APK bulk actions hidden outside APK filter');
  await click(button('Sab')); await tick(250);
  assert.ok(calls.some(c => c.url.startsWith('/api/admin/all-orders?') && c.url.includes('type=all')), 'Sab pill loads all types');
  console.log('PASS: admin profile, coin subtraction, real/fake/extra targeting, link update, demo removal, bulk user/order deletion, pagination.');
} finally {
  await act(async () => root.unmount());
  await server.close();
  dom.window.close();
  // Toasts use delayed callbacks; no server remains running after this test.
}
