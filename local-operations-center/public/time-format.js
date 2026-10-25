'use strict';

function formatTaipeiTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '無法確認';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${fields.year}-${fields.month}-${fields.day} ${fields.hour}:${fields.minute}:${fields.second}`;
}

function formatBackupOption(name) {
  const match = /^pets_backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.tar\.gz$/.exec(String(name));
  if (!match) return String(name);
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}（台灣時間）　${name}`;
}

const OperationsTime = Object.freeze({ formatTaipeiTimestamp, formatBackupOption });
if (typeof module !== 'undefined' && module.exports) module.exports = OperationsTime;
if (typeof window !== 'undefined') window.OperationsTime = OperationsTime;
