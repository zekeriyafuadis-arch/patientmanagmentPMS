const { sendError } = require('../lib/apiResponse');

function formatZodError(error) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : 'body';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return sendError(res, req, 400, 'VALIDATION_ERROR', formatZodError(result.error));
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate, formatZodError };
