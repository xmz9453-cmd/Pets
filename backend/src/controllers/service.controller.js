const serviceService = require('../services/service.service');

function sendSuccess(res, data, statusCode = 200) { res.status(statusCode).json({ success: true, data }); }
async function listServices(req, res, next) { try { sendSuccess(res, await serviceService.listServices(req.query)); } catch (error) { next(error); } }
async function getService(req, res, next) { try { sendSuccess(res, await serviceService.getService(req.params.id)); } catch (error) { next(error); } }
async function createService(req, res, next) { try { sendSuccess(res, await serviceService.createService(req.body), 201); } catch (error) { next(error); } }
async function updateService(req, res, next) { try { sendSuccess(res, await serviceService.updateService(req.params.id, req.body)); } catch (error) { next(error); } }
async function deleteService(req, res, next) { try { sendSuccess(res, await serviceService.deleteService(req.params.id)); } catch (error) { next(error); } }
module.exports = { createService, deleteService, getService, listServices, updateService };