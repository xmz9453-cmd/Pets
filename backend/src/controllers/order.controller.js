const orderService = require('../services/order.service');
function send(res, data, status = 200) { res.status(status).json({ success: true, data }); }
async function listOrders(req, res, next) { try { send(res, await orderService.listOrders(req.query || {})); } catch (error) { next(error); } }
async function getOrder(req, res, next) { try { send(res, await orderService.getOrder(req.params.id)); } catch (error) { next(error); } }
async function createOrder(req, res, next) { try { send(res, await orderService.createOrder(req.body || {}), 201); } catch (error) { next(error); } }
async function updateOrder(req, res, next) { try { send(res, await orderService.updateOrder(req.params.id, req.body || {})); } catch (error) { next(error); } }
async function deleteOrder(req, res, next) { try { send(res, await orderService.deleteOrder(req.params.id)); } catch (error) { next(error); } }
module.exports = { createOrder, deleteOrder, getOrder, listOrders, updateOrder };