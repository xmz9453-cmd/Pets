const reportRepository = require('../data/report.repository');

function validation(fields) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  error.fields = fields;
  return error;
}

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function getDateRange(query = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const startDate = query.start_date || today;
  const endDate = query.end_date || today;
  const fields = {};

  if (!isDate(startDate)) fields.start_date = '開始日期格式無效';
  if (!isDate(endDate)) fields.end_date = '結束日期格式無效';
  if (!Object.keys(fields).length && startDate > endDate) fields.date_range = '開始日期不得晚於結束日期';
  if (Object.keys(fields).length) throw validation(fields);
  return { startDate, endDate };
}

async function getReport(query) {
  return reportRepository.getReport(getDateRange(query));
}

module.exports = { getReport };