const User = require('../../models/User.model');

exports.updateProfile = async (req, res) => {
  try {
    const { surname, patronymic, firstName } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        surname: surname || '',
        patronymic: patronymic || '',
        firstName: firstName || 'User', // На випадок, якщо юзер захоче змінити ім'я
      },
      { new: true }
    );
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};