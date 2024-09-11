import twilio from 'twilio';
import { NextResponse } from 'next/server';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const MessagingResponse = twilio.twiml.MessagingResponse;

export async function POST(req) {
  const body = await req.json();
  const incomingMessage = body.Body.toLowerCase();
  const response = new MessagingResponse();

  if (incomingMessage === 'hi') {
    response.message('Hello! Choose an option:\n1. Option 1\n2. Option 2');
  } else if (incomingMessage === '1') {
    response.message('You selected Option 1');
  } else if (incomingMessage === '2') {
    response.message('You selected Option 2');
  } else {
    response.message("I didn't understand that. Please choose 1 or 2.");
  }

  return new NextResponse(response.toString(), { headers: { 'Content-Type': 'text/xml' } });
}
