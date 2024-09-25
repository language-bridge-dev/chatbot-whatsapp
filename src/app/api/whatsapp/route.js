import { Twilio } from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new Twilio(accountSid, authToken);

let userSessions = {};
const twilioWhatsAppNumber = 'whatsapp:+18633445007';
const supNumber = 'whatsapp:+201062791045';
const supName = 'Romany Moner'

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
    const waID = params.get('WaId');
    const text = params.get('Body')?.toLowerCase().trim();
    const buttonId = params.get('ButtonPayload');
    const buttonText = params.get('ButtonText');
    
    if (whatsappNumber === supNumber) {
      const [number, solver] = buttonId.split(/_(.+)/);
      console.log(number,solver);
      
      userSessions[number].waiting = false;
      await problemSolved(number,solver)
      await sendMessageReply(whatsappNumber,`Thank you, I notified the applicant.`)
      return new Response('', { status: 200 });
    }

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
        await client.messages.create({
          from:twilioWhatsAppNumber,
          to:whatsappNumber,
          contentSid: 'HXfb581d2e44c8a55ecf43387a3b1d61c9',
          contentVariables: JSON.stringify({
            yesOption:'first_hung',
            noOption:'first_hung',
          }),
        })
      }
      else if(!user.secondScreenId) {
        userSessions[whatsappNumber].secondScreenId = screenshot;
      }
      else if(!user.thirdScreenId) {
        userSessions[whatsappNumber].thirdScreenId = screenshot;
        await client.messages.create({
          from:twilioWhatsAppNumber,
          to:whatsappNumber,
          contentSid: 'HX6bb587bb61f67980d3c4255d9e357622',
          contentVariables: JSON.stringify({
            yesOption:'hung',
            noOption:'hung',
          }),
        })
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
      });
    }
    else if (buttonId === 'no_read') {
      await sendYesNoOption(whatsappNumber,name,'HX1e0e2461298dd5d4180e40d4ada7f244','read the email','read');
    }
    else if (buttonId === 'yes_read') {
      await sendYesNoOptions(whatsappNumber,'HX962a2a42bfb1b318e13741083ea729bf','logged');
    }
    else if (buttonId === 'yes_logged') {
      userSessions[whatsappNumber].logged = true;
      await sendYesNoOptions(whatsappNumber,'HXff58415e0a26cc8e8910c0d1e6d5f250','see_calls');
    }
    else if (buttonId === 'yes_see_calls') {
      userSessions[whatsappNumber].seeCalls = true;
      await sendMessageReply(whatsappNumber, 'Perfect, please, call the test call with number 14049203888. This will ask you to enter your access code. For the purpose of this test, enter any random code like 1111111. After entering this, you will hear that the code is incorrect. Don\'t worry, that is expected to happen. That will mean that the call was successful and the dial pad is working. Please, take a screenshot of this and after it, proceed to hang up the call.\nUpload screenshot photo to continue.')
    }
    else if (buttonId === 'no_first_hung') {
      await sendYesNoOption(whatsappNumber,name,'HX1e0e2461298dd5d4180e40d4ada7f244','hung up','first_hung');
    }
    else if (buttonId === 'yes_first_hung') {
      await sendYesNoOptions(whatsappNumber,'HXba5fb13b7adcac70aaef22f297084833','voice_clear');
    }
    else if (buttonId === 'yes_voice_clear') {
      await sendMessageReply(whatsappNumber,`Now, call the test call with number 14049203817. This will connect you with the ALTA direct line. If you manage to hear the options provided by the automatic responder, take a screenshot of it, and hang up the call. Repeat this with the number 18884654648.`)
    }
    else if (buttonId === 'no_hung') {
      await sendYesNoOption(whatsappNumber,name,'HX1e0e2461298dd5d4180e40d4ada7f244','hung up','hung')
    }
    else if (buttonId === 'yes_hung') {
      await sendYesNoOptions(whatsappNumber,'HX60b49497f274ee35e97cd4dad027c286','voice_clear_finish');
    }
    else if (buttonId === 'yes_voice_clear_finish') {
      userSessions[whatsappNumber].done = true;
      await sendMessageReply(whatsappNumber,
        `Perfect, all the validations have been done successfully. You are ready to take your ALTA evaluation. Tomorrow, I will contact you one hour before your exam to run these validations again to make sure everything is ok. Please, remember the following considerations for your evaluation:\n
        -	You must use a computer. 
        -	You have to call the number 14049203888 and then enter the access code that has been provided via email.
        -	In case the access code doesn't work, hang up the call immediately and call any of the Contingency Numbers 14049203817 or 18884654648. In any of these lines, you must explain the issue that you have experienced, providing your identification and access code, and require them to proceed with the evaluation.
        \nThat’s it for now. Thanks for your time`)
    }
    else if (buttonId === 'no_logged' || buttonId === 'no_see_calls' || buttonId === 'no_voice_clear' || buttonId === 'no_voice_clear_finish') {
      userSessions[whatsappNumber].waiting = true;
      await sendMessageReply(whatsappNumber,'A techincal assistant from our team will contact you. Please, be patient.')
      
      const applicantwaNumber = whatsappNumber;
      const solvedID = buttonId.replace('no','yes');
      console.log(solvedID);
      
      await sendSupport(supNumber,supName,'HXc3018dcc0abd4f5e07c3432e68e2c641',waID,buttonText,applicantwaNumber,solvedID);
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

const sendYesNoOptions = async function (number,contentSID,option) {
  await client.messages.create({
    from:twilioWhatsAppNumber,
    to:number,
    contentSid: contentSID,
    contentVariables: JSON.stringify({
      yesOption:option,
      noOption:option,
    }),
  })
}

const sendYesNoOption = async function (number,name,contentSID,step,option) {
  await client.messages.create({
    from:twilioWhatsAppNumber,
    to:number,
    contentSid: contentSID,
    contentVariables: JSON.stringify({
      name:name,
      step:step,
      option:option,
    }),
  })
}

const sendSupport = async function (supNumber,name,contentSID,applicantNumber,problem,applicantwaNumber,solvedID) {
  await client.messages.create({
    from:twilioWhatsAppNumber,
    to:supNumber,
    contentSid: contentSID,
    contentVariables: JSON.stringify({
      supName:name,
      number:applicantNumber,
      problem:problem,
      whatsappnumber:applicantwaNumber,
      solver:solvedID
    }),
  })
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

const problemSolved = async function (number,solver) {
  await client.messages.create({
    from:twilioWhatsAppNumber,
    to:number,
    contentSid: 'HXbeca98f80cc85b33fbf4c23144f78eca',
    contentVariables: JSON.stringify({
      solver:solver,
    }),
  })
}