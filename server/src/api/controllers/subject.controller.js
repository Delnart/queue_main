const Subject = require('../../models/Subject.model');
const Group = require('../../models/Group.model');
const User = require('../../models/User.model');
const notificationService = require('../../services/notification.service');

exports.createSubject = async (req, res) => {
  try {
    const { name, groupId, isQueueEnabled } = req.body;
    const monitorId = req.user.userId;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Групу не знайдено' });

    if (group.monitor.toString() !== monitorId) {
      return res.status(403).json({ message: 'Тільки староста цієї групи може додавати предмети' });
    }

    const newSubject = new Subject({
      name,
      group: groupId,
      'settings.isQueueEnabled': isQueueEnabled,
    });

    await newSubject.save();
    res.status(201).json(newSubject);
  } catch (error) {
    console.error('❌ Помилка при створенні предмету:', error);
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

exports.getSubjectsForGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Групу не знайдено' });

    if (!group.members.includes(req.user.userId) && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Ви не є учасником цієї групи' });
    }

    const subjects = await Subject.find({ group: groupId });
    res.status(200).json({ group, subjects });
  } catch (error) {
    res.status(500).json({ message: 'Внутрішня помилка сервера' });
  }
};

// --- НОВА ЛОГІКА ЧЕРГ ---

exports.joinQueue = async (req, res) => {
  try {
    const { subjectId, labInfo } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user.surname || user.surname.trim().length === 0 || 
        !user.firstName || user.firstName.trim().length === 0) {
      return res.status(400).json({ message: 'Помилка: ви не заповнили Прізвище та Ім\'я у профілі.' });
    }
    
    if (!labInfo) {
      return res.status(400).json({ message: 'Помилка: вкажіть, яку лабу ви здаєте.' });
    }

    const subject = await Subject.findById(subjectId);
    const settings = subject.settings || {};
    const queueList = settings.queueList || [];
    
    const isInQueue = queueList.some(entry => entry.user.equals(userId));
    
    // Перевірка на allowMultipleEntries
    if (isInQueue && !settings.allowMultipleEntries) {
      return res.status(400).json({ message: 'Ви вже у цій черзі (і повторний запис вимкнено)' });
    }

    // --- ЛОГІКА maxLabStep ---
    if (settings.maxLabStep > 0) {
      const currentLabNum = parseInt(labInfo.match(/\d+/)?.[0], 10); // Витягуємо перше число з labInfo
      if (!isNaN(currentLabNum)) { // Перевіряємо, чи вдалося витягти число
        let minLabNum = Infinity;
        let queueHasEntries = false;
        
        queueList.forEach(entry => {
          const entryLabNum = parseInt(entry.labInfo.match(/\d+/)?.[0], 10);
          if (!isNaN(entryLabNum)) {
             queueHasEntries = true;
             minLabNum = Math.min(minLabNum, entryLabNum);
          }
        });

        // Якщо черга не порожня І ми намагаємось здати лабу, що випереджає мінімальну + крок
        if (queueHasEntries && currentLabNum > minLabNum + settings.maxLabStep) {
          return res.status(400).json({ 
            message: `Помилка: не можна здавати лабу ${currentLabNum}, поки мінімальна нездана лаба в черзі - ${minLabNum}. Максимальний крок: +${settings.maxLabStep}.` 
          });
        }
      } else {
         console.warn(`Could not parse lab number from "${labInfo}" for maxLabStep check.`);
         // Можна або видавати помилку, або ігнорувати правило для нечислових labInfo
         // return res.status(400).json({ message: 'Не вдалося визначити номер лаби для перевірки кроку.' });
      }
    }
    // --- КІНЕЦЬ ЛОГІКИ maxLabStep ---

    const queueEntry = { user: userId, labInfo };
    
    const updatedSubject = await Subject.findByIdAndUpdate(
      subjectId,
      { $push: { 'settings.queueList': queueEntry } },
      { new: true }
    );
    
    // Повертаємо оновлену чергу (треба знову populate, бо $push не робить це)
     const finalSubject = await Subject.findById(subjectId);
     const populatedQueueList = await Promise.all(
        (finalSubject.settings.queueList || []).map(async (entry) => {
             const userData = await User.findById(entry.user).select('firstName surname patronymic');
             return { ...entry.toObject(), user: userData }; // Конвертуємо в об'єкт перед додаванням user data
         })
     );

    res.status(200).json(populatedQueueList); // Повертаємо населену чергу
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.leaveQueue = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.user.userId;
    
    await Subject.findByIdAndUpdate(
      subjectId,
      { $pull: { 'settings.queueList': { user: userId } } }
    );
    
    res.status(200).json({ message: 'Ви вийшли з черги' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.manageNext = async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    await Subject.findByIdAndUpdate(
      subjectId,
      { $pop: { 'settings.queueList': -1 } }
    );
    
    res.status(200).json({ message: 'OK' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.manageRemove = async (req, res) => {
  try {
    const { subjectId, userId } = req.body;
    
    const subject = await Subject.findById(subjectId);
    const entry = subject.settings.queueList.find(e => e.user.equals(userId));
    
    if (entry) {
      await Subject.findByIdAndUpdate(
        subjectId,
        { $pull: { 'settings.queueList': { user: userId } } }
      );
      
      const userToNotify = await User.findById(userId);
      await notificationService.sendNotification(
        userToNotify.telegramId,
        `Вас було видалено з черги на предмет "${subject.name}" старостою.`
      );
    }
    
    res.status(200).json({ message: 'OK' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSubjectSettings = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const subject = await Subject.findById(subjectId).populate('group'); // Populate group to check monitor later
    if (!subject) {
      return res.status(404).json({ message: 'Предмет не знайдено' });
    }
    // Перевірка прав доступу (будь-який учасник групи може бачити)
    if (!subject.group.members.includes(req.user.userId) && req.user.role !== 'super_admin') {
       return res.status(403).json({ message: 'Доступ заборонено' });
    }
    res.status(200).json(subject.settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSubjectSettings = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { isQueueEnabled, allowMultipleEntries, maxLabStep } = req.body;
    
    // Перевіряємо, чи юзер є старостою цього предмета
    if (!await isMonitor(req.user.userId, subjectId)) {
       return res.status(403).json({ message: 'Тільки староста може змінювати налаштування' });
    }

    const updatedSubject = await Subject.findByIdAndUpdate(
      subjectId,
      { 
        'settings.isQueueEnabled': isQueueEnabled,
        // ---- ВИПРАВЛЕННЯ: ДОДАНО ЦЕЙ РЯДОК ----
        'settings.allowMultipleEntries': allowMultipleEntries, 
        // ----------------------------------------
        'settings.maxLabStep': maxLabStep,
      },
      { new: true }
    );

    res.status(200).json(updatedSubject.settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function isMonitor(userId, subjectId) {
  const subject = await Subject.findById(subjectId).populate('group');
  if (!subject) throw new Error('Предмет не знайдено');
  return subject.group.monitor.toString() === userId;
}