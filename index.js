const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Morgan logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const templeRoutes = require('./routes/templeRoutes');
const darshanRoutes = require('./routes/darshanRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/temples', templeRoutes);
app.use('/api/slots', darshanRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tickets', ticketRoutes);

app.get('/', (req, res) => {
  res.send('Darshan Ease API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
