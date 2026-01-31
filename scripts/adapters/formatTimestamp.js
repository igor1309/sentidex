function formatTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new TypeError(`Cannot format invalid date value: ${value}`);
  }

  return (
    date.getUTCFullYear() + '-' +
    String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(date.getUTCDate()).padStart(2, '0') + '-' +
    String(date.getUTCHours()).padStart(2, '0') + '-' +
    String(date.getUTCMinutes()).padStart(2, '0') + '-' +
    String(date.getUTCSeconds()).padStart(2, '0')
  );
}

module.exports = formatTimestamp;
