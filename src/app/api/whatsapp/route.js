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
    const buttonId = params.get('ButtonPayload');
    const buttonText = params.get('ButtonText');
    
    // if (whatsappNumber === supNumber) {
    //   const [number, solver] = buttonId.split(',');
    //   userSessions[number].waiting = false;
    //   await sendMessageOption(number,
    //     'The IT support solved the problem. Please press "CONTINUE" to proceed.',
    //     {id:solver,text:'CONTINUE'}
    //   );
    //   await sendMessageReply(whatsappNumber,`Thank you, I notified ${number}.`)
    //   return new Response('', { status: 200 });
    // }

    let [user, newUser] = getUserSession(whatsappNumber);

    // options must be [{id:'ID',title:''}]    
    // ID=> your id that coming in the request  title=> the text that showed in the user chat

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
        await sendMessageOptions(whatsappNumber,
          'Perfect, thanks for that screenshot. Have you hung up already?',[
          {id:'yes_first_hung',title:'Yes I did hung up'},
          {id:'no_first_hung',title:'No I did not hung up'},
        ])
      }
      else if(!user.secondScreenId) {
        userSessions[whatsappNumber].secondScreenId = screenshot;
      }
      else if(!user.thirdScreenId) {
        userSessions[whatsappNumber].thirdScreenId = screenshot;
        await sendMessageOptions(whatsappNumber,
          'Perfect, thanks for the screenshots. Have you hung up already for both calls?',[
          {id:'yes_hung',title:'Yes I did hung up for both calls'},
          {id:'no_hung',title:'No I did not hung up for both calls'},
        ])
      }
      else {
        await sendMessageReply(whatsappNumber,'You already added the 3 screenshots.\nPlease continue the steps or choose form the previous list.')
      }
      return new Response('', { status: 200 });
    }

    if (text === 'start') {
      await client.messages.create({
        from:twilioWhatsAppNumber,
        to:whatsappNumber,
        contentSid: 'HX4d70768b429e3ccf72207ae99622e313',
        contentVariables: JSON.stringify({
          name:name,
          yesOption:'read',
          noOption:'read',
        }),
      })
    }
    else if (buttonId === 'no_read') {
      await client.messages.create({
        from:twilioWhatsAppNumber,
        to:whatsappNumber,
        contentSid: 'HXef8fc98e5846a1a1dc1a6f2e12784fef',
        contentVariables: JSON.stringify({
          name:name,
          step:'read it and when you finish press "CONTINUE"',
          option:'read',
        }),
      })
    }
    else if (buttonId === 'yes_read') {
      await client.messages.create({
        from:twilioWhatsAppNumber,
        to:whatsappNumber,
        contentSid: 'HX962a2a42bfb1b318e13741083ea729bf',
        contentVariables: JSON.stringify({
          yesOption:'logged',
          noOption:'logged',
        }),
      })
    }
    else if (buttonId === 'yes_logged') {
      userSessions[whatsappNumber].logged = true;
      await client.messages.create({
        from:twilioWhatsAppNumber,
        to:whatsappNumber,
        contentSid: 'HXff58415e0a26cc8e8910c0d1e6d5f250',
        contentVariables: JSON.stringify({
          yesOption:'see_calls',
          noOption:'see_calls',
        }),
      })
    }
    else if (buttonId === 'yes_see_calls') {
      userSessions[whatsappNumber].seeCalls = true;
      await sendMessageReply(whatsappNumber, 'Perfect, please, call the test call with number 14049203888. This will ask you to enter your access code. For the purpose of this test, enter any random code like 1111111. After entering this, you will hear that the code is incorrect. Don\'t worry, that is expected to happen. That will mean that the call was successful and the dial pad is working. Please, take a screenshot of this and after it, proceed to hang up the call.\nUpload screenshot photo to continue.')
    }
    else if (buttonId === 'no_first_hung') {
      await sendMessageOption(whatsappNumber,
        'Please hung up!\nClick "DONE" when you hung up.',
        {id:'yes_first_hung',title:'DONE'},
      )
    }
    else if (buttonId === 'yes_first_hung') {
      await sendMessageOptions(whatsappNumber, 'Great!\nWas the audio clear?',[
        {id:'yes_voice_clear',title:'Yes the voice was clear'},
        {id:'no_voice_clear',title:'No the voice was not clear'},
      ])
    }
    else if (buttonId === 'yes_voice_clear') {
      await sendMessageReply(whatsappNumber,`Now, call the test call with number 14049203817. This will connect you with the ALTA direct line. If you manage to hear the options provided by the automatic responder, take a screenshot of it, and hang up the call. Repeat this with the number 18884654648.`)
    }
    else if (buttonId === 'no_hung') {
      await sendMessageOption(whatsappNumber,
        'Please hung up!\nClick "DONE" when you hung up',
        {id:'yes_hung',title:'DONE'},
      )
    }
    else if (buttonId === 'yes_hung') {
      await sendMessageOptions(whatsappNumber,'Great!\nWas the audio clear for both calls?',[
        {id:'yes_voice_clear_finish',title:'Yes the voice was clear for both calls'},
        {id:'no_voice_clear_finish',title:'No the voice was not clear for both calls'},
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
      const newId = whatsappNumber+','+buttonId.replace('yes','no')
      await sendMessageOption(supNumber,
        `Hello, applicant ${whatsappNumber} has a problem, his answer is (${buttonText})\nPlease press 'DONE' when you finish solving the problem.`,
        {id:newId,title:'DONE'},
      )
    }
    else {
      await sendMessageReply(whatsappNumber,'Please choose an option form the previous list');
    }

    return new Response('', { status: 200 });
  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { status: 500 });
  }
}

const sendMessageOptions = async function (number,message,options) {
  try {
    await client.messages.create({
      from:twilioWhatsAppNumber,
      to:number,
      contentSid: 'HX8867e37db2e45a5060ff3b57983f96d5',
      contentVariables: JSON.stringify({
          1: message,
          2: options[0].title,
          3: options[0].id,
          4: options[1].title,
          5: options[1].id,
        }),
      })
  } catch (error) {
    console.error(`Failed to send message options: ${error}`);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { status: 500 });
  }
}

const sendMessageOption = async function (number,message,option) {
  try {
    await client.messages.create({
      from:twilioWhatsAppNumber,
      to:number,
      contentSid: 'HXabb62a4134b2c52500cecc2b2c7d6efd',
      contentVariables: JSON.stringify({
          1: message,
          2: option.title,
          3: option.id,
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