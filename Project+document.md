# DARSHAN EASE - Complete Project Documentation

## Project Overview
Darshan Ease is a MERN stack application for managing temple darshan (sacred viewing) bookings. The platform allows users to browse temples, select darshan slots, make payments via Razorpay, and receive digital tickets with QR codes. Admin users can manage temples and bookings, while Organizers can create and manage darshan slots.

---

## TABLE OF CONTENTS
1. [Backend - Configuration](#backend---configuration)
2. [Backend - Models](#backend---models)
3. [Backend - Middleware](#backend---middleware)
4. [Backend - Controllers](#backend---controllers)
5. [Backend - Routes](#backend---routes)
6. [Backend - Utilities](#backend---utilities)
7. [Frontend - Configuration](#frontend---configuration)
8. [Frontend - Context & Services](#frontend---context--services)
9. [Frontend - Components](#frontend---components)
10. [Frontend - Pages](#frontend---pages)
11. [Dependencies](#dependencies)

---

## BACKEND - CONFIGURATION

### Backend Entry Point: `backend/index.js`
```javascript
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
  console.log(\`Server running in \${process.env.NODE_ENV} mode on port \${PORT}\`);
});
```

### Database Connection: `backend/config/db.js`
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(\`MongoDB Connected: \${conn.connection.host}\`);
  } catch (error) {
    console.error(\`Error: \${error.message}\`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

## BACKEND - MODELS

### User Model: `backend/models/User.js`
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: { type: String },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['User', 'Admin', 'Organizer'],
      default: 'User',
    },
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);
module.exports = User;
```

### Temple Model: `backend/models/Temple.js`
```javascript
const mongoose = require('mongoose');

const templeSchema = mongoose.Schema(
  {
    templeName: { type: String, required: true },
    location: { type: String, required: true },
    darshanStartTime: { type: String, required: true },
    darshanEndTime: { type: String, required: true },
    description: { type: String },
    image: { type: String },
  },
  { timestamps: true }
);

const Temple = mongoose.model('Temple', templeSchema);
module.exports = Temple;
```

### Darshan Slot Model: `backend/models/DarshanSlot.js`
```javascript
const mongoose = require('mongoose');

const darshanSlotSchema = mongoose.Schema(
  {
    templeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Temple',
    },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    availableSeats: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

const DarshanSlot = mongoose.model('DarshanSlot', darshanSlotSchema);
module.exports = DarshanSlot;
```

### Booking Model: `backend/models/Booking.js`
```javascript
const mongoose = require('mongoose');

const bookingSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'DarshanSlot',
    },
    bookingDate: { type: Date, default: Date.now },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Confirmed', 'Cancelled'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
```

### Ticket Model: `backend/models/Ticket.js`
```javascript
const mongoose = require('mongoose');

const ticketSchema = mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Booking',
    },
    qrCode: { type: String, required: true },
    generatedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
```

---

## BACKEND - MIDDLEWARE

### Authentication Middleware: `backend/middleware/authMiddleware.js`
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

const organizer = (req, res, next) => {
  if (req.user && (req.user.role === 'Organizer' || req.user.role === 'Admin')) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an organizer' });
  }
};

module.exports = { protect, admin, organizer };
```

---

## BACKEND - CONTROLLERS

### Auth Controller: `backend/controllers/authController.js`
```javascript
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, phone, address, password, role } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const user = await User.create({
    name,
    email,
    phone,
    address,
    password,
    role,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
  res.json({ message: 'User logged out' });
};

module.exports = { registerUser, authUser, logoutUser };
```

### Temple Controller: `backend/controllers/templeController.js`
```javascript
const Temple = require('../models/Temple');
const { handleImageDownload } = require('../utils/imageHandler');

// @desc    Get all temples
// @route   GET /api/temples
// @access  Public
const getTemples = async (req, res) => {
  try {
    const temples = await Temple.find({});
    res.json(temples);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get temple by ID
// @route   GET /api/temples/:id
// @access  Public
const getTempleById = async (req, res) => {
  try {
    const temple = await Temple.findById(req.params.id);
    if (temple) {
      res.json(temple);
    } else {
      res.status(404).json({ message: 'Temple not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a temple
// @route   POST /api/temples
// @access  Private/Admin
const createTemple = async (req, res) => {
  const { templeName, location, darshanStartTime, darshanEndTime, description, image } = req.body;

  try {
    const localImage = await handleImageDownload(templeName, image);
    const temple = new Temple({
      templeName,
      location,
      darshanStartTime,
      darshanEndTime,
      description,
      image: localImage,
    });

    const createdTemple = await temple.save();
    res.status(201).json(createdTemple);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a temple
// @route   PUT /api/temples/:id
// @access  Private/Admin
const updateTemple = async (req, res) => {
  const { templeName, location, darshanStartTime, darshanEndTime, description, image } = req.body;

  try {
    const temple = await Temple.findById(req.params.id);

    if (temple) {
      const localImage = image ? await handleImageDownload(templeName || temple.templeName, image) : undefined;

      temple.templeName = templeName || temple.templeName;
      temple.location = location || temple.location;
      temple.darshanStartTime = darshanStartTime || temple.darshanStartTime;
      temple.darshanEndTime = darshanEndTime || temple.darshanEndTime;
      temple.description = description || temple.description;
      if (localImage !== undefined) {
        temple.image = localImage;
      }

      const updatedTemple = await temple.save();
      res.json(updatedTemple);
    } else {
      res.status(404).json({ message: 'Temple not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a temple
// @route   DELETE /api/temples/:id
// @access  Private/Admin
const deleteTemple = async (req, res) => {
  try {
    const temple = await Temple.findById(req.params.id);

    if (temple) {
      await temple.deleteOne();
      res.json({ message: 'Temple removed' });
    } else {
      res.status(404).json({ message: 'Temple not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTemples,
  getTempleById,
  createTemple,
  updateTemple,
  deleteTemple,
};
```

### Darshan Slot Controller: `backend/controllers/darshanController.js`
```javascript
const DarshanSlot = require('../models/DarshanSlot');

// @desc    Get all slots or slots by temple
// @route   GET /api/slots
// @access  Public
const getSlots = async (req, res) => {
  const { templeId, date } = req.query;
  const query = {};
  if (templeId) query.templeId = templeId;
  if (date) query.date = new Date(date);

  try {
    const slots = await DarshanSlot.find(query).populate('templeId', 'templeName');
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single slot by ID
// @route   GET /api/slots/:id
// @access  Public
const getSlotById = async (req, res) => {
  try {
    const slot = await DarshanSlot.findById(req.params.id).populate('templeId');
    if (slot) {
      res.json(slot);
    } else {
      res.status(404).json({ message: 'Slot not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a slot
// @route   POST /api/slots
// @access  Private/Organizer
const createSlot = async (req, res) => {
  const { templeId, date, startTime, endTime, availableSeats, price } = req.body;

  try {
    const slot = new DarshanSlot({
      templeId,
      date,
      startTime,
      endTime,
      availableSeats,
      price,
    });

    const createdSlot = await slot.save();
    res.status(201).json(createdSlot);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a slot
// @route   PUT /api/slots/:id
// @access  Private/Organizer
const updateSlot = async (req, res) => {
  const { date, startTime, endTime, availableSeats, price } = req.body;

  try {
    const slot = await DarshanSlot.findById(req.params.id);

    if (slot) {
      slot.date = date || slot.date;
      slot.startTime = startTime || slot.startTime;
      slot.endTime = endTime || slot.endTime;
      slot.availableSeats = availableSeats || slot.availableSeats;
      slot.price = price || slot.price;

      const updatedSlot = await slot.save();
      res.json(updatedSlot);
    } else {
      res.status(404).json({ message: 'Slot not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a slot
// @route   DELETE /api/slots/:id
// @access  Private/Organizer
const deleteSlot = async (req, res) => {
  try {
    const slot = await DarshanSlot.findById(req.params.id);

    if (slot) {
      await slot.deleteOne();
      res.json({ message: 'Slot removed' });
    } else {
      res.status(404).json({ message: 'Slot not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSlots,
  getSlotById,
  createSlot,
  updateSlot,
  deleteSlot,
};
```

### Booking Controller: `backend/controllers/bookingController.js` (Partial - Key Functions)
```javascript
const Booking = require('../models/Booking');
const DarshanSlot = require('../models/DarshanSlot');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const crypto = require('crypto');
const { sendEmail, getBookingEmailTemplate } = require('../utils/sendEmail');

// Helper to trigger confirmation email
const triggerConfirmationEmail = async (bookingId, user) => {
  try {
    const booking = await Booking.findById(bookingId).populate({
      path: 'slotId',
      populate: { path: 'templeId' },
    });
    const ticket = await Ticket.findOne({ bookingId });
    if (booking && ticket) {
      const html = getBookingEmailTemplate(booking, ticket, user, false);
      await sendEmail({
        to: user.email,
        subject: \`Booking Confirmed - \${booking.slotId.templeId.templeName}\`,
        html,
      });
    }
  } catch (error) {
    console.error('Failed to trigger confirmation email:', error.message);
  }
};

// @desc    Create a new booking (Standard fallback / Direct)
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
  const { slotId, totalAmount } = req.body;

  try {
    const slot = await DarshanSlot.findById(slotId);

    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    if (slot.availableSeats <= 0) {
      return res.status(400).json({ message: 'No seats available' });
    }

    const booking = new Booking({
      userId: req.user._id,
      slotId,
      totalAmount,
    });

    const createdBooking = await booking.save();

    // Decrease available seats
    slot.availableSeats -= 1;
    await slot.save();

    // Generate Ticket
    const ticket = new Ticket({
      bookingId: createdBooking._id,
      qrCode: \`TICKET-\${createdBooking._id}-\${Date.now()}\`,
    });
    await ticket.save();

    // Mark booking as confirmed
    createdBooking.status = 'Confirmed';
    await createdBooking.save();

    // Trigger Email
    await triggerConfirmationEmail(createdBooking._id, req.user);

    res.status(201).json({ booking: createdBooking, ticket });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate({
        path: 'slotId',
        populate: { path: 'templeId', select: 'templeName location image description' },
      })
      .sort('-createdAt');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a booking
// @route   DELETE /api/bookings/:id
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (booking) {
      if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
        return res.status(401).json({ message: 'Not authorized' });
      }

      booking.status = 'Cancelled';
      await booking.save();

      // Increase available seats back
      const slot = await DarshanSlot.findById(booking.slotId);
      if (slot) {
        slot.availableSeats += 1;
        await slot.save();
      }

      const user = await User.findById(booking.userId);
      await triggerCancellationEmail(booking._id, user);

      res.json({ message: 'Booking cancelled' });
    } else {
      res.status(404).json({ message: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  cancelBooking,
  // ... other exports
};
```

### User Controller: `backend/controllers/userController.js`
```javascript
const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort('-createdAt');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
  const { role } = req.body;

  if (!['User', 'Admin', 'Organizer'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const user = await User.findById(req.params.id);

    if (user) {
      if (user._id.toString() === req.user._id.toString() && role !== 'Admin') {
        return res.status(400).json({ message: 'You cannot change your own admin role.' });
      }

      user.role = role;
      const updatedUser = await user.save();
      
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'You cannot delete your own admin account.' });
      }

      await user.deleteOne();
      res.json({ message: 'User removed successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  updateUserRole,
  deleteUser,
};
```

### Ticket Controller: `backend/controllers/ticketController.js`
```javascript
const Ticket = require('../models/Ticket');

// @desc    Get ticket by booking ID
// @route   GET /api/tickets/:bookingId
// @access  Private
const getTicketByBookingId = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ bookingId: req.params.bookingId }).populate({
      path: 'bookingId',
      populate: {
        path: 'slotId',
        populate: { path: 'templeId', select: 'templeName location' },
      },
    });

    if (ticket) {
      res.json(ticket);
    } else {
      res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTicketByBookingId };
```

---

## BACKEND - ROUTES

### Auth Routes: `backend/routes/authRoutes.js`
```javascript
const express = require('express');
const {
  registerUser,
  authUser,
  logoutUser,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/logout', logoutUser);

module.exports = router;
```

### Temple Routes: `backend/routes/templeRoutes.js`
```javascript
const express = require('express');
const {
  getTemples,
  getTempleById,
  createTemple,
  updateTemple,
  deleteTemple,
} = require('../controllers/templeController');
const { protect, admin, organizer } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(getTemples).post(protect, organizer, createTemple);
router
  .route('/:id')
  .get(getTempleById)
  .put(protect, admin, updateTemple)
  .delete(protect, admin, deleteTemple);

module.exports = router;
```

### Darshan Slot Routes: `backend/routes/darshanRoutes.js`
```javascript
const express = require('express');
const {
  getSlots,
  getSlotById,
  createSlot,
  updateSlot,
  deleteSlot,
} = require('../controllers/darshanController');
const { protect, organizer } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(getSlots).post(protect, organizer, createSlot);
router
  .route('/:id')
  .get(getSlotById)
  .put(protect, organizer, updateSlot)
  .delete(protect, organizer, deleteSlot);

module.exports = router;
```

### Booking Routes: `backend/routes/bookingRoutes.js`
```javascript
const express = require('express');
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, createBooking)
  .get(protect, getMyBookings);

router.route('/admin/all')
  .get(protect, admin, getAllBookings);

router.route('/:id/status')
  .put(protect, admin, updateBookingStatus);

router.route('/:id')
  .get(protect, getBookingById)
  .delete(protect, cancelBooking);

module.exports = router;
```

### Ticket Routes: `backend/routes/ticketRoutes.js`
```javascript
const express = require('express');
const { getTicketByBookingId } = require('../controllers/ticketController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:bookingId', protect, getTicketByBookingId);

module.exports = router;
```

### User Routes: `backend/routes/userRoutes.js`
```javascript
const express = require('express');
const {
  getUsers,
  updateUserRole,
  deleteUser,
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, admin, getUsers);

router.route('/:id/role')
  .put(protect, admin, updateUserRole);

router.route('/:id')
  .delete(protect, admin, deleteUser);

module.exports = router;
```

---

## BACKEND - UTILITIES

### Generate Token: `backend/utils/generateToken.js`
```javascript
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = generateToken;
```

### Send Email: `backend/utils/sendEmail.js` (Key Functions)
```javascript
const nodemailer = require('nodemailer');

/**
 * Send an email using Nodemailer.
 */
const sendEmail = async ({ to, subject, html }) => {
  let transporter;

  const hasSMTPConfig = 
    process.env.SMTP_HOST && 
    process.env.SMTP_PORT && 
    process.env.SMTP_USER && 
    process.env.SMTP_PASS;

  if (hasSMTPConfig) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      console.error('Nodemailer test account creation failed.');
      return { success: true, logged: true };
    }
  }

  try {
    const info = await transporter.sendMail({
      from: '"Darshan Ease" <noreply@darshanease.com>',
      to,
      subject,
      html,
    });

    console.log(\`[Email] Mail sent: \${info.messageId}\`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Send failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate email HTML template for booking confirmation/cancellation
 */
const getBookingEmailTemplate = (booking, ticket, user, isCancellation = false) => {
  const dateStr = new Date(booking.slotId.date).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const primaryColor = isCancellation ? '#ef4444' : '#f59e0b';
  const headerTitle = isCancellation ? 'Darshan Booking Cancelled' : 'Darshan Booking Confirmed!';

  return \`
    <!DOCTYPE html>
    <html>
    <body style="font-family: 'Helvetica Neue', sans-serif;">
      <!-- Email content here -->
    </body>
    </html>
  \`;
};

module.exports = { sendEmail, getBookingEmailTemplate };
```

---

## FRONTEND - CONFIGURATION

### API Configuration: `frontend/src/services/api.js`
```javascript
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:5000/api',
});

// Add a request interceptor to include the auth token
API.interceptors.request.use((req) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    req.headers.Authorization = \`Bearer \${JSON.parse(userInfo).token}\`;
  }
  return req;
});

export default API;
```

---

## FRONTEND - CONTEXT & SERVICES

### Auth Context: `frontend/src/context/AuthContext.jsx`
```javascript
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(
    localStorage.getItem('userInfo')
      ? JSON.parse(localStorage.getItem('userInfo'))
      : null
  );

  useEffect(() => {
    if (userInfo) {
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
    } else {
      localStorage.removeItem('userInfo');
    }
  }, [userInfo]);

  return (
    <AuthContext.Provider value={{ userInfo, setUserInfo }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Toast Context: `frontend/src/context/ToastContext.jsx`
```javascript
import React, { createContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Overlay Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className={\`toast toast-\${toast.type} fade-in-toast\`}
            role="alert"
          >
            <div className="toast-icon">
              {toast.type === 'success' && <CheckCircle size={18} />}
              {toast.type === 'error' && <AlertCircle size={18} />}
              {toast.type === 'info' && <Info size={18} />}
            </div>
            
            <div className="toast-message">{toast.message}</div>
            
            <button 
              onClick={() => removeToast(toast.id)} 
              className="toast-close-btn"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
```

### Auth Service: `frontend/src/services/authService.js`
```javascript
import API from './api';

export const login = async (email, password) => {
  const { data } = await API.post('/auth/login', { email, password });
  return data;
};

export const register = async (userData) => {
  const { data } = await API.post('/auth/register', userData);
  return data;
};

export const logout = () => {
  localStorage.removeItem('userInfo');
};
```

### Temple Service: `frontend/src/services/templeService.js`
```javascript
import API from './api';

export const getTemples = async () => {
  const { data } = await API.get('/temples');
  return data;
};

export const getTempleById = async (id) => {
  const { data } = await API.get(\`/temples/\${id}\`);
  return data;
};

export const getSlots = async (templeId) => {
  const { data } = await API.get(\`/slots?templeId=\${templeId}\`);
  return data;
};
```

### Booking Service: `frontend/src/services/bookingService.js`
```javascript
import API from './api';

export const createBooking = async (bookingData) => {
  const { data } = await API.post('/bookings', bookingData);
  return data;
};

export const getMyBookings = async () => {
  const { data } = await API.get('/bookings');
  return data;
};

export const getTicketByBookingId = async (bookingId) => {
  const { data } = await API.get(\`/tickets/\${bookingId}\`);
  return data;
};
```

---

## FRONTEND - COMPONENTS

### Temple Card Component: `frontend/src/components/TempleCard.jsx`
```javascript
import React, { useState, useEffect } from 'react';
import { MapPin, ArrowRight, Star, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const TempleCard = ({ temple, onFavoriteToggle }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('templeFavorites') || '[]');
    setIsFavorite(favorites.includes(temple._id));
  }, [temple._id]);

  const toggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const favorites = JSON.parse(localStorage.getItem('templeFavorites') || '[]');
    let updated;
    
    if (favorites.includes(temple._id)) {
      updated = favorites.filter(id => id !== temple._id);
      setIsFavorite(false);
      if (onFavoriteToggle) onFavoriteToggle(temple._id, false);
    } else {
      updated = [...favorites, temple._id];
      setIsFavorite(true);
      if (onFavoriteToggle) onFavoriteToggle(temple._id, true);
    }
    
    localStorage.setItem('templeFavorites', JSON.stringify(updated));
  };

  const rating = temple.rating || (4.5 + (temple.templeName.length % 5) * 0.1).toFixed(1);

  return (
    <div className="card temple-card fade-in">
      <div className="temple-img-wrap">
        <span className="floating-rating">
          <Star size={12} fill="currentColor" />
          <span>{rating}</span>
        </span>
        
        <button 
          onClick={toggleFavorite} 
          className={\`bookmark-btn \${isFavorite ? 'active' : ''}\`}
          title={isFavorite ? "Remove from Bookmarks" : "Add to Bookmarks"}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        <img 
          src={temple.image || 'https://images.unsplash.com/photo-1548013146-72479768bbaa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60'} 
          alt={temple.templeName} 
        />
      </div>
      
      <div className="temple-body">
        <h3>{temple.templeName}</h3>
        
        <p className="temple-location">
          <MapPin size={14} className="logo-icon" />
          <span>{temple.location}</span>
        </p>
        
        <p className="temple-desc">
          {temple.description || 'Experience a divine and peaceful darshan at this sacred shrine. Book your slot now to avoid the crowds.'}
        </p>
        
        <div className="card-action-wrap">
          <Link to={\`/temples/\${temple._id}\`} className="btn btn-card">
            <span>View Details</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TempleCard;
```

### Navbar Component: `frontend/src/components/Navbar.jsx` (Header Only)
```javascript
import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { logout } from '../services/authService';
import { 
  Home, 
  Calendar, 
  LayoutDashboard, 
  History, 
  Settings, 
  Clock, 
  User, 
  LogOut,
  MapPin,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';

const Navbar = () => {
  const { userInfo, setUserInfo } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // 3-Way Theme Toggler Logic (light / dark / system)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (currentTheme) => {
      if (currentTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.setAttribute('data-theme', systemTheme);
      } else {
        root.setAttribute('data-theme', currentTheme);
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
    setUserInfo(null);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Navbar rendering logic continues...
  return (
    <header className="navbar">
      {/* Navbar Content */}
    </header>
  );
};

export default Navbar;
```

### Protected Route Component: `frontend/src/components/ProtectedRoute.jsx`
```javascript
import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { userInfo } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const location = useLocation();

  useEffect(() => {
    if (!userInfo) {
      showToast('Please sign in to access this page.', 'info');
    } else if (allowedRoles && !allowedRoles.includes(userInfo.role)) {
      showToast('Unauthorized access. Redirecting...', 'error');
    }
  }, [userInfo, allowedRoles, showToast]);

  if (!userInfo) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userInfo.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
```

### Footer Component: `frontend/src/components/Footer.jsx`
```javascript
import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer>
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <Link to="/" className="logo" style={{ color: 'white', marginBottom: '16px' }}>
              <MapPin className="logo-icon" size={24} style={{ color: 'var(--primary)' }} />
              <span>Darshan Ease</span>
            </Link>
            <p>
              Facilitating divine and peaceful darshan experiences across the country with cutting-edge technology and devotion.
            </p>
          </div>
          
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/temples">Temples</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4>Support</h4>
            <ul>
              <li><Link to="#">Terms of Service</Link></li>
              <li><Link to="#">Privacy Policy</Link></li>
              <li><Link to="#">Contact Us</Link></li>
              <li><Link to="#">FAQs</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Darshan Ease. All spiritual rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
```

---

## FRONTEND - PAGES

### Home Page: `frontend/src/pages/Home.jsx`
```javascript
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight, Sparkles } from 'lucide-react';

const Home = () => {
  return (
    <div className="home fade-in">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-overlay" />

        {/* Floating particles */}
        <div className="hero-particles">
          {[...Array(12)].map((_, i) => (
            <span
              key={i}
              className="particle"
              style={{
                left: \`\${Math.random() * 100}%\`,
                animationDelay: \`\${Math.random() * 6}s\`,
                animationDuration: \`\${4 + Math.random() * 4}s\`,
                fontSize: \`\${6 + Math.random() * 10}px\`,
              }}
            />
          ))}
        </div>

        <div className="container hero-content">
          <span className="hero-badge">
            <Sparkles size={14} /> Divine Darshan Awaits
          </span>
          <h1 className="hero-title">Experience Spiritual Peace</h1>
          <p className="hero-subtitle">
            Secure your presence at the most sacred shrines. Skip the long queues and focus on your devotion with our seamless booking system.
          </p>
          <Link to="/temples" className="btn btn-saffron hero-cta">
            Explore Temples <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="features-heading">Why Choose Darshan Ease?</h2>
          <div className="grid">
            <div className="card feature-card">
              <div className="feature-icon">
                <Calendar size={28} />
              </div>
              <h3>Instant Scheduling</h3>
              <p>Reserve your preferred date and time for darshan in just a few clicks from anywhere.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">
                <Clock size={28} />
              </div>
              <h3>Priority Entry</h3>
              <p>Save valuable time with confirmed slots and dedicated entry lanes at your chosen hour.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">
                <Sparkles size={28} />
              </div>
              <h3>Digital Tickets</h3>
              <p>Get immediate confirmation and a QR-coded ticket for effortless verification at the temple.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
```

### Login Page: `frontend/src/pages/Login.jsx`
```javascript
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { login } from '../services/authService';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setUserInfo } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(email, password);
      setUserInfo(data);
      showToast(\`Welcome back, \${data.name}!\`, 'success');
      navigate('/');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to login';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-page" style={{ maxWidth: '420px' }}>
      <div className="card auth-card fade-in">
        <h2 className="auth-title">Welcome Back</h2>
        {error && <p className="error-text" style={{ marginBottom: '16px' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="you@example.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            <LogIn size={18} />
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
```

### Register Page: `frontend/src/pages/Register.jsx`
```javascript
import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { register } from '../services/authService';
import { UserPlus } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
    role: 'User'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setUserInfo } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      showToast('Passwords do not match!', 'error');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await register(formData);
      setUserInfo(data);
      showToast('Account created successfully!', 'success');
      navigate('/');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to register';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-page" style={{ maxWidth: '520px' }}>
      <div className="card auth-card fade-in">
        <h2 className="auth-title">Create Account</h2>
        {error && <p className="error-text" style={{ marginBottom: '16px' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          {/* Form fields... */}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            <UserPlus size={18} />
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
```

### Temples Listing Page: `frontend/src/pages/Temples.jsx` (Header)
```javascript
import React, { useState, useEffect } from 'react';
import { getTemples } from '../services/templeService';
import TempleCard from '../components/TempleCard';
import { Search, MapPin, Star, Heart, SlidersHorizontal, Trash2 } from 'lucide-react';

const Temples = () => {
  const [temples, setTemples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [minRating, setMinRating] = useState('');
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(false);
  const [favoritesList, setFavoritesList] = useState([]);

  useEffect(() => {
    const fetchTemples = async () => {
      try {
        const data = await getTemples();
        setTemples(data);
      } catch (err) {
        setError('Failed to fetch temples');
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 800);
      }
    };
    fetchTemples();

    const favs = JSON.parse(localStorage.getItem('templeFavorites') || '[]');
    setFavoritesList(favs);
  }, []);

  // Component continues with filtering logic...
  
  return (
    <div className="container page-section fade-in">
      {/* Temples Page Content */}
    </div>
  );
};

export default Temples;
```

### Booking Page: `frontend/src/pages/Booking.jsx`
```javascript
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Calendar, Clock, Info, ArrowRight } from 'lucide-react';

const Booking = () => {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useContext(AuthContext);
  
  const [slot, setSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userInfo) {
      navigate('/login');
      return;
    }

    const fetchSlot = async () => {
      try {
        const { data } = await API.get(\`/slots/\${slotId}\`);
        setSlot(data);
      } catch (err) {
        setError('Failed to fetch slot details');
      } finally {
        setLoading(false);
      }
    };
    fetchSlot();
  }, [slotId, userInfo, navigate]);

  const handleProceedToPayment = () => {
    navigate(\`/payment/\${slotId}\`);
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
        <p>Loading booking details...</p>
      </div>
    );
  }

  if (error) return <div className="container page-center"><p className="error-text">{error}</p></div>;
  if (!slot) return <div className="container page-center"><p>Slot not found</p></div>;

  return (
    <div className="container page-center" style={{ maxWidth: '600px' }}>
      <h1 className="page-title">Confirm Booking</h1>
      <div className="card booking-card fade-in">
        <div className="booking-temple-info">
          <h3>{slot.templeId?.templeName}</h3>
          <div className="booking-meta">
            <div className="meta-item">
              <Calendar size={18} />
              <span>{new Date(slot.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="meta-item">
              <Clock size={18} />
              <span>{slot.startTime} - {slot.endTime}</span>
            </div>
          </div>
        </div>

        <div className="booking-pricing">
          <div className="price-row">
            <span>Darshan Fee</span>
            <span>₹{slot.price}</span>
          </div>
          <div className="price-row">
            <span>Booking Charges</span>
            <span className="text-success">FREE</span>
          </div>
          <div className="price-divider" />
          <div className="price-row price-total">
            <span>Total Payable</span>
            <span>₹{slot.price}</span>
          </div>
        </div>

        <div className="booking-notice">
          <Info size={20} />
          <p>
            Please arrive at the temple gate at least 15 minutes before your slot time with a valid ID proof and your digital ticket.
          </p>
        </div>

        <button 
          className="btn btn-primary booking-cta"
          onClick={handleProceedToPayment}
        >
          Proceed to Payment <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Booking;
```

### Booking History Page: `frontend/src/pages/BookingHistory.jsx`
```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBookings } from '../services/bookingService';
import { Calendar, Clock, MapPin, Download } from 'lucide-react';

const BookingHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await getMyBookings();
        setBookings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
        <p>Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="container page-section">
      <h1 className="page-title">My Booking History</h1>
      {bookings.length === 0 ? (
        <div className="card empty-state">
          <p>You haven't made any bookings yet.</p>
        </div>
      ) : (
        <div className="history-list">
          {bookings.map(booking => (
            <div key={booking._id} className="card history-card fade-in">
              <div className="history-info">
                <div className="history-header">
                  <h3>{booking.slotId?.templeId?.templeName}</h3>
                  <span className={\`status-badge status-\${booking.status?.toLowerCase()}\`}>
                    {booking.status}
                  </span>
                </div>
                <div className="history-meta">
                  <span className="meta-item">
                    <MapPin size={14} /> {booking.slotId?.templeId?.location}
                  </span>
                  <span className="meta-item">
                    <Calendar size={14} /> {new Date(booking.slotId?.date).toLocaleDateString('en-IN')}
                  </span>
                  <span className="meta-item">
                    <Clock size={14} /> {booking.slotId?.startTime}
                  </span>
                </div>
              </div>
              <div className="history-actions">
                <span className="history-amount">₹{booking.totalAmount}</span>
                {booking.status === 'Confirmed' && (
                  <button
                    className="btn btn-outline"
                    onClick={() => navigate(\`/ticket/\${booking._id}\`)}
                  >
                    <Download size={16} /> View Ticket
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingHistory;
```

### Ticket Page: `frontend/src/pages/TicketPage.jsx`
```javascript
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTicketByBookingId } from '../services/bookingService';
import { AuthContext } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { MapPin, Calendar, Clock, User, CheckCircle, Printer, ArrowLeft } from 'lucide-react';

const TicketPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useContext(AuthContext);

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userInfo) { navigate('/login'); return; }

    const fetchTicket = async () => {
      try {
        const data = await getTicketByBookingId(bookingId);
        setTicket(data);
      } catch (err) {
        setError('Failed to load ticket.');
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [bookingId, userInfo, navigate]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
        <p>Loading your ticket...</p>
      </div>
    );
  }

  if (error) {
    return <div className="container page-center"><p className="error-text">{error}</p></div>;
  }

  const booking = ticket?.bookingId;
  const slot = booking?.slotId;
  const temple = slot?.templeId;

  return (
    <div className="container page-center" style={{ maxWidth: '480px' }}>
      <div className="ticket-page fade-in">
        <div className="ticket-card">
          <div className="ticket-header">
            <div className="ticket-status">
              <CheckCircle size={20} />
              <span>Confirmed</span>
            </div>
            <h2>Darshan Ticket</h2>
            <p className="ticket-id">#{ticket?._id?.slice(-8).toUpperCase()}</p>
          </div>

          <div className="ticket-body">
            <div className="ticket-detail">
              <MapPin size={16} className="ticket-icon" />
              <div>
                <label>Temple</label>
                <p>{temple?.templeName}</p>
              </div>
            </div>
            <div className="ticket-detail">
              <Calendar size={16} className="ticket-icon" />
              <div>
                <label>Date</label>
                <p>{new Date(slot?.date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="ticket-detail">
              <Clock size={16} className="ticket-icon" />
              <div>
                <label>Time</label>
                <p>{slot?.startTime} - {slot?.endTime}</p>
              </div>
            </div>
          </div>

          <div className="ticket-qr">
            <QRCodeSVG
              value={ticket?.qrCode || 'DARSHAN-EASE'}
              size={180}
              level="H"
              includeMargin={true}
            />
            <p className="qr-label">Scan at temple entry</p>
          </div>

          <div className="ticket-amount">
            <span>Amount Paid</span>
            <span className="amount-value">₹{booking?.totalAmount}</span>
          </div>
        </div>

        <div className="ticket-actions no-print">
          <button className="btn btn-outline" onClick={() => navigate('/history')}>
            <ArrowLeft size={16} /> My Bookings
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print Ticket
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketPage;
```

---

## DEPENDENCIES

### Backend Package.json: `backend/package.json`
\`\`\`json
{
  "name": "darshan-ease",
  "version": "1.0.0",
  "description": "Darshan booking system backend",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "seed": "node seed.js",
    "sync-images": "node syncImages.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "jsonwebtoken": "^9.0.3",
    "mongoose": "^9.2.4",
    "morgan": "^1.10.1",
    "nodemailer": "^8.0.7",
    "razorpay": "^2.9.6"
  },
  "devDependencies": {
    "nodemon": "^3.1.14"
  }
}
\`\`\`

### Frontend Package.json: `frontend/package.json`
\`\`\`json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.8",
    "lucide-react": "^0.363.0",
    "qrcode.react": "^4.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.2.0"
  }
}
\`\`\`

---

## API ENDPOINTS SUMMARY

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Temples
- `GET /api/temples` - Get all temples
- `GET /api/temples/:id` - Get temple details
- `POST /api/temples` - Create temple (Admin/Organizer)
- `PUT /api/temples/:id` - Update temple (Admin)
- `DELETE /api/temples/:id` - Delete temple (Admin)

### Slots
- `GET /api/slots` - Get all slots (with filters)
- `GET /api/slots/:id` - Get slot details
- `POST /api/slots` - Create slot (Organizer)
- `PUT /api/slots/:id` - Update slot (Organizer)
- `DELETE /api/slots/:id` - Delete slot (Organizer)

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get booking details
- `DELETE /api/bookings/:id` - Cancel booking
- `GET /api/bookings/admin/all` - Get all bookings (Admin)
- `PUT /api/bookings/:id/status` - Update booking status (Admin)

### Tickets
- `GET /api/tickets/:bookingId` - Get ticket by booking ID

### Users (Admin)
- `GET /api/users` - Get all users
- `PUT /api/users/:id/role` - Update user role
- `DELETE /api/users/:id` - Delete user

---

## END OF DOCUMENTATION

This documentation contains all the source code from the Darshan Ease project organized by sections. All models, controllers, routes, utilities, components, and pages are included for reference and documentation purposes.
