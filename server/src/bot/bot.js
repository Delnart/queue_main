const { Telegraf, Scenes, session } = require('telegraf');
const User = require('../models/User.model');
const notificationService = require('../services/notification.service');
const SwapRequest = require('../models/SwapRequest.model');
const Subject = require('../models/Subject.model');
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Сцена для вводу ПІБ
const pibScene = new Scenes.WizardScene(
  'pib-wizard',
  async (ctx) => {
    await ctx.reply('Введіть ваше **Прізвище**:', { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.surname = ctx.message.text;
    await ctx.reply('Введіть ваше **По-батькові**:', { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.patronymic = ctx.message.text;
    const { surname, patronymic } = ctx.wizard.state;
    
    try {
      await User.findOneAndUpdate(
        { telegramId: ctx.from.id },
        { surname, patronymic, firstName: ctx.from.first_name },
        { upsert: true }
      );
      await ctx.reply('Дякую! Ваше ПІБ збережено. Тепер ви можете користуватись повним функціоналом на сайті.');
    } catch (error) {
      await ctx.reply('Сталася помилка. Спробуйте пізніше.');
    }
    return ctx.scene.leave();
  }
);

const stage = new Scenes.Stage([pibScene]);
bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => {
  const telegramId = ctx.from.id;
  let user = await User.findOne({ telegramId });

  if (!user) {
    user = await new User({
      telegramId,
      firstName: ctx.from.first_name,
      username: ctx.from.username,
    }).save();
    
    await ctx.reply('👋 Вітаю у системі черг!\nВи успішно зареєструвались.');
    await notificationService.sendNotification(telegramId, 'Це тестове сповіщення!');
  }
  
  if (!user.surname || !user.patronymic) {
    await ctx.reply('Схоже, у вас не заповнено ПІБ. Це необхідно для запису в черги.');
    return ctx.scene.enter('pib-wizard');
  }

  await ctx.reply(`Вітаю, ${user.firstName}! Ви вже зареєстровані.`);
});
// Обробка кнопки "СХВАЛИТИ"
bot.action(/swap_approve_(.+)/, async (ctx) => {
    const swapRequestId = ctx.match[1];
    const requestedTelegramId = ctx.from.id; // Telegram ID того, хто натиснув

    try {
        // --- ВИПРАВЛЕННЯ ---
        // 1. Знаходимо сам запит І юзера, що його створив
        const swap = await SwapRequest.findById(swapRequestId).populate('requester');
        
        // 2. Знаходимо юзера, ЯКИЙ НАТИСНУВ кнопку
        const requestedUser = await User.findOne({ telegramId: requestedTelegramId });

        // 3. Перевіряємо валідність запиту і чи той юзер натиснув
        if (!swap || swap.status !== 'pending' || !requestedUser || !swap.requested.equals(requestedUser._id)) {
            try {
                // Намагаємось відредагувати, але може бути помилка, якщо повідомлення старе
                 await ctx.editMessageText('Цей запит на обмін вже недійсний.');
            } catch (editError) {
                 console.warn("Could not edit expired swap message:", editError.message);
            }
            // Якщо запит існує, але не валідний, змінимо статус
            if (swap) {
                await SwapRequest.findByIdAndUpdate(swapRequestId, { status: 'expired' });
            }
            return; // Виходимо
        }
        // --- КІНЕЦЬ ВИПРАВЛЕННЯ ---

        const subject = await Subject.findById(swap.subject);
        const queueList = (subject.settings && subject.settings.queueList) || [];

        const indexA = queueList.findIndex(e => e.user.equals(swap.requester._id));
        const indexB = queueList.findIndex(e => e.user.equals(swap.requested)); // swap.requested це ObjectId

        if (indexA === -1 || indexB === -1) {
            await SwapRequest.findByIdAndUpdate(swapRequestId, { status: 'expired' });
            return await ctx.editMessageText('Обмін неможливий: один з учасників вийшов з черги.');
        }

        // --- МАГІЯ ОБМІНУ ---
        // Міняємо місцями цілі об'єкти { user: ObjectId, labInfo: String, timestamp: Date }
        const temp = queueList[indexA];
        queueList[indexA] = queueList[indexB];
        queueList[indexB] = temp;
        // --------------------

        await Subject.findByIdAndUpdate(swap.subject, { 'settings.queueList': queueList });
        await SwapRequest.findByIdAndUpdate(swapRequestId, { status: 'approved' });

        await ctx.editMessageText(`✅ Обмін з ${swap.requester.firstName} схвалено! Ви помінялись місцями.`);

        await notificationService.sendNotification(
            swap.requester.telegramId,
            `✅ Користувач ${requestedUser.firstName} СХВАЛИВ ваш запит на обмін у черзі на ${subject.name}.`
        );

    } catch (error) {
        console.error('Помилка схвалення обміну:', error.message);
        try {
            await ctx.reply('Сталася помилка під час обробки.');
        } catch (replyError) {
             console.error("Failed to send error reply:", replyError.message);
        }
    }
});

// Обробка кнопки "ВІДХИЛИТИ"
bot.action(/swap_reject_(.+)/, async (ctx) => {
  const swapRequestId = ctx.match[1];
  
  try {
    const swap = await SwapRequest.findByIdAndUpdate(swapRequestId, { status: 'rejected' }, { new: true }).populate('requester');
    if (!swap) {
      return await ctx.editMessageText('Запит вже недійсний.');
    }

    await ctx.editMessageText('Ви відхилили запит на обмін.');
    
    await notificationService.sendNotification(
      swap.requester.telegramId,
      `❌ Користувач ${ctx.from.first_name} ВІДХИЛИВ ваш запит на обмін.`
    );
    
  } catch (error) {
    console.error('Помилка відхилення обміну:', error.message);
    await ctx.reply('Сталася помилка.');
  }
});
// Ініціалізуємо сервіс сповіщень
notificationService.init(bot);

// Запускаємо бота
bot.launch();
console.log('🤖 Telegram-бот успішно запущено');

module.exports = bot;