// Structured console-based logger adapter
function info(message) {
  console.log(message);
}

function error(message, errorObject) {
  if (errorObject) {
    console.error(message, errorObject);
  } else {
    console.error(message);
  }
}

module.exports = {
  info,
  error,
};
