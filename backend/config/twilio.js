require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER;

const client = twilio(accountSid, authToken);

const sendWhatsApp = async (to, message) => {
  try {
    const result = await client.messages.create({
      body: message,
      from: `whatsapp:${twilioWhatsApp}`,
      to: `whatsapp:${to}`
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const sendSMS = async (to, message) => {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = { sendWhatsApp, sendSMS };
