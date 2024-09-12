import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { webHook: true });

export async function POST(req) {
  try {
    let name='';
    const body = await req.json();
    if (body.message) {
      const chatId = body.message.chat?.id;
      const text = body.message.text;

      if (!chatId) {
        throw new Error('chatId is missing');
      }

      if (text === '/start') {
        await bot.sendMessage(chatId, "Hello, I'm a bot, please write your name.");
      } else {
        console.log(name);
        name = text;
        console.log(name);
        await bot.sendMessage(chatId, `Hello ${name}, please select your country:`, {
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
    }
    if (body.callback_query) {
      console.log(name);
      const callbackQuery = body.callback_query;
      const country = callbackQuery.data;
      const chatId = callbackQuery.message?.chat?.id;

      if (!chatId) {
        throw new Error('chatId is missing in callback_query');
      }

      await bot.sendMessage(chatId, `Nice to meet you ${name}, you are from ${country}.`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
