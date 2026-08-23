const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const petRoutes = require('./routes/pet.routes');
const customerRoutes = require('./routes/customer.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const shopSettingsRoutes = require('./routes/shop-settings.routes');
const serviceRoutes = require('./routes/service.routes');
const dailyOperationsRoutes = require('./routes/daily-operations.routes');
const groomingRoutes = require('./routes/grooming.routes');
const boardingRoutes = require('./routes/boarding.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const { errorHandler } = require('./middleware/error-handler');

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', petRoutes);
app.use('/api', customerRoutes);
app.use('/api', appointmentRoutes);
app.use('/api', shopSettingsRoutes);
app.use('/api', serviceRoutes);
app.use('/api', dailyOperationsRoutes);
app.use('/api', groomingRoutes);
app.use('/api', boardingRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);

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
