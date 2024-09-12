import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { webHook: true });

let applicantName = 'Luis';
let techName = 'Romany';
let firstScreenId;
let secondScreenId;
let thirdScreenId;

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('body',body);

    const chatId = body.message?.chat?.id || body.callback_query?.message?.chat?.id;
    const text = body.message?.text;
    const callbackData = body.callback_query?.data;
    let file = body.message?.document?.file_name;
    let screenshot;
    if (body.message && body.message.photo){
        screenshot = body.message.photo[0];
    }

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
        await bot.sendMessage(chatId, `Perfect, please, call the test call with number 14049203888. This will ask you to enter your access code. For the purpose of this test, enter any random code like 1111111. After entering this, you will hear that the code is incorrect. Don’t worry, that is expected to happen. That will mean that the call was successful and the dial pad is working. Please, take a screenshot of this and after it, proceed to hang up the call.\n📎 Upload screenshot photo to continue.`);
    }

    if (file){
        await bot.sendMessage(chatId,`Please, upload screenshot as a photo!\nDo not upload it as a file.`)
    }

    if (screenshot){
        const photoId = screenshot.file_id;
        const photoSize = screenshot.file_size;
        const photo = await bot.getFile(photoId);
        if (!firstScreenId){
            firstScreenId = photoId;
            await bot.sendMessage(chatId,`you uploaded first photo with size ${photoSize}`);
            console.log(photo);

            await bot.sendMessage(chatId, `Perfect, thanks for that screenshot. Have you hung up already? Was the audio clear?`, {
                reply_markup: {
                    inline_keyboard: [
                    [{ text: 'Yes I did hung up (please hung up if you did not) and the audio was clear', callback_data: 'yes_voice_clear' }],
                    ],
                },
            });
        }
        else if (firstScreenId && ! secondScreenId){
            secondScreenId = photoId;
            await bot.sendMessage(chatId,`you uploaded second photo with size ${photoSize}, please upload the third screenshot`);
        }
        else if(firstScreenId && secondScreenId && ! thirdScreenId){
            thirdScreenId = photoId;
            await bot.sendMessage(chatId,`you uploaded third photo with size ${photoSize}`);
            await bot.sendMessage(chatId,`Perfect, all the validations have been done successfully. You are ready to take your ALTA evaluation. Tomorrow, I will contact you one hour before your exam to run these validations again to make sure everything is ok. Please, remember the following considerations for your evaluation:
                \n-	You must use a computer. 
                \n-	You have to call the number 14049203888 and then enter the access code that has been provided via email.
                \n-	In case the access code doesn’t work, hang up the call immediately and call any of the Contingency Numbers 14049203817 or 18884654648. In any of these lines, you must explain the issue that you have experienced, providing your identification and access code, and require them to proceed with the evaluation.
                \nThat’s it for now. Thanks for your time`);
        }
        else if (firstScreenId && secondScreenId && thirdScreenId){
            await bot.sendMessage(chatId,`you already uploaded the 3 screenshots for the 3 test calls`);
        }
    }

    if (callbackData === 'yes_voice_clear'){
        await bot.sendMessage(chatId,`Now, call the test call with number 14049203817. This will connect you with the ALTA direct line. If you manage to hear the options provided by the automatic responder, take a screenshot of it, and hang up the call. Repeat this with the number 18884654648.`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
