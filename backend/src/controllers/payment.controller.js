const paymentService = require('../services/payment.service');

function send(res, data, status = 200) { res.status(status).json({ success: true, data }); }
async function listPayments(req, res, next) { try { send(res, await paymentService.getPayments(req.params.orderId)); } catch (error) { next(error); } }
async function createPayment(req, res, next) { try { send(res, await paymentService.createPayment(req.params.orderId, req.body || {}, req.auth.staff.id), 201); } catch (error) { next(error); } }
async function voidPayment(req, res, next) { try { send(res, await paymentService.voidPayment(req.params.paymentId, req.body || {}, req.auth.staff.id)); } catch (error) { next(error); } }
module.exports = { createPayment, listPayments, voidPayment };