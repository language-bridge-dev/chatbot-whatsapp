import { Twilio } from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new Twilio(accountSid, authToken);

let userSessions = {};
const twilioWhatsAppNumber = 'whatsapp:+18633445007';
const supNumber = 'whatsapp:+573197741990';
// const hrNumber = 'whatsapp:+593991434326';
const initiator = 'whatsapp:+51945628224';
const hrNumber = 'whatsapp:+201553779224';
// const hrNumber = 'whatsapp:+201156596285';
// const initiator = 'whatsapp:+201156596285'
const invalidMSGNum = 10

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

function createApplicant(number,name){
  userSessions[number] = {
    name:name,
    readEmail:false,
    logged:false,
    seeCalls:false,
    firstScreenId: null,
    secondScreenId: null,
    thirdScreenId: null,
    waitingImage:false,
    invalidMessages:0,
    waiting:false,
    done:false,
    lastSendTime:Date.now()
  };
  return userSessions[number];
}

export async function POST(req) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    console.log(params);
    
    const whatsappNumber = params.get('From');
    const waID = params.get('WaId');
    // const text = params.get('Body')?.toLowerCase().trim();
    const buttonId = params.get('ButtonPayload');

    if (whatsappNumber === supNumber) {
      const [number, solver] = buttonId.split(/_(.+)/);
      console.log(number,solver);
      userSessions[number].waiting = false;
      await problemSolved(number,solver);
      await sendMessageReply(whatsappNumber,`Thank you, I notified the applicant.`);
      return new Response('', { status: 200 });
    }

    if (whatsappNumber === initiator) {
      let [newNumber,newName] = params.get('Body').split(',');
      newName = newName.trim();
      newNumber = `whatsapp:+${newNumber.trim()}`;
      createApplicant(newNumber,newName);
      console.log(userSessions[newNumber]);
      await client.messages.create({
        from:twilioWhatsAppNumber,
        to:newNumber,
        contentSid: 'HX03991f1e7525d4ca3949640bbabe05d3',
        contentVariables: JSON.stringify({
          name:newName,
          yesOption:'read',
          noOption:'read',
        })
      });
      return new Response('', { status: 200 });
    }

    let user = userSessions[whatsappNumber];
    const name = (user.name===undefined)?params.get('ProfileName'):user.name;

    if (user.waiting) {
      await sendMessageReply(whatsappNumber,'Please, be patient and wait until the issue is solved');
      return new Response('', { status: 200 });
    }

    if (user.done) {
      return new Response('', { status: 200 });
    }

    if (user.invalidMessages >= invalidMSGNum){
      await sendMessageReply(whatsappNumber,'Please, wait until one member of our IT support gets in contact with you.')
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
        userSessions[whatsappNumber].waitingImage = false;
        await client.messages.create({
          from:twilioWhatsAppNumber,
          to:whatsappNumber,
          contentSid: 'HX12ad5380133792f4b489b2f3cbcd12a5',
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
        userSessions[whatsappNumber].waitingImage = false;
        await client.messages.create({
          from:twilioWhatsAppNumber,
          to:whatsappNumber,
          contentSid: 'HX0faa7e154d326ebb75a32a329c19766a',
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
    
    if (user.waitingImage) {
      await sendMessageReply(whatsappNumber,'Please, provide the screenshot/s that we asked')
      return new Response('', { status: 200 });
    }

    if (buttonId === 'no_read') {
      await sendYesNoOption(whatsappNumber,name,'HX43bc1c1f84ba338deddccef7b3bf1d56','read the email','read');
    }
    else if (buttonId === 'yes_read') {
      await sendYesNoOptions(whatsappNumber,'HX880467ac87fc57ff0efb635aa228df98','logged');
    }
    else if (buttonId === 'yes_logged') {
      userSessions[whatsappNumber].logged = true;
      await sendYesNoOptions(whatsappNumber,'HX93b6e6a585101daa6421387f779ea27f','see_calls');
    }
    else if (buttonId === 'yes_see_calls') {
      userSessions[whatsappNumber].seeCalls = true;
      await sendMessageReply(whatsappNumber, 'Perfect, please, call the *test call* with number *14049203888*. This will ask you to enter your access code. For the purpose of this test, enter any random code like 1111111. After entering this, you will hear that the code is incorrect. Don\'t worry, that is expected to happen. That will mean that the call was successful and the dial pad is working. Please, take a screenshot of this and after it, proceed to hang up the call.\nUpload screenshot photo to continue.')
      userSessions[whatsappNumber].waitingImage = true;
    }
    else if (buttonId === 'no_first_hung') {
      await sendYesNoOption(whatsappNumber,name,'HX43bc1c1f84ba338deddccef7b3bf1d56','hang up','first_hung');
    }
    else if (buttonId === 'yes_first_hung') {
      await sendYesNoOptions(whatsappNumber,'HXde028ba788bf9c07966650b66007e0b6','voice_clear');
    }
    else if (buttonId === 'yes_voice_clear') {
      await sendMessageReply(whatsappNumber,`Now, call the *test call* with number *14049203817*. This will connect you with the *ALTA* direct line. If you manage to hear the options provided by the automatic responder, take a screenshot of it, and hang up the call. Repeat this with the number *18884654648*.\nPlease send the 2 screenshots to continue.`)
      userSessions[whatsappNumber].waitingImage = true;
    }
    else if (buttonId === 'no_hung') {
      await sendYesNoOption(whatsappNumber,name,'HX43bc1c1f84ba338deddccef7b3bf1d56','hang up','hung')
    }
    else if (buttonId === 'yes_hung') {
      await sendYesNoOptions(whatsappNumber,'HXe9185f2584e83ffd2cbb2f39a83cc5ae','voice_clear_finish');
    }
    else if (buttonId === 'yes_voice_clear_finish') {
      userSessions[whatsappNumber].done = true;
      await sendMessageReply(whatsappNumber,
        `Perfect, all the validations have been done successfully. You are ready to take your ALTA evaluation. Tomorrow, I will contact you one hour before your exam to run these validations again to make sure everything is ok. Please, remember the following considerations for your evaluation:\n
        -	You must use a computer. 
        -	You have to call the number *14049203888* and then enter the access code that has been provided via email.
        -	In case the access code doesn't work, hang up the call immediately and call any of the Contingency Numbers *14049203817* or *18884654648*. In any of these lines, you must explain the issue that you have experienced, providing your identification and access code, and require them to proceed with the evaluation.
        \nThat’s it for now. Thanks for your time`)

      await sendMessageReply(hrNumber,`The applicant ${name} ${waID} has finished the first check for the ALTA evaluation.`).then((res) => {
        console.log('message sent to hr successfully'+res);
      }).catch(err=>{
        console.log(err);
      })
      await sendMessageReply(supNumber,`The applicant ${name} ${waID} has finished the first check for the ALTA evaluation.`).then((res) => {
        console.log('message sent to support successfully'+res);
      }).catch(err=>{
        console.log(err);
      })

      //await sendMessageReply() to the support to notify him
    }
    else if (buttonId === 'no_logged') {
      userSessions[whatsappNumber].waiting = true;
      await sendMessageReply(whatsappNumber,'A technical assistant from our team will contact you. Please, be patient.')
      await sendSupport(supNumber,'HX30afc9bbda97af3fede6a8088e23f076',name,waID,whatsappNumber);
    }
    else if (buttonId === 'no_see_calls') {
      userSessions[whatsappNumber].waiting = true;
      await sendMessageReply(whatsappNumber,'A technical assistant from our team will contact you. Please, be patient.')
      await sendSupport(supNumber,'HX71fa9f199d66c829ca0232516513b005',name,waID,whatsappNumber);
    }
    else if (buttonId === 'no_voice_clear') {
      userSessions[whatsappNumber].waiting = true;
      await sendMessageReply(whatsappNumber,'A technical assistant from our team will contact you. Please, be patient.')
      await sendSupport(supNumber,'HX03430b41d64f4332de3f29cbc54d3c6c',name,waID,whatsappNumber);
    }
    else if (buttonId === 'no_voice_clear_finish') {
      userSessions[whatsappNumber].waiting = true;
      await sendMessageReply(whatsappNumber,'A technical assistant from our team will contact you. Please, be patient.')
      await sendSupport(supNumber,'HXf8e224bab3e2940b05020675ca233afa',name,waID,whatsappNumber);
    }
    else {
      userSessions[whatsappNumber].invalidMessages+=1;
      if (userSessions[whatsappNumber].invalidMessages >= invalidMSGNum){
        await invalidMessages(whatsappNumber,name,waID);
      }
      else {
        await sendMessageReply(whatsappNumber,'Please, choose an option from the previous list');
      }
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

const sendSupport = async function (number,contentSID,applicantName,applicantNumber,applicantWA) {
  await client.messages.create({
    from:twilioWhatsAppNumber,
    to:number,
    contentSid: contentSID,
    contentVariables: JSON.stringify({
      name:applicantName,
      applicantNumber:applicantNumber,
      applicantWA:applicantWA,
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
    contentSid: 'HX73c114169d8bc2f36938a81ee4043f03',
    contentVariables: JSON.stringify({
      solver:solver,
    }),
  })
}

const invalidMessages = async function (number,name,waID) {
  await sendMessageReply(number,'It seems you have doubts about how to proceed. I will refer you to our IT department so you can get assistance.');
  await sendMessageReply(supNumber,`The applicant is not following the instructions.\n${name} ${waID}`);
}