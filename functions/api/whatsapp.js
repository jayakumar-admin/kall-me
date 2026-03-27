const express = require('express');
const db = require('../db');
const axios = require('axios');
const router = express.Router();

const templates = {
  ACCOUNT_CREATED: (params) => `Hello ${params.Name},

Your account has been successfully created on Kall Me.

Role: ${params.Role}
Username: ${params.Username}

Set your password using the link below:
${params.PasswordLink}

If you did not request this, please contact support.`,
  ORDER_ASSIGNED: (params) => `Hello ${params.DeliveryPersonName},

You have received a new delivery assignment.

Order Details:
Order Date: ${params.OrderDate}
Restaurant: ${params.Restaurant}
Items Ordered: ${params.MenuItems}
Delivery Charge: ₹${params.DeliveryCharge}

Please confirm the pickup from the restaurant and start the delivery.

Thank you for your service.

- Kall Me Team`,
  CUSTOMER_INVOICE: (params) => `Hello ${params.CustomerName},

Thank you for your order with Kall Me.

Order Details:
Order ID: ${params.OrderID}
Order Date: ${params.OrderDate}
Amount Paid: ₹${params.AmountPaid}

Please find your invoice attached in this message.

- Kall Me Team`
};

///////////////////////////////////////////////////////////
// LOG WHATSAPP MESSAGE TO DB
///////////////////////////////////////////////////////////
async function logWhatsappMessage({ recipientNumber, messageContent, status, reason, orderId, userId, messageType }) {
  try {
    await db.query(
      `INSERT INTO whatsapp_logs (recipient_number, message_content, status, reason, order_id, user_id, message_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [recipientNumber, messageContent, status, reason, orderId, userId, messageType]
    );
  } catch (error) {
    console.error("❌ Failed to log WhatsApp message:", error);
    // This function should not throw an error back to the caller,
    // as logging failure is not a critical part of the user-facing flow.
  }
}

///////////////////////////////////////////////////////////
// GET SETTINGS FROM DB
///////////////////////////////////////////////////////////
async function getSettings() {
  try {
    const result = await db.query('SELECT * FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  } catch (error) {
    console.error("❌ Failed to fetch settings:", error);
    return {};
  }
}

///////////////////////////////////////////////////////////
// FORMAT PHONE NUMBER
///////////////////////////////////////////////////////////
function formatPhone(phone) {
  if (!phone) return null;
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  // If it starts with '0', remove the '0'
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  // Optional: Ensure it has the country code (e.g., '91' for India)
  // If your users are primarily in India and might enter numbers without '91'
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

///////////////////////////////////////////////////////////
// CORE FUNCTION: SEND WHATSAPP MESSAGE
///////////////////////////////////////////////////////////
async function sendWhatsappMessage({
  recipientNumber,
  templateName,
  languageCode = 'en',
  components = [],
  orderId = null,
  userId = null,
  messageType = 'general',
}) {
  try {
    const settings = await getSettings();
    const whatsappSettings = settings.whatsapp || {};

    // 1. Check if API is enabled and credentials exist
    if (
      !whatsappSettings ||
      !whatsappSettings.enabled ||
      !whatsappSettings.apiKey
    ) {
      console.log("⚠️ WhatsApp API is disabled or missing credentials in settings.");
      return { success: false, reason: 'Disabled or missing credentials' };
    }

    const { apiUrl, apiKey } = whatsappSettings;

    // 2. Format the phone number
    const formattedNumber = formatPhone(recipientNumber);
    if (!formattedNumber) {
      console.log("⚠️ Invalid phone number provided for WhatsApp.");
      return { success: false, reason: 'Invalid phone number' };
    }

    // 3. Construct the payload for WhatsApp Cloud API
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedNumber,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components: components,
      },
    };

    // 4. Make the API call
    console.log(`🚀 Sending WhatsApp template '${templateName}' to ${formattedNumber}...`);
    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log("✅ WhatsApp message sent successfully:", response.data);

    // 5. Log success to DB
    await logWhatsappMessage({
      recipientNumber: formattedNumber,
      messageContent: `Template: ${templateName}`,
      status: 'success',
      reason: null,
      orderId,
      userId,
      messageType,
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error.response?.data || error.message);

    // 6. Log failure to DB
    await logWhatsappMessage({
      recipientNumber: recipientNumber,
      messageContent: `Template: ${templateName}`,
      status: 'failed',
      reason: error.response?.data?.error?.message || error.message,
      orderId,
      userId,
      messageType,
    });

    return { success: false, error: error.response?.data || error.message };
  }
}

///////////////////////////////////////////////////////////
// SPECIFIC MESSAGE FUNCTIONS
///////////////////////////////////////////////////////////

async function sendWelcomeMessage(user) {
  const settings = await getSettings();
  const whatsappSettings = settings.whatsapp || {};
  const templateName = whatsappSettings?.welcomeMessageTemplate || 'welcome_message';

  return sendWhatsappMessage({
    recipientNumber: user.mobile || user.phone,
    templateName: templateName,
    languageCode: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: user.name || 'User' },
        ],
      },
    ],
    userId: user.id,
    messageType: 'welcome',
  });
}

async function sendOrderConfirmation(order, customer, adminPhone) {
  const settings = await getSettings();
  const whatsappSettings = settings.whatsapp || {};
  
  const clientTemplate = whatsappSettings?.orderConfirmationClientTemplate || 'order_confirmation_client';
  const adminTemplate = whatsappSettings?.orderConfirmationAdminTemplate || 'order_confirmation_admin';

  // 1. Send to Client
  const clientResult = await sendWhatsappMessage({
    recipientNumber: customer.mobile || customer.phone,
    templateName: clientTemplate,
    languageCode: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: customer.name || 'Customer' },
          { type: 'text', text: order.id.toString() },
          { type: 'text', text: order.total_amount.toString() },
        ],
      },
    ],
    orderId: order.id,
    userId: customer.id,
    messageType: 'order_confirmation_client',
  });

  // 2. Send to Admin (if adminPhone is provided)
  let adminResult = null;
  if (adminPhone) {
    adminResult = await sendWhatsappMessage({
      recipientNumber: adminPhone,
      templateName: adminTemplate,
      languageCode: 'en',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: order.id.toString() },
            { type: 'text', text: customer.name || 'Customer' },
            { type: 'text', text: order.total_amount.toString() },
          ],
        },
      ],
      orderId: order.id,
      messageType: 'order_confirmation_admin',
    });
  }

  return { clientResult, adminResult };
}

async function sendOrderStatusUpdate(order, customer, newStatus) {
  const settings = await getSettings();
  const whatsappSettings = settings.whatsapp || {};
  
  // You might want different templates based on the status
  // e.g., 'order_shipped', 'order_delivered', etc.
  // For simplicity, assuming one generic status update template here
  const templateName = whatsappSettings?.orderStatusUpdateTemplateName || 'order_status_update';

  return sendWhatsappMessage({
    recipientNumber: customer.mobile || customer.phone,
    templateName: templateName,
    languageCode: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: customer.name || 'Customer' },
          { type: 'text', text: order.id.toString() },
          { type: 'text', text: newStatus },
        ],
      },
    ],
    orderId: order.id,
    userId: customer.id,
    messageType: 'order_status_update',
  });
}

async function sendOrderAssignedMessage(dp, order, hotelName, items, shippingFee) {
  const settings = await getSettings();
  const whatsappSettings = settings.whatsapp || {};
  const templateName = whatsappSettings?.orderAssignedTemplateName || 'kall_me_deliveryalert';

  return sendWhatsappMessage({
    recipientNumber: dp.mobile,
    templateName: templateName,
    languageCode: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: dp.name },
          { type: 'text', text: new Date().toLocaleDateString() },
          { type: 'text', text: hotelName },
          { type: 'text', text: items.map(i => i.menu_name + ' - ' + i.quantity).join(', ') },
          { type: 'text', text: shippingFee.toString() },
        ],
      },
    ],
    orderId: order.id,
    messageType: 'order_assigned',
  });
}

async function sendCustomerInvoiceMessage(customerPhone, order, grandTotal) {
  const settings = await getSettings();
  const whatsappSettings = settings.whatsapp || {};
  const templateName = whatsappSettings?.customerInvoiceTemplateName || 'kall_me_attach ';

  return sendWhatsappMessage({
    recipientNumber: customerPhone,
    templateName: templateName,
    languageCode: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: "Dear Customer" },
          { type: 'text', text: order.order_number },
          { type: 'text', text: new Date().toLocaleDateString() },
          { type: 'text', text: grandTotal.toString() },
        ],
      },
    ],
    orderId: order.id,
    messageType: 'customer_invoice',
  });
}

async function sendOfferCampaignMessage(campaign, users) {
  const settings = await getSettings();
  const whatsappSettings = settings.whatsapp || {};
  const templateName = campaign.templateName || whatsappSettings?.defaultOfferTemplateName || 'special_offer';

  const results = [];
  // Note: For large campaigns, consider batching or using a queue system (like BullMQ)
  // to avoid hitting rate limits or timing out the request.
  for (const user of users) {
    const result = await sendWhatsappMessage({
      recipientNumber: user.mobile || user.phone,
      templateName: templateName,
      languageCode: 'en',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: user.name || 'Customer' },
            { type: 'text', text: campaign.offerDetails || 'Special Offer' },
            { type: 'text', text: campaign.discountCode || 'DISCOUNT' },
          ],
        },
      ],
      userId: user.id,
      messageType: 'offer_campaign',
    });
    results.push({ userId: user.id, result });
  }
  return results;
}

async function testWhatsapp(testNumber) {
  return sendWhatsappMessage({
    recipientNumber: testNumber,
    templateName: 'hello_world', // A standard Meta test template
    languageCode: 'en_US',
    messageType: 'test',
  });
}

// Keep the old sendWhatsAppMessage function for backward compatibility
const sendWhatsAppMessage = async (to, templateName, messageOrParams) => {
  let messageText = messageOrParams;
  if (typeof messageOrParams === 'object' && messageOrParams !== null) {
    if (templates[templateName]) {
      messageText = templates[templateName](messageOrParams);
    } else {
      messageText = JSON.stringify(messageOrParams);
    }
  } else if (typeof messageOrParams === 'string') {
    messageText = messageOrParams;
  } else {
    messageText = JSON.stringify(messageOrParams);
  }

  return sendWhatsappMessage({
    recipientNumber: to,
    templateName: templateName,
    languageCode: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: messageText },
        ],
      },
    ],
    messageType: 'legacy',
  });
};

// Get WhatsApp logs
router.get('/logs', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, 
        recipient_number as recipient, 
        message_type as template_name, 
        message_content as message, 
        status, 
        created_at 
      FROM whatsapp_logs 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/send', async (req, res) => {
  const { to, templateName, parameters } = req.body;
  
  try {
    await sendWhatsAppMessage(to, templateName, parameters);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = {
  router,
  sendWhatsAppMessage,
  sendWhatsappMessage,
  sendWelcomeMessage,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendOrderAssignedMessage,
  sendCustomerInvoiceMessage,
  sendOfferCampaignMessage,
  testWhatsapp,
  templates,
};
