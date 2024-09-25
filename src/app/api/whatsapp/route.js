import { Twilio } from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new Twilio(accountSid, authToken);

let userSessions = {};
const twilioWhatsAppNumber = 'whatsapp:+18633445007';
const supNumber = 'whatsapp:+201062791045';

function reminder() {  
  Object.keys(userSessions).forEach((number) => {
    const now = Date.now();
    const session = userSessions[number];

    if (session.done || session.waiting) return;

    const minutesSinceLastMessage = (now - session.lastSendTime) / 30000;

    if (minutesSinceLastMessage >= 2 && minutesSinceLastMessage <= 10) {
      sendMessageReply(number,'Hello, please remember that you must complete this verification before your exam. Otherwise, it may be postponed or suspended.')
    }
  });
}

setInterval(reminder, 30000);

function setLastSendTime(number) {
  userSessions[number].lastSendTime = Date.now();
  console.log('Updated user:', userSessions[number]);
}

function getUserSession(number) {
  let newUser = false;
  if (!userSessions[number]) {
    newUser = true;
    userSessions[number] = {
      readEmail:false,
      logged:false,
      seeCalls:false,
      firstScreenId: null,
      secondScreenId: null,
      thirdScreenId: null,
      waiting:false,
      done:false,
      lastSendTime:Date.now()
    };
  }
  return [userSessions[number],newUser];
}

