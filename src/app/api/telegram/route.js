import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { webHook: true }); // Initialize the bot without setting webhook

export async function POST(req) {
  try {
    const body = await req.json();
    const chatId = body.message.chat.id;
    const text = body.message.text;

    if (text === '/start') {
      await bot.sendMessage(chatId, "Hello, I'm a bot, please write your name.");
    } else if (!body.message.reply_to_message) {
      await bot.sendMessage(chatId, `Hello ${text}, please select your country:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'US', callback_data: 'US' }],
            [{ text: 'Egypt', callback_data: 'Egypt' }],
            [{ text: 'Peru', callback_data: 'Peru' }],
            [{ text: 'Portugal', callback_data: 'Portugal' }],
          ],
        },
      });
    }

    // Handle callback queries
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const country = callbackQuery.data;
      const message = callbackQuery.message;

      await bot.sendMessage(message.chat.id, `Nice to meet you, you are from ${country}.`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
    return new Response(JSON.stringify({ error: 'Failed to process update' }), { status: 500 });
  }
}
