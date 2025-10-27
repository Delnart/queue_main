const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../../models/User.model');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;

exports.loginWithTelegram = async (req, res) => {
  console.log('--- loginWithTelegram: Старт ---'); // <--- МАЯЧОК 4
  try {
    const userData = req.body; 

    if (!checkTelegramHash(userData)) {
      console.log('--- loginWithTelegram: Помилка - Невірний hash ---');
      return res.status(403).json({ message: 'Помилка: Невірний hash. Дані підроблено.' });
    }

    const { id, first_name, last_name, username, photo_url } = userData;

    const user = await User.findOneAndUpdate(
      { telegramId: id },
      {
        $set: { 
          firstName: first_name,
          lastName: last_name,
          username: username,
          photoUrl: photo_url,
        },
        $setOnInsert: { 
          telegramId: id,
          role: 'student',
          // Додамо ПІБ як порожні рядки, щоб уникнути null
          surname: '', 
          patronymic: ''
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    console.log(`--- loginWithTelegram: Користувач ${user.username} знайдений/створений ---`);

    const token = jwt.sign(
      { userId: user._id, role: user.role, telegramId: user.telegramId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('--- loginWithTelegram: Токен створено ---'); // <--- МАЯЧОК 5

    res.status(200).json({ token, user });

  } catch (error) {
    console.error('--- loginWithTelegram: КРИТИЧНА ПОМИЛКА ---', error); // <--- МАЯЧОК 6
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

exports.getMe = async (req, res) => {
  console.log('--- getMe: Старт ---'); // <--- МАЯЧОК 7
  try {
    let userIdToFind = req.query.userId ? req.query.userId : req.user.userId;

    const user = await User.findById(userIdToFind).select('-__v -groups'); 

    if (!user) {
      console.log('--- getMe: Помилка - Користувача не знайдено ---');
      return res.status(404).json({ message: 'Користувача не знайдено' });
    }
    
    console.log('--- getMe: Успіх ---'); // <--- МАЯЧОК 8
    res.status(200).json(user);
    
  } catch (error) {
    console.error('--- getMe: КРИТИЧНА ПОМИЛКА ---', error); // <--- МАЯЧОК 9
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

function checkTelegramHash(userData) {
  const dataCheckString = Object.keys(userData)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${userData[key]}`)
    .join('\n');

  const secretKey = crypto
    .createHash('sha256')
    .update(BOT_TOKEN)
    .digest();

  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return hmac === userData.hash;
}