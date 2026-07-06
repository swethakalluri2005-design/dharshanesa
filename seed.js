const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const User = require('./models/User');
const Temple = require('./models/Temple');
const DarshanSlot = require('./models/DarshanSlot');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const seed = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Temple.deleteMany();
    await DarshanSlot.deleteMany();

    // Create Admin
    const admin = await User.create({
      name: 'Master Admin',
      email: 'admin@darshan.com',
      phone: '1234567890',
      password: 'password123',
      role: 'Admin'
    });

    // Create Organizer
    const organizer = await User.create({
      name: 'Temple Organizer',
      email: 'organizer@temple.com',
      phone: '0987654321',
      password: 'password123',
      role: 'Organizer'
    });

    // Read the dynamically generated temple data with real Wikipedia images
    const rawData = fs.readFileSync('templeDataLocal.json');
    const templesWithImages = JSON.parse(rawData);

    const coordMap = {
      "Ram Mandir": { lat: 26.7956, lng: 82.1943 },
      "Badrinath Temple": { lat: 30.7447, lng: 79.4912 },
      "Sun Temple": { lat: 19.8876, lng: 86.0945 },
      "Brihadeeswara Temple": { lat: 10.7828, lng: 79.1318 },
      "Somnath Temple": { lat: 20.8880, lng: 70.4012 },
      "Kedarnath Temple": { lat: 30.7352, lng: 79.0669 },
      "Sanchi Stupa": { lat: 23.4793, lng: 77.7396 },
      "Ramanathaswamy Temple": { lat: 9.2881, lng: 79.3174 },
      "Vaishno Devi Temple": { lat: 32.9934, lng: 74.9547 },
      "Siddhivinayak Temple": { lat: 19.0166, lng: 72.8302 },
      "Gangotri Temple": { lat: 30.9944, lng: 78.9398 },
      "Golden Temple": { lat: 31.6200, lng: 74.8765 },
      "Kashi Vishwanath Temple": { lat: 25.3109, lng: 83.0104 },
      "Shri Jagannath Temple": { lat: 19.8049, lng: 85.8179 },
      "Yamunotri Temple": { lat: 31.0142, lng: 78.4593 },
      "Meenakshi Temple": { lat: 9.9195, lng: 78.1193 },
      "Amarnath Cave Temple": { lat: 34.2155, lng: 75.5189 },
      "Lingaraja Temple": { lat: 20.2382, lng: 85.8338 },
      "Tirupati Balaji Temple": { lat: 13.6833, lng: 79.3474 },
      "Kanchipuram Temples": { lat: 12.8387, lng: 79.7016 },
      "Khajuraho Temple": { lat: 24.8519, lng: 79.9234 },
      "Virupaksha Temple": { lat: 15.3350, lng: 76.4620 },
      "Akshardham Temple": { lat: 28.6127, lng: 77.2773 },
      "Shri Digambar Jain Lal Mandir": { lat: 28.6562, lng: 77.2343 },
      "Mahavir Mandir": { lat: 25.6025, lng: 85.1272 },
      "Ranakpur Temple": { lat: 25.1147, lng: 73.4727 },
      "Shirdi Sai Baba Temple": { lat: 19.7667, lng: 74.4764 },
      "Shri Padmanabhaswamy Temple": { lat: 8.4830, lng: 76.9436 },
      "Dwarkadhish Temple": { lat: 22.2442, lng: 68.9684 },
      "Laxminarayan Temple": { lat: 28.6327, lng: 77.2006 },
      "Iskcon Temple": { lat: 27.5714, lng: 77.6749 },
      "Mahabodhi Temple": { lat: 24.6951, lng: 84.9914 },
      "Kamakhya Temple": { lat: 26.1663, lng: 91.7058 },
      "Neelkanth Mahadev Temple": { lat: 30.0768, lng: 78.3496 },
      "Mukteswara Temple": { lat: 20.2427, lng: 85.8427 },
      "Sri Ranganathaswamy Temple": { lat: 10.8623, lng: 78.6904 },
      "Khatushyam Baba Temple": { lat: 27.3697, lng: 75.3999 },
      "Salasar Balaji Temple": { lat: 27.7317, lng: 75.0270 },
      "Dilwara Jain Temple": { lat: 24.6117, lng: 72.7230 },
      "Shri Mahakaleshwar Temple": { lat: 23.1827, lng: 75.7682 }
    };

    const mappedTemples = templesWithImages.map((t) => {
      const coords = coordMap[t.templeName] || { lat: 20.5937, lng: 78.9629 };
      return {
        templeName: t.templeName,
        location: t.location,
        darshanStartTime: '06:00',
        darshanEndTime: '21:00',
        description: `The sacred ${t.templeName} located in ${t.location}. A beautiful place of worship and spiritual peace.`,
        image: t.image,
        latitude: coords.lat,
        longitude: coords.lng
      };
    });

    const createdTemples = await Temple.insertMany(mappedTemples);

    // Create Sample Slots for the first 3 temples so we have some active booking options available
    for (let i = 0; i < 3; i++) {
        const today = new Date();
        await DarshanSlot.create({
          templeId: createdTemples[i]._id,
          date: new Date(today.setDate(today.getDate() + 1)),
          startTime: '08:00',
          endTime: '09:00',
          availableSeats: 50,
          price: 151
        });

        await DarshanSlot.create({
          templeId: createdTemples[i]._id,
          date: new Date(today.setDate(today.getDate() + 1)),
          startTime: '10:00',
          endTime: '11:00',
          availableSeats: 120,
          price: 101
        });
    }

    console.log('Data Seeded Successfully');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seed();
