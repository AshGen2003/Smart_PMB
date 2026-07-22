// Consistent error responder.
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const body = {
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL',
    },
  };
  if (err.details) body.error.details = err.details;
  if (status >= 500) console.error('[api-error]', err);
  res.status(status).json(body);
}

module.exports = { errorHandler };
