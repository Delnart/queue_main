const Group = require('../../models/Group.model');
const User = require('../../models/User.model');
const crypto = require('crypto');
const notificationService = require('../../services/notification.service');
async function userHasGroup(userId) {
  const user = await User.findById(userId);
  if (user.groups.length > 0) return true;

  const pendingGroup = await Group.findOne({ monitor: userId, status: 'pending' });
  if (pendingGroup) return true;

  return false;
}

exports.requestGroupCreation = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({ message: 'Назва групи є обов\'язковою' });
    }

    if (await userHasGroup(userId)) {
      return res.status(403).json({ message: 'Ви вже в групі або очікуєте на схвалення' });
    }

    const invitationCode = crypto.randomBytes(4).toString('hex');

    const newGroup = new Group({
      name,
      monitor: userId,
      invitationCode,
      status: 'pending', 
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('❌ Помилка при запиті на групу:', error.message);
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

exports.joinGroup = async (req, res) => {
  try {
    const { invitationCode } = req.body;
    const userId = req.user.userId;
    
    if (await userHasGroup(userId)) {
      return res.status(403).json({ message: 'Ви вже в групі або очікуєте на схвалення' });
    }

    const group = await Group.findOne({ invitationCode, status: 'active' });
    if (!group) {
      return res.status(404).json({ message: 'Активну групу з таким кодом не знайдено' });
    }

    if (group.members.includes(userId) || group.pendingMembers.includes(userId)) {
      return res.status(400).json({ message: 'Ви вже є учасником або очікуєте на схвалення' });
    }
    
    await Group.findByIdAndUpdate(group._id, { $addToSet: { pendingMembers: userId } });

    // ---- ОСЬ ВИПРАВЛЕННЯ ----
    // Повертаємо правильне повідомлення, а не об'єкт групи
    res.status(200).json({ message: `Ваш запит на вступ до "${group.name}" надіслано старості.` });
    // ------------------------
  } catch (error) {
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.userId, status: 'active' });
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

exports.getMyPendingGroup = async (req, res) => {
  try {
    const group = await Group.findOne({ monitor: req.user.userId, status: 'pending' });
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

exports.getGroupManagementData = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate('members', 'firstName lastName username')
      .populate('pendingMembers', 'firstName lastName username');
      
    if (!group) {
      return res.status(404).json({ message: 'Групу не знайдено' });
    }
    
    if (group.monitor.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Тільки староста може керувати групою' });
    }
    
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

exports.approveMember = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const monitorId = req.user.userId;

    const group = await Group.findById(groupId);
    if (group.monitor.toString() !== monitorId) {
      return res.status(403).json({ message: 'Тільки староста може схвалювати заявки' });
    }
    
    const user = await User.findById(userId);
    if (user.groups.length > 0) {
       return res.status(400).json({ message: 'Студент вже перебуває в іншій групі' });
    }

    await Group.findByIdAndUpdate(groupId, {
      $addToSet: { members: userId },
      $pull: { pendingMembers: userId },
    });
    await User.findByIdAndUpdate(userId, {
      $addToSet: { groups: groupId },
    });
    await notificationService.sendNotification(user.telegramId, `🎉 Вас було прийнято до групи "${group.name}"!`);
    res.status(200).json({ message: 'Студента додано до групи' });
  } catch (error) {
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

exports.rejectMember = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const monitorId = req.user.userId;

    const group = await Group.findById(groupId);
    if (group.monitor.toString() !== monitorId) {
      return res.status(403).json({ message: 'Тільки староста може відхиляти заявки' });
    }

    await Group.findByIdAndUpdate(groupId, {
      $pull: { pendingMembers: userId },
    });
    
    res.status(200).json({ message: 'Заявку студента відхилено' });
  } catch (error) {
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};