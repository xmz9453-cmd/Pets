const customerService = require('../services/customer.service');

function sendSuccess(res, payload, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data: payload,
  });
}

async function listCustomers(req, res, next) {
  try {
    const result = await customerService.listCustomers(req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function getCustomer(req, res, next) {
  try {
    const result = await customerService.getCustomerById(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function getContractPdf(req, res, next) {
  try {
    const pdf = await customerService.getContractPdf(req.params.id, req.params.historyId);
    res.status(200)
      .type('application/pdf')
      .set('Content-Disposition', `inline; filename="contract.pdf"; filename*=UTF-8''${encodeURIComponent(pdf.file_name)}`)
      .send(pdf.bytes);
  } catch (error) {
    next(error);
  }
}

async function getContractSignature(req, res, next) {
  try {
    const signature = await customerService.getContractSignature(req.params.id, req.params.historyId);
    res.status(200)
      .type('image/png')
      .send(signature);
  } catch (error) {
    next(error);
  }
}

async function createCustomer(req, res, next) {
  try {
    const result = await customerService.createCustomer(req.body || {});
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const result = await customerService.updateCustomer(req.params.id, req.body || {});
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function deactivateCustomer(req, res, next) {
  try {
    const result = await customerService.deactivateCustomer(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function reactivateCustomer(req, res, next) {
  try {
    const result = await customerService.reactivateCustomer(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const result = await customerService.deleteCustomer(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCustomer,
  deleteCustomer,
  deactivateCustomer,
  getCustomer,
  getContractPdf,
  getContractSignature,
  listCustomers,
  reactivateCustomer,
  updateCustomer,
};
