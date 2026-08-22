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

module.exports = {
  createCustomer,
  deactivateCustomer,
  getCustomer,
  listCustomers,
  reactivateCustomer,
  updateCustomer,
};
