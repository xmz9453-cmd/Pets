const servicePackageService = require('../services/service-package.service');

function send(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

async function listPlans(req, res, next) {
  try {
    send(res, await servicePackageService.listPlans(req.query || {}));
  } catch (error) {
    next(error);
  }
}

async function createPlan(req, res, next) {
  try {
    send(res, await servicePackageService.createPlan(req.body || {}), 201);
  } catch (error) {
    next(error);
  }
}

async function updatePlan(req, res, next) {
  try {
    send(res, await servicePackageService.updatePlan(req.params.id, req.body || {}));
  } catch (error) {
    next(error);
  }
}

async function listCustomerPackages(req, res, next) {
  try {
    send(res, await servicePackageService.listCustomerPackages(req.params.customerId, req.query || {}));
  } catch (error) {
    next(error);
  }
}

async function purchasePackage(req, res, next) {
  try {
    send(res, await servicePackageService.purchasePackage(req.body || {}, req.auth.staff.id), 201);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPlan,
  listCustomerPackages,
  listPlans,
  purchasePackage,
  updatePlan,
};
