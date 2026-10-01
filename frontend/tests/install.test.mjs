import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';

let server;
before(async () => { server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } }); });
after(async () => { await server?.close(); });

async function fixture({ ua = 'Chrome Windows', installed = false, preview = false, blockedStorage = false } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: preview ? 'file:///preview.html' : 'https://restaurant.example/' });
  const { window } = dom;
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter', 'CustomEvent', 'Event', 'MutationObserver', 'getComputedStyle']) {
    Object.defineProperty(globalThis, key, { configurable: true, value: key === 'getComputedStyle' ? window.getComputedStyle.bind(window) : window[key] });
  }
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });
  window.matchMedia = () => ({ matches: installed, addEventListener() {}, removeEventListener() {} });
  window.__RESTOPUSULA_PREVIEW__ = preview;
  if (blockedStorage) Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled'); } });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { default: InstallApp } = await server.ssrLoadModule('/src/InstallApp.tsx');
  let root;
  await act(async () => { root = createRoot(window.document.getElementById('root')); root.render(React.createElement(InstallApp)); });
  const button = (name) => [...window.document.querySelectorAll('button')].find(el => el.textContent.trim() === name || el.getAttribute('aria-label') === name);
  return {
    window, button,
    async remount() { await act(async () => root.unmount()); await act(async () => { root = createRoot(window.document.getElementById('root')); root.render(React.createElement(InstallApp)); }); },
    async click(name) { const el = button(name); assert.ok(el, `Button missing: ${name}`); await act(async () => el.click()); },
    async close() { await act(async () => root.unmount()); dom.window.close(); },
  };
}

// Catches a missing first-entry offer, dismissal that repeats on reload,
// or removal of the permanent route back to installation instructions.
test('offers shortcuts, remembers dismissal, and allows reopening', async () => {
  const f = await fixture();
  try {
    assert.ok(f.window.document.querySelector('[aria-label="Uygulama kısayolu önerisi"]'));
    await f.click('Daha sonra');
    await f.remount();
    assert.equal(f.window.document.querySelector('[aria-label="Uygulama kısayolu önerisi"]'), null);
    await f.click('Kısayol ekle');
    assert.ok(f.window.document.querySelector('[role="dialog"]'));
    assert.match(f.window.document.body.textContent, /Chrome|Edge/);
  } finally { await f.close(); }
});

test('failed native prompt provides manual instructions', async () => {
  const f = await fixture();
  try {
    const event = new f.window.Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => { throw new Error('Browser refused prompt'); };
    event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });
    await act(async () => f.window.dispatchEvent(event));
    await f.click('Uygulamayı yükle');
    assert.ok(f.window.document.querySelector('[role="dialog"]'));
    assert.match(f.window.document.querySelector('[role="status"]').textContent, /adımlarla kısayol/);
  } finally { await f.close(); }
});

test('accepted native prompt dismisses offer until browser confirms installation', async () => {
  const f = await fixture();
  try {
    const event = new f.window.Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => {};
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
    await act(async () => f.window.dispatchEvent(event));
    await f.click('Uygulamayı yükle');
    assert.equal(f.window.document.querySelector('[aria-label="Uygulama kısayolu önerisi"]'), null);
    assert.ok(f.button('Kısayol ekle'));
  } finally { await f.close(); }
});

// The real OS prompt cannot run in a DOM test; simulate only that browser boundary.
test('uses a one-shot browser prompt, then hides after appinstalled', async () => {
  const f = await fixture();
  try {
    let prompted = 0;
    const event = new f.window.Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => { prompted++; };
    event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });
    await act(async () => f.window.dispatchEvent(event));
    assert.equal(event.defaultPrevented, true);
    await f.click('Uygulamayı yükle');
    assert.equal(prompted, 1);
    await f.click('Kısayol ekle');
    assert.equal(prompted, 1);
    assert.ok(f.window.document.querySelector('[role="dialog"]'));
    await act(async () => f.window.dispatchEvent(new f.window.Event('appinstalled')));
    assert.equal(f.window.document.querySelector('[aria-label="Uygulama kısayolu"]'), null);
  } finally { await f.close(); }
});

test('shows iPhone and Android home screen instructions', async () => {
  for (const ua of ['Mozilla iPhone Safari', 'Mozilla Android Chrome']) {
    const f = await fixture({ ua });
    try {
      await f.click('Kısayol ekle');
      const dialog = f.window.document.querySelector('[role="dialog"]');
      assert.ok(dialog);
      assert.match(dialog.textContent, /Ana Ekrana Ekle|Ana ekrana ekle/);
      assert.match(dialog.textContent, ua.includes('iPhone') ? /Paylaş/ : /Chrome/);
    } finally { await f.close(); }
  }
});

test('does not offer installation inside installed app or file preview', async () => {
  for (const options of [{ installed: true }, { preview: true }]) {
    const f = await fixture(options);
    try { assert.equal(f.window.document.querySelector('[aria-label="Uygulama kısayolu"]'), null); }
    finally { await f.close(); }
  }
});

test('storage denial does not break shortcut interaction', async () => {
  const f = await fixture({ blockedStorage: true });
  try { await f.click('Daha sonra'); await f.click('Kısayol ekle'); assert.ok(f.window.document.querySelector('[role="dialog"]')); }
  finally { await f.close(); }
});
