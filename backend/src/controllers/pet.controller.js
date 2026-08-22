const petService = require('../services/pet.service');

function sendSuccess(res, payload, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data: payload,
  });
}

async function listPets(req, res, next) {
  try {
    const pets = await petService.listPets(req.query);
    sendSuccess(res, pets);
  } catch (error) {
    next(error);
  }
}

async function getPet(req, res, next) {
  try {
    const pet = await petService.getPetById(req.params.id);
    sendSuccess(res, pet);
  } catch (error) {
    next(error);
  }
}

async function createPet(req, res, next) {
  try {
    const result = await petService.createPet(req.body);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

async function updatePet(req, res, next) {
  try {
    const result = await petService.updatePet(req.params.id, req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function activatePet(req, res, next) {
  try {
    const result = await petService.activatePet(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function deactivatePet(req, res, next) {
  try {
    const result = await petService.deactivatePet(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function listRelationships(req, res, next) {
  try {
    const result = await petService.listRelationships(req.params.petId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function addRelationship(req, res, next) {
  try {
    const result = await petService.addRelationship(req.params.petId, req.body);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

async function setPrimaryCustomer(req, res, next) {
  try {
    const result = await petService.setPrimaryCustomer(req.params.petId, req.params.customerId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

async function removeRelationship(req, res, next) {
  try {
    const result = await petService.removeCustomerRelationship(req.params.petId, req.params.customerId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  activatePet,
  addRelationship,
  createPet,
  deactivatePet,
  getPet,
  listPets,
  listRelationships,
  removeRelationship,
  setPrimaryCustomer,
  updatePet,
};
