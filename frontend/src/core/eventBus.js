const listeners = new Map();

function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => listeners.get(event)?.delete(handler);
}

function emit(event, detail = {}) {
  window.dispatchEvent(new CustomEvent(`pms:${event}`, { detail }));
  const handlers = listeners.get(event);
  if (handlers) {
    handlers.forEach((fn) => {
      try { fn(detail); } catch (e) { console.warn('eventBus handler error', e); }
    });
  }
}

export const eventBus = { on, emit };
