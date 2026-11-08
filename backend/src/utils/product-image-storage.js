const { config } = require('../config/env');
const { createManagedImageStorage } = require('./managed-image-storage');

module.exports = createManagedImageStorage({
  getRoot: () => config.productImageStorageRoot,
  maxSize: 2 * 1024 * 1024,
  label: '商品',
});
