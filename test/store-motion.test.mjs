import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/store-motion.js', import.meta.url), 'utf8');

function events() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    emit(type, detail = {}) { for (const callback of [...(listeners.get(type) || [])]) callback(detail); },
    count() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); }
  };
}
function panel() {
  const classes = new Set();
  return { classList: {
    add(...names) { names.forEach(name => classes.add(name)); },
    remove(...names) { names.forEach(name => classes.delete(name)); },
    toggle(name, state) { state ? classes.add(name) : classes.delete(name); },
    contains(name) { return classes.has(name); }
  } };
}
function page({ reduced = false, hidden = false, observerSupported = true } = {}) {
  const root = panel(), panels = [panel(), panel()];
  const preference = { ...events(), matches: reduced };
  const document = { ...events(), documentElement: root, hidden, querySelectorAll: () => panels };
  let observer;
  const window = { ...events(), matchMedia: () => preference };
  if (observerSupported) window.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; this.observed = new Set(); this.disconnects = 0; observer = this; }
    observe(target) { this.observed.add(target); }
    disconnect() { this.observed.clear(); this.disconnects++; }
    intersect(target, isIntersecting = true) { this.callback([{ target, isIntersecting }]); }
  };
  const context = vm.createContext({ window, document, IntersectionObserver: window.IntersectionObserver });
  vm.runInContext(source, context);
  return { root, panels, preference, document, window, observer, context };
}

test('reduced motion is static initially and reacts immediately to preference changes', () => {
  const p = page({ reduced: true });
  assert.equal(p.root.classList.contains('rc-motion-ready'), false);
  assert.equal(p.observer.observed.size, 0);
  p.preference.matches = false; p.preference.emit('change');
  assert.equal(p.root.classList.contains('rc-motion-ready'), true);
  assert.equal(p.observer.observed.size, 2);
  p.observer.intersect(p.panels[0]);
  assert.equal(p.panels[0].classList.contains('rc-motion-enter'), true);
  p.preference.matches = true; p.preference.emit('change');
  assert.equal(p.observer.observed.size, 0);
  assert.equal(p.panels[0].classList.contains('rc-motion-enter'), false);
  assert.equal(p.panels[0].classList.contains('rc-motion-visible'), false);
});

test('offscreen panels pause, and entrance runs only once without hiding content', () => {
  const p = page(), hero = p.panels[0];
  assert.equal(hero.classList.contains('rc-motion-enter'), false);
  p.observer.intersect(hero);
  assert.equal(hero.classList.contains('rc-motion-visible'), true);
  p.document.emit('animationend', { animationName: 'unrelated-animation', target: hero });
  assert.equal(hero.classList.contains('rc-motion-enter'), true);
  p.document.emit('animationend', { animationName: 'rc-arrive', target: hero });
  assert.equal(hero.classList.contains('rc-motion-enter'), false);
  p.observer.intersect(hero, false);
  assert.equal(hero.classList.contains('rc-motion-visible'), false);
  p.observer.intersect(hero);
  assert.equal(hero.classList.contains('rc-motion-enter'), false);
});

test('hidden tabs and back-forward cache suspend work; stale observer callbacks do nothing', () => {
  const p = page(), hero = p.panels[0];
  p.observer.intersect(hero);
  p.document.hidden = true; p.document.emit('visibilitychange');
  assert.equal(p.root.classList.contains('rc-motion-paused'), true);
  assert.equal(p.observer.observed.size, 0);
  p.observer.intersect(hero);
  assert.equal(hero.classList.contains('rc-motion-visible'), false);
  p.document.hidden = false; p.document.emit('visibilitychange');
  assert.equal(p.observer.observed.size, 2);
  p.window.emit('pagehide', { persisted: true });
  assert.equal(p.observer.observed.size, 0);
  p.document.emit('visibilitychange');
  assert.equal(p.observer.observed.size, 0);
  p.window.emit('pageshow', { persisted: true });
  assert.equal(p.observer.observed.size, 2);
});

test('cleanup disconnects all listeners and observers and duplicate includes do not double-bind', () => {
  const p = page();
  const controller = p.window.RCStoreMotion;
  vm.runInContext(source, p.context);
  assert.equal(p.window.RCStoreMotion, controller);
  assert.equal(p.document.count(), 2);
  assert.equal(p.window.count(), 2);
  assert.equal(p.preference.count(), 1);
  p.observer.intersect(p.panels[0]);
  controller.destroy(); controller.destroy();
  assert.equal(p.observer.observed.size, 0);
  assert.equal(p.document.count() + p.window.count() + p.preference.count(), 0);
  assert.equal(p.window.RCStoreMotion, undefined);
  assert.equal(p.root.classList.contains('rc-motion-ready'), false);
  assert.equal(p.panels[0].classList.contains('rc-motion-visible'), false);
  p.observer.intersect(p.panels[0]);
  assert.equal(p.panels[0].classList.contains('rc-motion-visible'), false);
});

test('an older browser without IntersectionObserver still starts and cleans up safely', () => {
  const p = page({ observerSupported: false });
  assert.ok(p.window.RCStoreMotion);
  assert.equal(p.panels.some(item => item.classList.contains('rc-motion-enter')), false);
  p.window.RCStoreMotion.destroy();
  assert.equal(p.document.count() + p.window.count() + p.preference.count(), 0);
});
