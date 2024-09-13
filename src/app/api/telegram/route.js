import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { webHook: true });

let userSessions = {};

function getUserSession(chatId) {
  if (!userSessions[chatId]) {
    userSessions[chatId] = {
      firstScreenId: null,
      secondScreenId: null,
      thirdScreenId: null,
      waiting:false,
      done:false,
      lastSendTime:Date.now()
    };
  }
  return userSessions[chatId];
}

function reminder() {
    const now = Date.now();
    console.log('Checking for reminders...');
    
    Object.keys(userSessions).forEach((chatId) => {
      const session = userSessions[chatId];
  
      if (session.done || session.waiting) return;
  
      const minutesSinceLastMessage = (now - session.lastSendTime) / 60000;
  
      if (minutesSinceLastMessage >= 2 && minutesSinceLastMessage <= 10) {
        console.log('sending a reminder');
        bot.sendMessage(chatId, `Hello ${applicantName}, please remember that you must complete this verification before your exam. Otherwise, it may be postponed or suspended.`);
      }
    });
}

setInterval(reminder, 30000);

function setLastSendTime(chatId) {
    userSessions[chatId].lastSendTime = Date.now();
    console.log('Updated session:', userSessions[chatId]);
}

let applicantName = 'Luis';
let techName = 'Romany';

export async function POST(req) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id || body.callback_query?.message?.chat?.id;
    const text = body.message?.text;
    const callbackData = body.callback_query?.data;
    const file = body.message?.document?.file_name;

    if (!chatId) throw new Error('chatId is missing');

    let user = getUserSession(chatId);

    if (user.waiting){
        await bot.sendMessage(chatId,`A human from IT support will contact you, Please be patient.`);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if(user.done){
        await bot.sendMessage(chatId,`You are already ready to take your ALTA evaluation. I will contact you one hour before your exam to run these validations again to make sure everything is ok. Please, remember the following considerations for your evaluation:\n
            -	You must use a computer. 
            -	You have to call the number 14049203888 and then enter the access code that has been provided via email.
            -	In case the access code doesn’t work, hang up the call immediately and call any of the Contingency Numbers 14049203817 or 18884654648. In any of these lines, you must explain the issue that you have experienced, providing your identification and access code, and require them to proceed with the evaluation.
            \nThat’s it for now. Thanks for your time`);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    setLastSendTime(chatId);

    console.log('body',body);
    console.log('users',userSessions);

    if (file){
        await bot.sendMessage(chatId,`Please, upload screenshot as a photo!\nDo not upload it as a file.`)
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    let screenshot;
    
    if (body.message && body.message.photo){
        screenshot = body.message.photo[0];
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

    if (screenshot){
        const photoId = screenshot.file_id;
        const photoSize = screenshot.file_size;
        // const photo = await bot.getFile(photoId);
        if (! getUserSession(chatId).firstScreenId){
            userSessions[chatId].firstScreenId = photoId;
            await bot.sendMessage(chatId,`you uploaded first photo with size ${photoSize}`);
            await bot.sendMessage(chatId, `Perfect, thanks for that screenshot. Have you hung up already? Was the audio clear?`, {
                reply_markup: {
                    inline_keyboard: [
                    [{ text: 'Yes I did hung up and the audio was clear', callback_data: 'yes_voice_clear' }],
                    [{ text: 'Yes I did hung up BUT the audio was not clear', callback_data: 'no_voice_clear' }],
                    [{ text: 'No I did not hung up and the audio was clear', callback_data: 'no_voice_clear' }],
                    [{ text: 'No I did not hung up and the audio was not clear', callback_data: 'no_voice_clear' }],
                    ],
                },
            });
        }
        else if (getUserSession(chatId).firstScreenId && ! getUserSession(chatId).secondScreenId){
            userSessions[chatId].secondScreenId = photoId;
            await bot.sendMessage(chatId,`you uploaded second photo with size ${photoSize}, please upload the third screenshot`);
        }
        else if(getUserSession(chatId).firstScreenId && getUserSession(chatId).secondScreenId && ! getUserSession(chatId).thirdScreenId){
            userSessions[chatId].thirdScreenId = photoId;
            await bot.sendMessage(chatId,`you uploaded third photo with size ${photoSize}`);
            await bot.sendMessage(chatId, `Perfect, thanks for the screenshots. Have you hung up already? Was the audio clear for both numbers?`, {
                reply_markup: {
                    inline_keyboard: [
                    [{ text: 'Yes I did hung up and the audio was clear for both numbers', callback_data: 'yes_voice_clear_second' }],
                    [{ text: 'Yes I did hung up BUT the audio was not clear for both or one of them', callback_data: 'no_voice_clear' }],
                    [{ text: 'No I did not hung up and the audio was clear for both', callback_data: 'no_voice_clear' }],
                    [{ text: 'No I did not hung up and the audio was not clear for both or one of them', callback_data: 'no_voice_clear' }],
                    ],
                },
            });
        }
        else if (getUserSession(chatId).firstScreenId && getUserSession(chatId).secondScreenId && getUserSession(chatId).thirdScreenId){
            await bot.sendMessage(chatId,`you already uploaded the 3 screenshots for the 3 test calls`);
        }
    }



    if (callbackData === 'yes_voice_clear'){
        await bot.sendMessage(chatId,`Now, call the test call with number 14049203817. This will connect you with the ALTA direct line. If you manage to hear the options provided by the automatic responder, take a screenshot of it, and hang up the call. Repeat this with the number 18884654648.`);
    }

    if (callbackData === 'yes_voice_clear_second'){
        await bot.sendMessage(chatId,`Perfect, all the validations have been done successfully. You are ready to take your ALTA evaluation. Tomorrow, I will contact you one hour before your exam to run these validations again to make sure everything is ok. Please, remember the following considerations for your evaluation:\n
            -	You must use a computer. 
            -	You have to call the number 14049203888 and then enter the access code that has been provided via email.
            -	In case the access code doesn’t work, hang up the call immediately and call any of the Contingency Numbers 14049203817 or 18884654648. In any of these lines, you must explain the issue that you have experienced, providing your identification and access code, and require them to proceed with the evaluation.
            \nThat’s it for now. Thanks for your time`);
            userSessions[chatId].done = true
    }

    if (callbackData === 'no_voice_clear'){
        await bot.sendMessage(chatId,`A human from IT support will contact you, Please be patient.`);
        userSessions[chatId].waiting = true
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
  
    if (error instanceof SomeSpecificError) {
      return new Response(JSON.stringify({ error: 'Specific error message' }), { status: 400 });
    }
  
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { status: 500 });
  }
}

