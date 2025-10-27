const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  console.log('--- checkAuth: Старт ---'); // <--- МАЯЧОК 1
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('--- checkAuth: Помилка - Відсутній заголовок ---');
      return res.status(401).json({ message: 'Відсутній токен авторизації' });
    }

    const token = authHeader.split(' ')[1]; 
    if (!token) {
      console.log('--- checkAuth: Помилка - Некоректний токен ---');
      return res.status(401).json({ message: 'Некоректний токен' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    
    console.log('--- checkAuth: Успіх ---'); // <--- МАЯЧОК 2
    next();
  } catch (error) {
    console.error('--- checkAuth: КРИТИЧНА ПОМИЛКА ---', error); // <--- МАЯЧОК 3
    return res.status(401).json({ message: 'Авторизація не вдалася' });
  }
};