import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { webHook: true });

let userSessions = {};
const luisSupId = '826345981';
const romanySupID = '1337765689';
let techName = 'Romany';


function getUserSession(chatId,applicantName) {
  if (!userSessions[chatId]) {
    console.log('found user');
    
    userSessions[chatId] = {
      name:applicantName,
      readEmail:false,
      logged:false,
      seeCalls:false,
      firstScreenId: null,
      firstAudioClear:false,
      secondScreenId: null,
      thirdScreenId: null,
      finishAudioClear:false,
      waiting:false,
      done:false,
      lastSendTime:Date.now()
    };
  }
  return userSessions[chatId];
}

function reminder() {
    console.log('Checking for reminders...');
    
    Object.keys(userSessions).forEach((chatId) => {
      const now = Date.now();
      const session = userSessions[chatId];
  
      if (session.done || session.waiting) return;
  
      const minutesSinceLastMessage = (now - session.lastSendTime) / 60000;

      if (minutesSinceLastMessage >= 2 && minutesSinceLastMessage <= 10) {
        console.log('sending a reminder');
        bot.sendMessage(chatId, `Hello ${session.name}, please remember that you must complete this verification before your exam. Otherwise, it may be postponed or suspended.`);
      }
    });
}

setInterval(reminder, 30000);

function setLastSendTime(chatId) {
    userSessions[chatId].lastSendTime = Date.now();
    console.log('Updated user:', userSessions[chatId]);
}


