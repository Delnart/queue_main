const Group = require('../../models/Group.model');
const User = require('../../models/User.model');
const notificationService = require('../../services/notification.service');
exports.getPendingGroups = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Доступ заборонено' });
    }
    const groups = await Group.find({ status: 'pending' }).populate('monitor', 'firstName lastName username');
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

exports.approveGroup = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Доступ заборонено' });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Групу не знайдено' });
    }

    const monitorId = group.monitor;
    const monitor = await User.findById(monitorId);
    
    if (!monitor) {
      await Group.findByIdAndDelete(req.params.groupId);
      return res.status(404).json({ message: 'Користувача, що створив запит, не знайдено' });
    }
    
    if (monitor.groups.length > 0) {
      await Group.findByIdAndDelete(req.params.groupId);
      return res.status(400).json({ message: 'Цей юзер вже є учасником іншої групи' });
    }

    await group.updateOne({
      status: 'active',
      $addToSet: { members: monitorId }
    });

    // ---- ОСЬ ВИПРАВЛЕННЯ ----
    // Встановлюємо роль "monitor", ТІЛЬКИ ЯКЩО юзер не super_admin
    const newRole = monitor.role === 'super_admin' ? 'super_admin' : 'monitor';
    // ------------------------

    await User.findByIdAndUpdate(monitorId, {
      role: newRole, // <-- тут використовуємо нову змінну
      $addToSet: { groups: group._id }
    });
    await notificationService.sendNotification(monitor.telegramId, `🎉 Ваш запит на створення групи "${group.name}" було СХВАЛЕНО!`);
    res.status(200).json({ message: 'Групу схвалено' });
  } catch (error) {
    console.error('❌ Помилка при схваленні групи:', error);
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

exports.rejectGroup = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Доступ заборонено' });
    }
    
    await Group.findByIdAndDelete(req.params.groupId);
    res.status(200).json({ message: 'Запит відхилено' });
  } catch (error) {
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};