import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot;

if (!bot) {
  bot = new TelegramBot(token, { polling: true });
}

let userName = '';
let userCountry = '';

export async function POST(req) {
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Hello, welcome to chatbot demo, please write your name.");
  });

  bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (!userName && msg.text !== '/start') {
      userName = msg.text;
      bot.sendMessage(chatId, `Hello ${userName}, please select your country:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'US', callback_data: 'US' }],
            [{ text: 'Egypt', callback_data: 'Egypt' }],
            [{ text: 'Peru', callback_data: 'Peru' }],
            [{ text: 'Porugal', callback_data: 'Porugal' }],
          ],
        },
      });
    }
  });

  bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    userCountry = callbackQuery.data;

    bot.sendMessage(message.chat.id, `Nice to meet you ${userName}, you are from ${userCountry}.`);
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