export async function POST(req) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    console.log(params);
    
    const name = params.get('ProfileName');
    const whatsappNumber = params.get('From');
    const text = params.get('Body')?.toLowerCase().trim();
    const buttonId = params.get('Interactive')?.Button?.Payload;
    const buttonText = params.get('Interactive')?.Button?.Text;
    
    // if (whatsappNumber === supNumber) {
    //   const [number, solver] = buttonId.split(',');
    //   userSessions[number].waiting = false;
    //   await sendMessageOptions(number,
    //     'The IT support solved the problem. Please press "CONTINUE" to proceed.',
    //     [{type:'reply',reply:{id:solver,text:'CONTINUE'}}]
    //   );
    //   await sendMessageReply(whatsappNumber,`Thank you, I notified ${number}.`)
    //   return new Response('', { status: 200 });
    // }

    let [user, newUser] = getUserSession(whatsappNumber);

    // options must be [{type:'reply',reply:{id:'ID',title:''}}]    
    // type=> fixed  ID=> your id that coming in the request  title=> the text that showed in the user chat

    if (user.waiting) {
      await sendMessageReply(whatsappNumber,'A techincal assistant from our team will contact you. Please, be patient.')
      return new Response('', { status: 200 });
    }

    if (user.done) {
      await sendMessageReply(whatsappNumber,`You are already ready to take your ALTA evaluation. I will contact you one hour before your exam to run these validations again to make sure everything is ok. Please, remember the following considerations for your evaluation:
            - You must use a computer. 
            - You have to call the number 14049203888 and then enter the access code that has been provided via email.
            - In case the access code doesn't work, hang up the call immediately and call any of the Contingency Numbers 14049203817 or 18884654648. In any of these lines, you must explain the issue that you have experienced, providing your identification and access code, and require them to proceed with the evaluation.
            \nThat's it for now. Thanks for your time`)
    
      return new Response('', { status: 200 });
    }

    setLastSendTime(whatsappNumber);

    if(params.get('NumMedia') == 1 && params.get('MessageType') != 'image') {
      await sendMessageReply(whatsappNumber,`Please, upload screenshot as a photo!\nDo not upload it as a file.`);
      return new Response('', { status: 200 });
    }
    let screenshot;
    if (params.get('NumMedia') == 1 && params.get('MessageType') == 'image'){
      screenshot = params.get('MediaUrl0');
    }
    if(screenshot){
      if(!user.firstScreenId) {
        userSessions[whatsappNumber].firstScreenId = screenshot;
        await sendMessageOptions(whatsappNumber,'Perfect, thanks for that screenshot. Have you hung up already?',[
          {type:'reply',reply:{id:'yes_first_hung',title:'Yes I did hung up'}},
          {type:'reply',reply:{id:'no_first_hung',title:'No I did not hung up'}}
        ])
      }
      else if(!user.secondScreenId) {
        userSessions[whatsappNumber].secondScreenId = screenshot;
      }
      else if(!user.thirdScreenId) {
        userSessions[whatsappNumber].thirdScreenId = screenshot;
        await sendMessageOptions(whatsappNumber,'Perfect, thanks for the screenshots. Have you hung up already for both calls?',[
          {type:'reply',reply:{id:'yes_hung',title:'Yes I did hung up for both calls'}},
          {type:'reply',reply:{id:'no_hung',title:'No I did not hung up for both calls'}}
        ])
      }
      else {
        await sendMessageReply(whatsappNumber,'You already added the 3 screenshots.\nPlease continue the steps or choose form the previous list.')
      }
      return new Response('', { status: 200 });
    }

    if (text === 'start') {
      await sendMessageOptions(whatsappNumber,
        `Hello ${name}, this is technical support from Multilingual Interpreters and Translators IT Department. I am writing to run some validations before taking your evaluation tomorrow. First of all, I would like you to confirm that you have checked the email sent by HR and that you have read the contents of this email, including the Manual of Use attached to it, and that you have watched the video instructive.`,
        [
          {type:'reply',reply:{id:'yes_read',title:'Yes I read it'}},
          {type:'reply',reply:{id:'no_read',title:'No I did not read it'}}
        ]
      )
    }
    else if (buttonId === 'no_read') {
      await sendMessageOptions(whatsappNumber,
        'Please read it and when you finish, press "DONE".',
        [
          {type:'reply',reply:{id:'yes_read',title:'Done reading the email'}},
        ]
      )
    }
    else if (buttonId === 'yes_read') {
      userSessions[whatsappNumber].readEmail = true;
      await sendMessageOptions(whatsappNumber,
        'Thanks for your confirmation, now, we will start the validations. Can you please log in to our call center using the credentials given in the email?',
        [
          {type:'reply',reply:{id:'yes_logged',title:'Yes I logged in'}},
          {type:'reply',reply:{id:'no_logged',title:'No I cannot log in'}}
        ]      
      )
    }
    else if (buttonId === 'yes_logged') {
      userSessions[whatsappNumber].logged = true;
      await sendMessageOptions(whatsappNumber,
        'Great! Now please log in to your evaluation portal and confirm that you are able to see the audio and video setup.',
        [
          {type:'reply',reply:{id:'yes_see_calls',title:'Yes I can see the calls'}},
          {type:'reply',reply:{id:'no_see_calls',title:'No I cannot see the calls'}}
        ]
      )
    }
    else if (buttonId === 'yes_see_calls') {
      userSessions[whatsappNumber].seeCalls = true;
      await sendMessageReply(whatsappNumber, 'Perfect, please, call the test call with number 14049203888. This will ask you to enter your access code. For the purpose of this test, enter any random code like 1111111. After entering this, you will hear that the code is incorrect. Don\'t worry, that is expected to happen. That will mean that the call was successful and the dial pad is working. Please, take a screenshot of this and after it, proceed to hang up the call.\nUpload screenshot photo to continue.')
    }
    else if (buttonId === 'no_first_hung') {
      await sendMessageOptions(whatsappNumber, 'Please hung up!\nClick "DONE" when you hung up.',[
        {type:'reply',reply:{id:'yes_first_hung',title:'DONE'}}
      ])
    }
    else if (buttonId === 'yes_first_hung') {
      await sendMessageOptions(whatsappNumber, 'Great!\nWas the audio clear?',[
        {type:'reply',reply:{id:'yes_voice_clear',title:'Yes the voice was clear'}},
        {type:'reply',reply:{id:'no_voice_clear',title:'No the voice was not clear'}}
      ])
    }
    else if (buttonId === 'yes_voice_clear') {
      await sendMessageReply(whatsappNumber,`Now, call the test call with number 14049203817. This will connect you with the ALTA direct line. If you manage to hear the options provided by the automatic responder, take a screenshot of it, and hang up the call. Repeat this with the number 18884654648.`)
    }
    else if (buttonId === 'no_hung') {
      await sendMessageOptions(whatsappNumber,'Please hung up!\nClick "DONE" when you hung up',[
        {type:'reply',reply:{id:'yes_hung',title:'DONE'}}
      ])
    }
    else if (buttonId === 'yes_hung') {
      await sendMessageOptions(whatsappNumber,'Great!\nWas the audio clear for both calls?',[
        {type:'reply',reply:{id:'yes_voice_clear_finish',title:'Yes the voice was clear for both calls'}},
        {type:'reply',reply:{id:'no_voice_clear_finish',title:'No the voice was not clear for both calls'}}
      ])
    }
    else if (buttonId === 'yes_voice_clear_finish') {
      userSessions[whatsappNumber].done = true;
      await sendMessageReply(whatsappNumber,`Perfect, all the validations have been done successfully. You are ready to take your ALTA evaluation. Tomorrow, I will contact you one hour before your exam to run these validations again to make sure everything is ok. Please, remember the following considerations for your evaluation:\n
            -	You must use a computer. 
            -	You have to call the number 14049203888 and then enter the access code that has been provided via email.
            -	In case the access code doesn't work, hang up the call immediately and call any of the Contingency Numbers 14049203817 or 18884654648. In any of these lines, you must explain the issue that you have experienced, providing your identification and access code, and require them to proceed with the evaluation.
            \nThat’s it for now. Thanks for your time`)
    }
    else if (buttonId === 'no_logged' || buttonId === 'no_see_calls' || buttonId === 'no_voice_clear' || buttonId === 'no_voice_clear_finish') {
      userSessions[whatsappNumber].waiting = true;
      await sendMessageReply(whatsappNumber,'A techincal assistant from our team will contact you. Please, be patient.')
      await sendMessageOptions(supNumber,
        `Hello, applicant ${name} ${whatsappNumber} has a problem, his answer is (${buttonText})\nPlease press 'DONE' when you finish solving the problem.`,
        [
          {type:'reply',reply:{id:`${whatsappNumber},${buttonId.replace('yes','no')}`,title:'DONE'}}
        ]
      )
    }
    else {
      await sendMessageReply(whatsappNumber,'Please choose an option form the previous list')
    }

    return new Response('', { status: 200 });
  
  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { status: 500 });
  }
}

const sendMessageOptions = async function (number,message,options) {
  try {
    // await client.messages.create({
    //   from:twilioWhatsAppNumber,
    //   to:number,
    //   body:message,
    //   interactive: {
    //     type: 'button',
    //     body: { text: message },
    //     action: { buttons: options },
    //   },
    // })
    await client.messages.create({
      from:twilioWhatsAppNumber,
      to:number,
      contentSid: 'HX3eb4efa8fb8900593ed5d4e381e00e6d',
      contentVariables: JSON.stringify({
          1: message,
          2: options[0].reply.title,
          3: options[0].reply.id,
          4: options[1].reply.title,
          5: options[1].reply.id,
        }),
      })
  } catch (error) {
    console.error(`Failed to send message options: ${error}`);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { status: 500 });
  }
}

const sendMessageReply = async function (number,message) {
  try {
    await client.messages.create({
      from:twilioWhatsAppNumber,
      to:number,
      body:message
    })
  } catch (error) {
    console.error(`Failed to send message options: ${error}`);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { status: 500 });
  }
}