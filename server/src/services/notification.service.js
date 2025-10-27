let botInstance;

module.exports = {
  init: (bot) => {
    botInstance = bot;
  },
  sendNotification: async (telegramId, message) => {
    if (!botInstance) {
      console.error('Bot не ініціалізовано!');
      return;
    }
    try {
      await botInstance.telegram.sendMessage(telegramId, message);
    } catch (error) {
      console.error(`Помилка надсилання (${telegramId}): ${error.message}`);
    }
  },
  sendSwapRequest: async (telegramId, requester, subjectName, swapRequestId) => {
    if (!botInstance) {
      console.error('Bot не ініціалізовано!');
      return;
    }
    try {
      const message = `👋 Привіт!\nКористувач **${requester.firstName} ${requester.surname}** (@${requester.username}) хоче помінятися з вами місцями в черзі на предмет **${subjectName}**.\n\nЦей запит дійсний 15 хвилин.`;
      
      await botInstance.telegram.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Схвалити', callback_data: `swap_approve_${swapRequestId}` },
              { text: '❌ Відхилити', callback_data: `swap_reject_${swapRequestId}` }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error(`Помилка надсилання swap-запиту (${telegramId}): ${error.message}`);
    }
  },
};