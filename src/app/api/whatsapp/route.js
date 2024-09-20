import { Twilio } from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new Twilio(accountSid, authToken);

let userSessions = {};
// const twilioWhatsAppNumber = 'whatsapp:+18632234730';
const twilioWhatsAppNumber = 'whatsapp:+14155238886';
const supNumber = 'whatsapp:+201062791045';

function reminder() {
  console.log('Checking for reminders...');
  
  Object.keys(userSessions).forEach((number) => {
    const now = Date.now();
    const session = userSessions[number];

    if (session.done || session.waiting) return;

    const minutesSinceLastMessage = (now - session.lastSendTime) / 30000;

    if (minutesSinceLastMessage >= 2 && minutesSinceLastMessage <= 10) {
      console.log('sending a reminder');
      sendMessageReply(number,'Hello, please remember that you must complete this verification before your exam. Otherwise, it may be postponed or suspended.')
    }
  });
}

setInterval(reminder, 30000);

function getUserSession(number) {
  if (!userSessions[number]) {
    console.log('found user');
    userSessions[number] = {
      firstScreenId: null,
      secondScreenId: null,
      thirdScreenId: null,
      waiting:false,
      done:false,
      lastSendTime:Date.now()
    };
  }
  return userSessions[number];
}


export async function POST(req) {
  console.log(req.json());
  // try {
  //   const body = await req.json();
  //   const whatsappNumber = body.from;
  //   const text = body.Body.toLowerCase().trim();
  //   const buttonId = body.Interactive?.Button?.Payload;
  //   const buttonText = body.Interactive?.Button?.Text;
    
  //   // if (whatsappNumber === supNumber) {
  //   //   const [number, solver] = buttonId.split(',');
  //   //   userSessions[number].waiting = false;
  //   //   await sendMessageOptions(number,
  //   //     'The IT support solved the problem. Please press \'CONTINUE\' to proceed.',
  //   //     [{type:'reply',reply:{id:solver,text:'CONTINUE'}}]
  //   //   );
  //   //   await sendMessageReply(whatsappNumber,`Thank you, I notified ${number}.`)
  //   // }

  //   let user = getUserSession(whatsappNumber);

  //   // options must be [{type:'reply',reply:{id:'ID',title:''}}]    
  //   // type=> fixed  ID=> your id that coming in the request  title=> the text that showed in the user chat

  //   if (user.waiting) {
  //     await sendMessageReply(whatsappNumber,'A techincal assistant from our team will contact you. Please, be patient.')
  //   }

  //   if (user.done) {
  //     await sendMessageReply(whatsappNumber,`You are already ready to take your ALTA evaluation. I will contact you one hour before your exam to run these validations again to make sure everything is ok. Please, remember the following considerations for your evaluation:
  //           - You must use a computer. 
  //           - You have to call the number 14049203888 and then enter the access code that has been provided via email.
  //           - In case the access code doesn't work, hang up the call immediately and call any of the Contingency Numbers 14049203817 or 18884654648. In any of these lines, you must explain the issue that you have experienced, providing your identification and access code, and require them to proceed with the evaluation.
  //           \nThat's it for now. Thanks for your time`)
  //   }

  //   setLastSendTime(whatsappNumber);

  //   if (text === 'start') {
  //     await sendMessageOptions(whatsappNumber,
  //       'Hello , this is technical support from Multilingual Interpreters and Translators IT Department. I am writing to run some validations before taking your evaluation tomorrow. First of all, I would like you to confirm that you have checked the email sent by HR and that you have read the contents of this email, including the Manual of Use attached to it, and that you have watched the video instructive.',
  //       [
  //         {type:'reply',reply:{id:'yes_read',title:'Yes I read it'}},
  //         {type:'reply',reply:{id:'no_read',title:'No I did not read it'}}
  //       ]
  //     )
  //   }

  //   if (buttonId === 'no_read') {
  //     await sendMessageOptions(whatsappNumber,
  //       'Please read it and when you finish, press "DONE".',
  //       [
  //         {type:'reply',reply:{id:'yes_read',title:'Done reading the email'}},
  //       ]
  //     )
  //   }

  //   if (buttonId === 'yes_read'){
  //     await sendMessageOptions(whatsappNumber,
  //       'Thanks for your confirmation, now, we will start the validations. Can you please log in to our call center using the credentials given in the email?',
  //       [
  //         {type:'reply',reply:{id:'yes_logged',title:'Yes I logged in'}},
  //         {type:'reply',reply:{id:'no_logged',title:'No I cannot log in'}}
  //       ]      
  //     )
  //   }

  //   if (buttonId === 'yes_logged') {
  //     await sendMessageOptions(whatsappNumber,
  //       'Great! Now please log in to your evaluation portal and confirm that you are able to see the audio and video setup.',
  //       [
  //         {type:'reply',reply:{id:'yes_see_calls',title:'Yes I can see the calls'}},
  //         {type:'reply',reply:{id:'no_see_calls',title:'No I cannot see the calls'}}
  //       ]
  //     )
  //   }

  //   if (buttonId === 'yes_see_calls') {
  //     await sendMessageReply(whatsappNumber, 'Perfect, please, call the test call with number 14049203888. This will ask you to enter your access code. For the purpose of this test, enter any random code like 1111111. After entering this, you will hear that the code is incorrect. Don\'t worry, that is expected to happen. That will mean that the call was successful and the dial pad is working. Please, take a screenshot of this and after it, proceed to hang up the call.\n📎 Upload screenshot photo to continue.')
  //   }

  //   if (buttonId === 'no_logged' || buttonId === 'no_see_calls') {
  //     userSessions[whatsappNumber].waiting = true;
  //     await sendMessageReply(whatsappNumber,'A techincal assistant from our team will contact you. Please, be patient.')
  //     await sendMessageOptions(supNumber,
  //       `Hello, applicant ${whatsappNumber} has a problem, his answer is (${buttonText})\nPlease press 'DONE' when you finish.`,
  //       [
  //         {type:'reply',reply:{id:`${whatsappNumber},${buttonId.replace('yes','no')}`,title:'DONE'}}
  //       ]
  //     )
  //   }

  //   return new Response(JSON.stringify({ success: true }), { status: 200 });
  
  // } catch (error) {
    //   console.error('Error handling WhatsApp webhook:', error);
    
    //   return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { status: 500 });
    // }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

const sendMessageOptions = async function (number,message,options) {
  try {
    await client.messages.create({
      from:twilioWhatsAppNumber,
      to:number,
      interactive: {
        type: 'button',
        body: { text: message },
        action: { buttons: options },
      },
    })
    return new Response(JSON.stringify({ success: true }), { status: 200 });
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
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error(`Failed to send message options: ${error}`);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { status: 500 });
  }
}