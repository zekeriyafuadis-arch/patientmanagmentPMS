function meta(req, extra = {}) {
  return {
    requestId: req?.id || null,
    timestamp: new Date().toISOString(),
    ...extra
  };
}

function success(req, data, extraMeta = {}) {
  return {
    success: true,
    data,
    meta: meta(req, extraMeta)
  };
}

function list(req, data, extraMeta = {}) {
  return {
    success: true,
    data,
    meta: meta(req, extraMeta)
  };
}

function fail(req, message, code = 'ERROR', status = 400) {
  const err = new Error(typeof message === 'string' ? message : message?.message || 'Request failed');
  err.status = status;
  err.code = code;
  err.expose = true;
  return err;
}

function sendError(res, req, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message },
    meta: meta(req)
  });
}

module.exports = { success, list, fail, sendError, meta };
