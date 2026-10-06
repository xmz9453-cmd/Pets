const onboardingService = require('../services/onboarding.service');

function sendSuccess(res, payload, statusCode = 200) {
  res.status(statusCode).json({ success: true, data: payload });
}

async function create(req, res, next) {
  try {
    sendSuccess(res, await onboardingService.create(req.auth.staff.id), 201);
  } catch (error) {
    next(error);
  }
}

async function getPublic(req, res, next) {
  try {
    sendSuccess(res, await onboardingService.getPublic(req.params.token));
  } catch (error) {
    next(error);
  }
}

async function autosave(req, res, next) {
  try {
    sendSuccess(res, await onboardingService.autosave(req.params.token, req.body || {}));
  } catch (error) {
    next(error);
  }
}

async function searchCustomers(req, res, next) {
  try {
    sendSuccess(res, await onboardingService.searchCustomers(req.params.token, req.query.q));
  } catch (error) {
    next(error);
  }
}

async function searchPets(req, res, next) {
  try {
    sendSuccess(res, await onboardingService.searchPets(req.params.token, req.query.q));
  } catch (error) {
    next(error);
  }
}

async function resolveCustomer(req, res, next) {
  try {
    sendSuccess(res, await onboardingService.resolve(req.params.token, 'customer', req.body || {}));
  } catch (error) {
    next(error);
  }
}

async function resolvePet(req, res, next) {
  try {
    sendSuccess(res, await onboardingService.resolve(req.params.token, 'pet', req.body || {}));
  } catch (error) {
    next(error);
  }
}

async function getContractPdf(req, res, next) {
  try {
    const pdf = await onboardingService.getContractPdf(req.params.token);
    res.status(200)
      .type('application/pdf')
      .set('Content-Disposition', `inline; filename="contract.pdf"; filename*=UTF-8''${encodeURIComponent(pdf.file_name)}`)
      .send(pdf.bytes);
  } catch (error) {
    next(error);
  }
}

async function submit(req, res, next) {
  try {
    sendSuccess(res, await onboardingService.submit(req.params.token, req.body || {}));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  autosave,
  create,
  getContractPdf,
  getPublic,
  resolveCustomer,
  resolvePet,
  searchCustomers,
  searchPets,
  submit,
};
