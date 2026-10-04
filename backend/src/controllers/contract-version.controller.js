const contractVersionService = require('../services/contract-version.service');

function sendSuccess(res, payload, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data: payload,
  });
}

async function listContractVersions(req, res, next) {
  try {
    sendSuccess(res, await contractVersionService.listContractVersions());
  } catch (error) {
    next(error);
  }
}

async function getContractVersion(req, res, next) {
  try {
    sendSuccess(res, await contractVersionService.getContractVersion(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function createDraft(req, res, next) {
  try {
    sendSuccess(res, await contractVersionService.createDraft(req.body || {}), 201);
  } catch (error) {
    next(error);
  }
}

async function updateDraft(req, res, next) {
  try {
    sendSuccess(res, await contractVersionService.updateDraft(req.params.id, req.body || {}));
  } catch (error) {
    next(error);
  }
}

async function publishDraft(req, res, next) {
  try {
    sendSuccess(res, await contractVersionService.publishDraft(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function setCurrent(req, res, next) {
  try {
    sendSuccess(res, await contractVersionService.setCurrent(req.params.id));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createDraft,
  getContractVersion,
  listContractVersions,
  publishDraft,
  setCurrent,
  updateDraft,
};