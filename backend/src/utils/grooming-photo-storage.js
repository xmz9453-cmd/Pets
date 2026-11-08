const { config } = require('../config/env');
const { createManagedImageStorage } = require('./managed-image-storage');

module.exports = createManagedImageStorage({
  getRoot: () => config.groomingPhotoStorageRoot,
  maxSize: 2 * 1024 * 1024,
  label: '美容',
});
