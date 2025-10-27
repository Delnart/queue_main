const Topic = require('../../models/Topic.model');
const Subject = require('../../models/Subject.model');
const Group = require('../../models/Group.model');

async function isMonitor(userId, subjectId) {
  const subject = await Subject.findById(subjectId).populate('group');
  if (!subject) throw new Error('Предмет не знайдено');
  return subject.group.monitor.toString() === userId;
}

exports.createTopic = async (req, res) => {
  try {
    const { name, subjectId, maxSlots } = req.body;
    if (!await isMonitor(req.user.userId, subjectId)) {
      return res.status(403).json({ message: 'Тільки староста може створювати теми' });
    }

    const newTopic = new Topic({
      name,
      subject: subjectId,
      maxSlots,
    });
    await newTopic.save();
    res.status(201).json(newTopic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTopicsForSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const topics = await Topic.find({ subject: subjectId }).populate('assignedUsers', 'firstName lastName');
    
    // ОСЬ ВИПРАВЛЕННЯ: Додаємо .populate('group'), щоб знати, хто староста
    const subject = await Subject.findById(subjectId).populate('group');
    
    res.status(200).json({ topics, subject });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.signUpForTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user.userId;

    const topic = await Topic.findById(topicId).populate('subject');
    if (!topic) {
      return res.status(404).json({ message: 'Тему не знайдено' });
    }

    if (topic.assignedUsers.length >= topic.maxSlots) {
      return res.status(400).json({ message: 'На цю тему вже зайняті всі місця' });
    }

    if (!topic.subject.settings.allowMultipleTopics) {
      const otherTopic = await Topic.findOne({ subject: topic.subject._id, assignedUsers: userId });
      if (otherTopic) {
        return res.status(400).json({ message: `Ви вже записані на іншу тему (${otherTopic.name}) у цьому предметі` });
      }
    }

    const updatedTopic = await Topic.findByIdAndUpdate(
      topicId,
      { $addToSet: { assignedUsers: userId } },
      { new: true }
    ).populate('assignedUsers', 'firstName lastName');

    res.status(200).json(updatedTopic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.leaveTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user.userId;
    
    const updatedTopic = await Topic.findByIdAndUpdate(
      topicId,
      { $pull: { assignedUsers: userId } },
      { new: true }
    ).populate('assignedUsers', 'firstName lastName');

    res.status(200).json(updatedTopic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};