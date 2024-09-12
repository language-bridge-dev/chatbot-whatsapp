import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { webHook: true });

let applicantName = 'Luis';
let techName = 'Romany';
let chatId;

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('body',body);
    
    if (body.message) {
      chatId = body.message.chat?.id;
      const text = body.message.text;

      if (!chatId) {
        throw new Error('chatId is missing');
      }

      if (text === '/start') {
        await bot.sendMessage(chatId, `Hello ${applicantName}, this is Romany from Multilingual Interpreters and Translators IT Department. I am writing to run some validations before taking your evaluation tomorrow. First of all, I would like you to confirm that you have checked the email sent by HR and that you have read the contents of this email, including the Manual of Use attached to it, and that you have watched the video instructive.`, {
            reply_markup: {
                inline_keyboard: [
                [{ text: 'Yes I read it', callback_data: 'yes_read_email' }],
                [{ text: 'No I did not read it', callback_data: 'no_read_email' }],
                ],
            },
        });
      } else {
        await bot.sendMessage(chatId, `Please select option from the previous menu`);
      }
    }

    if (body.callback_query) {
        if (body.callback_query.data === 'no_read_email'){
            await bot.sendMessage(chatId, `Please read it and when you finish press 'DONE'`,{
                reply_markup: {
                    inline_keyboard: [
                    [{ text: 'DONE', callback_data: 'done_read_email' }],
                    ],
                },
            });
        }
        else if (body.callback_query.data === 'yes_read_email' || body.callback_query.data === 'done_read_email'){
            await bot.sendMessage(chatId, `Thanks for your confirmation, now, we will start the validations. Can you please log in to our call center using the credentials given in the email?`, {
                reply_markup: {
                    inline_keyboard: [
                    [{ text: 'Yes I logged in ', callback_data: 'yes_logged' }],
                    [{ text: 'No I can not log in', callback_data: 'no_logged' }],
                    ],
                },
            });
        }
    }

    if (body.callback_query) {
        if (body.callback_query.data === 'no_logged'){
            await bot.sendMessage(chatId, `Please contact with the HR, And when you log in successfully please press 'DONE'`,{
                reply_markup: {
                    inline_keyboard: [
                    [{ text: 'DONE', callback_data: 'done_logged' }],
                    ],
                },
            });
        }
        else if (body.callback_query.data === 'yes_logged' ||  body.callback_query.data === 'done_logged'){
            await bot.sendMessage(chatId, `Now, access to the Scheduled Calls button in our call center. You will see some calls have been scheduled for you. Three of them are labelled as TEST CALL and the other three are labelled as ALTA`, {
                reply_markup: {
                    inline_keyboard: [
                    [{ text: 'Yes I can access and see the calls', callback_data: 'yes_see_calls' }],
                    [{ text: 'No I can not access and see the calls', callback_data: 'no_see_calls' }],
                    ],
                },
            });
        }
    }

    if (body.callback_query) {
        if (body.callback_query.data === 'no_see_calls'){
            await bot.sendMessage(chatId, `Please contact with the HR, And when you see the calls successfully please press 'DONE'`,{
                reply_markup: {
                    inline_keyboard: [
                    [{ text: 'DONE', callback_data: 'done_see_calls' }],
                    ],
                },
            });
        }
        else if (body.callback_query.data === 'yes_see_calls' ||  body.callback_query.data === 'done_see_calls'){
            await bot.sendMessage(chatId, `Perfect, please, call the test call with number 14049203888. This will ask you to enter your access code. For the purpose of this test, enter any random code like 1111111. After entering this, you will hear that the code is incorrect. Don’t worry, that is expected to happen. That will mean that the call was successful and the dial pad is working. Please, take a screenshot of this and after it, proceed to hang up the call and send the screenshot here please.`);
        }
    }

    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const country = callbackQuery.data;
      const chatId = callbackQuery.message?.chat?.id;
      console.log("message"+callbackQuery.message);
      console.log("data"+callbackQuery.data);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
