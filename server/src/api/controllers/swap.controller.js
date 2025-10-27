const SwapRequest = require('../../models/SwapRequest.model');
const Subject = require('../../models/Subject.model');
const User = require('../../models/User.model');
const notificationService = require('../../services/notification.service');

exports.requestSwap = async (req, res) => {
    try {
        const { subjectId, requestedUserId } = req.body;
        const requesterId = req.user.userId; // This is ObjectId from token

        const subject = await Subject.findById(subjectId);
        if (!subject) return res.status(404).json({ message: 'Предмет не знайдено' });

        const queue = (subject.settings && subject.settings.queueList) || [];
        const requesterInQueue = queue.some(e => e.user.equals(requesterId));
        const requestedInQueue = queue.some(e => e.user.equals(requestedUserId));

        if (!requesterInQueue || !requestedInQueue) {
            return res.status(400).json({ message: 'Обидва учасники обміну мають бути в черзі' });
        }

        // --- ВИПРАВЛЕННЯ ---
        // Шукаємо будь-який недавній запит (не тільки 'pending')
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const existingRequest = await SwapRequest.findOne({
            subject: subjectId,
            requester: requesterId,
            requested: requestedUserId,
            status: { $in: ['pending', 'expired'] }, // Check for pending or recently expired
            createdAt: { $gte: oneMinuteAgo } // Only block if created within the last minute
        });
        
        // Якщо знайшли недавній запит, блокуємо
        if (existingRequest) {
             return res.status(400).json({ message: 'Ви нещодавно вже надсилали запит цьому користувачу. Зачекайте хвилину.' });
        }
        // --- КІНЕЦЬ ВИПРАВЛЕННЯ ---

        const swapRequest = new SwapRequest({
            subject: subjectId,
            requester: requesterId,
            requested: requestedUserId, // Storing ObjectId here
        });
        await swapRequest.save();

        const requester = await User.findById(requesterId);
        const requested = await User.findById(requestedUserId); // Fetch user to get telegramId

        await notificationService.sendSwapRequest(
            requested.telegramId, // Use telegramId for notification
            requester, // Send requester's User object
            subject.name,
            swapRequest._id
        );

        res.status(201).json({ message: 'Запит на обмін надіслано' });
    } catch (error) {
        console.error('❌ Помилка при запиті на обмін:', error);
        res.status(500).json({ message: 'Внутрішня помилка сервера' });
    }
};