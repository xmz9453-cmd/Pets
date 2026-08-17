const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const { errorHandler } = require('./middleware/error-handler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Not found',
    },
  });
});

app.use(errorHandler);

module.exports = app;
