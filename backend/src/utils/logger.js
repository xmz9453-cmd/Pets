function logInfo(message, context) {
  if (context) {
    console.info(message, context);
    return;
  }
  console.info(message);
}

function logError(message, error) {
  if (error) {
    console.error(message, error);
    return;
  }
  console.error(message);
}

module.exports = {
  logInfo,
  logError,
};
