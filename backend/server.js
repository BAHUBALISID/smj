require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

const uploadsDir = path.join(__dirname, 'uploads');
const billsDir = path.join(uploadsDir, 'bills');
const exchangesDir = path.join(uploadsDir, 'exchanges');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(billsDir)) fs.mkdirSync(billsDir);
if (!fs.existsSync(exchangesDir)) fs.mkdirSync(exchangesDir);

app.use('/uploads', express.static(uploadsDir));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/rates', require('./routes/rateRoutes'));
app.use('/api/bills', require('./routes/billRoutes'));
app.use('/api/exchanges', require('./routes/exchangeRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
