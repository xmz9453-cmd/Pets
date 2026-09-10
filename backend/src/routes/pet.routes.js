const express = require('express');
const petController = require('../controllers/pet.controller');
const { requireAuthentication } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/authorize');

const router = express.Router();

router.get('/pets', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']), petController.listPets);
router.get('/pets/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']), petController.getPet);
router.post('/pets', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), petController.createPet);
router.put('/pets/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), petController.updatePet);
router.delete('/pets/:id', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), petController.deletePet);
router.get('/pets/:petId/customers', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK', 'GROOMER']), petController.listRelationships);
router.post('/pets/:petId/customers', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), petController.addRelationship);
router.patch('/pets/:petId/customers/:customerId/primary', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), petController.setPrimaryCustomer);
router.delete('/pets/:petId/customers/:customerId', requireAuthentication, requireRole(['OWNER', 'FRONT_DESK']), petController.removeRelationship);

module.exports = router;
