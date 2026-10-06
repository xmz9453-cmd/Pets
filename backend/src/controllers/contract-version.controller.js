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

async function uploadDraftPdf(req, res, next) {
  try {
    sendSuccess(res, await contractVersionService.uploadDraftPdf(req.params.id, req.file));
  } catch (error) {
    next(error);
  }
}

async function getContractVersionPdf(req, res, next) {
  try {
    const pdf = await contractVersionService.getContractVersionPdf(req.params.id);
    res.status(200)
      .type('application/pdf')
      .set('Content-Disposition', `inline; filename="contract.pdf"; filename*=UTF-8''${encodeURIComponent(pdf.file_name)}`)
      .send(pdf.bytes);
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
  getContractVersionPdf,
  getContractVersion,
  listContractVersions,
  publishDraft,
  setCurrent,
  updateDraft,
  uploadDraftPdf,
};