export async function POST(req) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id || body.callback_query?.message?.chat?.id;
    const name = body.message?.from.first_name || body.callback_query?.from.first_name
    const text = body.message?.text;
    const callbackData = body.callback_query?.data;
    const file = body.message?.document?.file_name;

    if (!chatId) throw new Error('chatId is missing');

    if (chatId == luisSupId){
        console.log('support is here: ', name);
        let [userId,solver] = callbackData.split(',');
        userSessions[userId].waiting = false;
        console.log('user not waiting');
        await bot.sendMessage(userId,`the IT support solved the problem please press 'CONTINUE' to continue the verification steps`,{
            reply_markup:{
                inline_keyboard:[
                    [{text:'CONTINUE',callback_data:solver}],
                ]
            }
        });
        await bot.sendMessage(chatId,'Thank you, I notified the applicant.');
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    let user = getUserSession(chatId,name);

    if (user.waiting){
        await bot.sendMessage(chatId,`A human from IT support will contact you, Please be patient.`);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if(user.done){
        await bot.sendMessage(chatId,`You are already ready to take your ALTA evaluation. I will contact you one hour before your exam to run these validations again to make sure everything is ok. Please, remember the following considerations for your evaluation:
            - You must use a computer. 
            - You have to call the number 14049203888 and then enter the access code that has been provided via email.
            - In case the access code doesn't work, hang up the call immediately and call any of the Contingency Numbers 14049203817 or 18884654648. In any of these lines, you must explain the issue that you have experienced, providing your identification and access code, and require them to proceed with the evaluation.
            \nThat's it for now. Thanks for your time`);
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
        await bot.sendMessage(chatId, `Hello ${user.name}, this is ${techName} from Multilingual Interpreters and Translators IT Department. I am writing to run some validations before taking your evaluation tomorrow. First of all, I would like you to confirm that you have checked the email sent by HR and that you have read the contents of this email, including the Manual of Use attached to it, and that you have watched the video instructive.`, {
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
                [{ text: 'DONE', callback_data: 'yes_read_email' }],
                ],
            },
        });
    }

    if (callbackData === 'yes_read_email'){
        await bot.sendMessage(chatId, `Thanks for your confirmation, now, we will start the validations. Can you please log in to our call center using the credentials given in the email?`, {
            reply_markup: {
                inline_keyboard: [
                [{ text: 'Yes I logged in ', callback_data: 'yes_logged' }],
                [{ text: 'No I can not log in', callback_data: 'no_logged' }],
                ],
            },
        });
        userSessions[chatId].readEmail = true;
    }

    if (callbackData === 'yes_logged'){
        await bot.sendMessage(chatId, `Now, access to the Scheduled Calls button in our call center. You will see some calls have been scheduled for you. Three of them are labelled as TEST CALL and the other three are labelled as ALTA`, {
            reply_markup: {
                inline_keyboard: [
                [{ text: 'Yes I can access and see the calls', callback_data: 'yes_see_calls' }],
                [{ text: 'No I can not access and see the calls', callback_data: 'no_see_calls' }],
                ],
            },
        });
        userSessions[chatId].logged = true
    }

    if (callbackData === 'yes_see_calls'){
        await bot.sendMessage(chatId, `Perfect, please, call the test call with number 14049203888. This will ask you to enter your access code. For the purpose of this test, enter any random code like 1111111. After entering this, you will hear that the code is incorrect. Don’t worry, that is expected to happen. That will mean that the call was successful and the dial pad is working. Please, take a screenshot of this and after it, proceed to hang up the call.\n📎 Upload screenshot photo to continue.`);
        userSessions[chatId].seeCalls = true
    }

    if (screenshot){
        const photoId = screenshot.file_id;
        const photoSize = screenshot.file_size;
        // const photo = await bot.getFile(photoId);
        if (! user.firstScreenId){
            userSessions[chatId].firstScreenId = photoId;
            await bot.sendMessage(chatId,`you uploaded first photo with size ${photoSize}`);
            await bot.sendMessage(chatId, `Perfect, thanks for that screenshot. Have you hung up already?`, {
                reply_markup: {
                    inline_keyboard: [
                    [{ text: 'Yes I did hung up', callback_data: 'yes_hung_up' }],
                    [{ text: 'No I did not hung up', callback_data: 'no_hung_up' }],
                    ],
                },
            });
        }
        else if (user.firstScreenId && ! user.secondScreenId){
            userSessions[chatId].secondScreenId = photoId;
            await bot.sendMessage(chatId,`you uploaded second photo with size ${photoSize}, please upload the third screenshot`);
        }
        else if(user.firstScreenId && user.secondScreenId && ! user.thirdScreenId){
            userSessions[chatId].thirdScreenId = photoId;
            await bot.sendMessage(chatId,`you uploaded third photo with size ${photoSize}`);
            await bot.sendMessage(chatId, `Perfect, thanks for the screenshots. Have you hung up already for both calls?`, {
                reply_markup: {
                    inline_keyboard: [
                    [{ text: 'Yes I did hung up', callback_data: 'yes_hung_up_finish' }],
                    [{ text: 'No I did hung up', callback_data: 'no_hung_up_finish' }],
                    ],
                },
            });
        }
        else if (user.firstScreenId && user.secondScreenId && user.thirdScreenId){
            await bot.sendMessage(chatId,`you already uploaded the 3 screenshots for the 3 test calls`);
        }
    }

    if (callbackData === 'yes_hung_up'){
        await bot.sendMessage(chatId,'Great!\nWas the audio clear?',{
            reply_markup:{
                inline_keyboard:[
                    [{text:'Yes it was clear',callback_data:'yes_voice_clear'}],
                    [{text:'No it was not clear',callback_data:'no_voice_clear'}]
                ]
            }
        })
    }

    if (callbackData === 'yes_hung_up_finish'){
        await bot.sendMessage(chatId,'Great!\nWas the audio clear for both calls?',{
            reply_markup:{
                inline_keyboard:[
                    [{text:'Yes it was clear',callback_data:'yes_voice_clear_finish'}],
                    [{text:'No it was not clear',callback_data:'no_voice_clear_finish'}]
                ]
            }
        })
    }

    if (callbackData === 'no_hung_up'){
        await bot.sendMessage(chatId,'Please hung up!\nClick "DONE" when you hung up',{
            reply_markup:{
                inline_keyboard:[
                    [{text:'DONE',callback_data:'yes_hung_up'}],
                ]
            }
        })
    }

    if (callbackData === 'no_hung_up_finish'){
        await bot.sendMessage(chatId,'Please hung up!\nClick "DONE" when you hung up',{
            reply_markup:{
                inline_keyboard:[
                    [{text:'DONE',callback_data:'yes_hung_up_finish'}],
                ]
            }
        })
    }

    if (callbackData === 'yes_voice_clear'){
        await bot.sendMessage(chatId,`Now, call the test call with number 14049203817. This will connect you with the ALTA direct line. If you manage to hear the options provided by the automatic responder, take a screenshot of it, and hang up the call. Repeat this with the number 18884654648.`);
        userSessions[chatId].firstAudioClear = true
    }

    if (callbackData === 'yes_voice_clear_finish'){
        await bot.sendMessage(chatId,`Perfect, all the validations have been done successfully. You are ready to take your ALTA evaluation. Tomorrow, I will contact you one hour before your exam to run these validations again to make sure everything is ok. Please, remember the following considerations for your evaluation:\n
            -	You must use a computer. 
            -	You have to call the number 14049203888 and then enter the access code that has been provided via email.
            -	In case the access code doesn't work, hang up the call immediately and call any of the Contingency Numbers 14049203817 or 18884654648. In any of these lines, you must explain the issue that you have experienced, providing your identification and access code, and require them to proceed with the evaluation.
            \nThat’s it for now. Thanks for your time`);
            userSessions[chatId].finishAudioClear = true
            userSessions[chatId].done = true
    }

    if (callbackData === 'no_voice_clear' || callbackData === 'no_logged' || callbackData === 'no_see_calls' || callbackData === 'no_voice_clear_finish'){
        await bot.sendMessage(chatId,`A human from IT support will contact you, Please be patient.`);
        userSessions[chatId].waiting = true
        let solver = callbackData.replace('no','yes');
        await bot.sendMessage(luisSupId,`Applicant @${user.name} has a problem during the verification (${callbackData}).\nPlease click 'SOLVED' when you done`,{
            reply_markup:{
                inline_keyboard:[
                    [{text:'SOLVED',callback_data:`${chatId},${solver}`}],
                ]
            }
        });
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