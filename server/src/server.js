// server/src/server.js

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

console.log('--- Server: Script Start ---'); // <-- Log 1

// ---- LOAD .env ASAP ----
dotenv.config();
console.log('--- Server: dotenv loaded ---'); // <-- Log 2
console.log('--- Server: BOT_TOKEN exists:', !!process.env.TELEGRAM_BOT_TOKEN); // <-- Log 3
console.log('--- Server: JWT_SECRET exists:', !!process.env.JWT_SECRET); // <-- Log 4
// -------------------------

// ---- IMPORT ROUTES ----
console.log('--- Server: Importing routes... ---'); // <-- Log 5
const authRoutes = require('./api/routes/auth.routes');
const groupRoutes = require('./api/routes/group.routes.js');
const adminRoutes = require('./api/routes/admin.routes.js');
const subjectRoutes = require('./api/routes/subject.routes.js');
const topicRoutes = require('./api/routes/topic.routes.js');
const profileRoutes = require('./api/routes/profile.routes.js');
const swapRoutes = require('./api/routes/swap.routes.js');

// -------------------------

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// --------------------

// DB Connection Function (no changes)
async function connectToDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Підключено до MongoDB!');
  } catch (error) {
    console.error('❌ Помилка підключення до MongoDB:', error.message);
    process.exit(1);
  }
}
connectToDb();

// ---- CONNECT ROUTES ----
console.log('--- Server: Connecting routes... ---'); // <-- Log 11
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/swap', swapRoutes);
console.log('--- Server: Routes connected ---'); // <-- Log 12
// -------------------------

// Test route (no changes)
app.get('/', (req, res) => {
  res.send('Привіт, це мій сервер! І він підключений до БД!');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Сервер успішно запущено на порту ${PORT}`); // <-- Log 13
});

const bot = require('./bot/bot.js');
const notificationService = require('./services/notification.service');
notificationService.init(bot);
