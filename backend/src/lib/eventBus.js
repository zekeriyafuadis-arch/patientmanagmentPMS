const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(200);

function publish(type, payload = {}) {
  const event = {
    type,
    timestamp: new Date().toISOString(),
    ...payload
  };
  bus.emit('event', event);
  return event;
}

function subscribe(handler) {
  bus.on('event', handler);
  return () => bus.off('event', handler);
}

module.exports = { publish, subscribe, bus };
