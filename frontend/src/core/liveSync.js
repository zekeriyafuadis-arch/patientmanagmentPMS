import { API_BASE } from '../config/api.js';
import { getToken } from '../api/client.js';
import { eventBus } from './eventBus.js';

let source = null;
let reconnectTimer = null;

function mapServerEvent(event) {
  if (!event?.type) return;
  const [entity, action] = event.type.split('.');
  eventBus.emit('data:changed', {
    entity: entity || 'unknown',
    action: action || 'updated',
    id: event.id,
    source: 'sse',
    raw: event
  });
  if (entity === 'alerts') {
    eventBus.emit('alerts:changed', event);
  }
}

export function startLiveSync() {
  stopLiveSync();
  const token = getToken();
  if (!token) return;

  const url = `${API_BASE}/events/stream?token=${encodeURIComponent(token)}`;
  source = new EventSource(url);

  source.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (data.type === 'connected') return;
      mapServerEvent(data);
    } catch {
      /* ignore malformed */
    }
  };

  source.onerror = () => {
    source?.close();
    source = null;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      if (getToken()) startLiveSync();
    }, 5000);
  };
}

export function stopLiveSync() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (source) {
    source.close();
    source = null;
  }
}
