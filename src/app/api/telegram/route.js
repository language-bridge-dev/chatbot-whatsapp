import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { webHook: true });

let applicantName = 'Luis';
let techName = 'Romany';

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('body',body);

    const chatId = body.message?.chat?.id || body.callback_query?.message?.chat?.id;
    const text = body.message?.text;
    const callbackData = body.callback_query?.data;
    const screenshot = body.message?.document?.file_name;
    const photo = body.message?.photo[body.message.photo?.length-1]

    if (!chatId) {
        throw new Error('chatId is missing');
    }

    if (text === '/start') {
        await bot.sendMessage(chatId, `Hello ${applicantName}, this is ${techName} from Multilingual Interpreters and Translators IT Department. I am writing to run some validations before taking your evaluation tomorrow. First of all, I would like you to confirm that you have checked the email sent by HR and that you have read the contents of this email, including the Manual of Use attached to it, and that you have watched the video instructive.`, {
            reply_markup: {
                inline_keyboard: [
                [{ text: 'Yes I read it', callback_data: 'yes_read_email' }],
                [{ text: 'No I did not read it', callback_data: 'no_read_email' }],
                ],
            },
        });
    }

    if (callbackData === 'no_read_email'){
        await bot.sendMessage(chatId, `Please read it and when you finish press 'DONE'`,{
            reply_markup: {
                inline_keyboard: [
                [{ text: 'DONE', callback_data: 'done_read_email' }],
                ],
            },
        });
    }
    else if (callbackData === 'yes_read_email' || callbackData === 'done_read_email'){
        await bot.sendMessage(chatId, `Thanks for your confirmation, now, we will start the validations. Can you please log in to our call center using the credentials given in the email?`, {
            reply_markup: {
                inline_keyboard: [
                [{ text: 'Yes I logged in ', callback_data: 'yes_logged' }],
                [{ text: 'No I can not log in', callback_data: 'no_logged' }],
                ],
            },
        });
    }

    if (callbackData === 'no_logged'){
        await bot.sendMessage(chatId, `Please contact with the HR, And when you log in successfully please press 'DONE'`,{
            reply_markup: {
                inline_keyboard: [
                [{ text: 'DONE', callback_data: 'done_logged' }],
                ],
            },
        });
    }
    else if (callbackData === 'yes_logged' ||  callbackData === 'done_logged'){
        await bot.sendMessage(chatId, `Now, access to the Scheduled Calls button in our call center. You will see some calls have been scheduled for you. Three of them are labelled as TEST CALL and the other three are labelled as ALTA`, {
            reply_markup: {
                inline_keyboard: [
                [{ text: 'Yes I can access and see the calls', callback_data: 'yes_see_calls' }],
                [{ text: 'No I can not access and see the calls', callback_data: 'no_see_calls' }],
                ],
            },
        });
    }

    if (callbackData === 'no_see_calls'){
        await bot.sendMessage(chatId, `Please contact with the HR, And when you see the calls successfully please press 'DONE'`,{
            reply_markup: {
                inline_keyboard: [
                [{ text: 'DONE', callback_data: 'done_see_calls' }],
                ],
            },
        });
    }
    else if (callbackData === 'yes_see_calls' ||  callbackData === 'done_see_calls'){
        await bot.sendMessage(chatId, `Perfect, please, call the test call with number 14049203888. This will ask you to enter your access code. For the purpose of this test, enter any random code like 1111111. After entering this, you will hear that the code is incorrect. Don’t worry, that is expected to happen. That will mean that the call was successful and the dial pad is working. Please, take a screenshot of this and after it, proceed to hang up the call./n📎 Upload screenshot photo to continue.`);
    }

    if (screenshot){
        await bot.sendMessage(chatId,`Please, upload your selfie as a photo!/nDo not upload it as a file.`)
    }

    if (photo){
        console.log('photo'+photo);
        console.log('photos'+body.message.photo);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
