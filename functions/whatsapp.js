const db = require('./db');
const axios = require('axios');

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
    const { rows } = await db.query(
      'SELECT config FROM settings WHERE id = 1'
    );
    return rows[0]?.config || {};
  } catch (error) {
    console.error("❌ Failed to fetch settings:", error);
    return {};
  }
}

///////////////////////////////////////////////////////////
// FORMAT PHONE NUMBER FOR WHATSAPP CLOUD API
// Must be international format WITHOUT +
// Example: +91 98765 43210 -> 919876543210
///////////////////////////////////////////////////////////
function formatPhone(number) {
  if (!number) return null;

  // remove spaces and + signs
  let cleaned = number.replace(/\\s/g, '').replace(/\\+/g, '');

  // remove leading 0 if user entered 0XXXXXXXXXX
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // if already starts with 91, just add +
  if (cleaned.startsWith('91')) {
    return '+' + cleaned;
  }

  // otherwise add +91
  return '+91' + cleaned;
}


///////////////////////////////////////////////////////////
// SEND WHATSAPP MESSAGE (REAL API CALL)
///////////////////////////////////////////////////////////
async function sendWhatsappMessage(recipientNumber, templateNameOrMessage, components = null) {
  try {
    const settings = await getSettings();
    const { whatsappSettings } = settings;

    if (
      !whatsappSettings ||
      !whatsappSettings.apiEnabled ||
      !whatsappSettings.apiKey
    ) {
      console.log("⚠️ WhatsApp API not configured. Skipping...", whatsappSettings);
      return { success: false, reason: "API not configured" };
    }

    const phone = formatPhone(recipientNumber);
    if (!phone) {
      console.log("⚠️ Invalid phone number");
      return { success: false, reason: "Invalid phone number" };
    }

    const url = `${whatsappSettings.apiUrl}`;

    let payload;
    if (components) {
      payload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateNameOrMessage,
          language: {
            code: "en",
          },
          components: components,
        },
      };
    } else {
      payload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: templateNameOrMessage,
        },
      };
    }

    console.log("✅ WhatsApp message payload:", JSON.stringify(payload, null, 2));

    const headers = {
      Authorization: `Bearer ${whatsappSettings.apiKey}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, payload, { headers });

    console.log("✅ WhatsApp message sent:", response.data);
    return { success: true, data: response.data };

  } catch (error) {
    const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error("❌ WhatsApp API ERROR:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

///////////////////////////////////////////////////////////
// WELCOME MESSAGE FOR NEW SIGNUP
///////////////////////////////////////////////////////////
async function sendWelcomeMessage(user) {
  let recipientNumber;
  try {
    const settings = await getSettings();
    const { whatsappSettings, siteName } = settings;
    const templateName = whatsappSettings?.welcomeMessageTemplateName || 'welcome_message';

    recipientNumber = user.phone;
    if (!recipientNumber) {
      console.log(`⚠️ No WhatsApp number for new user ${user.email}`);
      return;
    }

   const components = [
  {
    type: "body",
    parameters: [
      { type: "text", text: user.full_name || "Customer" },
      { type: "text", text: "https://ajrmart.com" },
    ],
  },
];

    const result = await sendWhatsappMessage(recipientNumber, templateName, components);
    await logWhatsappMessage({
      recipientNumber,
      messageContent: `Template: ${templateName} with components: ${JSON.stringify(components)}`,
      status: result.success ? 'success' : 'failed',
      reason: result.success ? JSON.stringify(result.data) : (result.error || result.reason),
      userId: user.id,
      messageType: 'new_user_signup'
    });

  } catch (error) {
    console.error("❌ Welcome message error:", error);
    await logWhatsappMessage({
      recipientNumber,
      messageContent: `Template: welcome_message`,
      status: 'failed',
      reason: error.message,
      userId: user.id,
      messageType: 'new_user_signup'
    });
  }
}


///////////////////////////////////////////////////////////
// ORDER CONFIRMATION MESSAGE
///////////////////////////////////////////////////////////
async function sendOrderConfirmation(order) {
  try {
    const settings = await getSettings();
    const { whatsappSettings, currency, siteName } = settings;

    // 1. Send CLIENT Notification
    const clientTemplateName = whatsappSettings?.orderConfirmationClientTemplateName || 'order_confirmation';
    const recipientNumber = order.shippingAddress?.whatsappNumber;

    if (recipientNumber) {
      const paymentMethodMap = {
        'razorpay': 'Online Payment',
        'cod': 'Cash on Delivery',
        'manual': 'Manual Payment'
      };
      const paymentMethod = paymentMethodMap[order.paymentMethod] || order.paymentMethod || 'Cash on Delivery';
      const isPaid = !!order.paymentId || (order.status !== 'Pending Payment' && order.paymentMethod !== 'cod');
      const paymentStatus = isPaid ? 'Paid ✅' : 'Pending ⏳';

      const clientComponents = [
        {
          type: "body",
          parameters: [
            { type: "text", text: order.customerName }, // 1
            { type: "text", text: siteName || 'AJR Mart' }, // 2
            { type: "text", text: order.orderNumber }, // 3
            { type: "text", text: `${currency || '₹'}${order.totalAmount.toFixed(2)}` }, // 4
            { type: "text", text: paymentMethod }, // 5
            { type: "text", text: paymentStatus }, // 6
            { type: "text", text: order.customerName }, // 7
            { type: "text", text: siteName || 'AJR Mart' }, // 8
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
              { type: "text", text: `account/orders/${order.id}` } // Just the ID for the dynamic URL
          ]
        }
      ];

      const clientResult = await sendWhatsappMessage(recipientNumber, clientTemplateName, clientComponents);
      await logWhatsappMessage({
        recipientNumber,
        messageContent: `Template: ${clientTemplateName}`,
        status: clientResult.success ? 'success' : 'failed',
        reason: clientResult.success ? JSON.stringify(clientResult.data) : (clientResult.error || clientResult.reason),
        orderId: order.id,
        userId: order.userId,
        messageType: 'order_confirmation_client'
      });
    } else {
      console.log(`⚠️ No WhatsApp number for order ${order.orderNumber}, skipping client notification.`);
    }

    // 2. Send ADMIN Notification
    const adminTemplateName = whatsappSettings?.orderConfirmationAdminTemplateName || 'order_confirmation_admin';
    const adminPhoneNumber = whatsappSettings?.adminPhoneNumber;

    if (adminPhoneNumber) {
      const address = order.shippingAddress;
      const fullAddress = `${address.fullName}, ${address.addressLine1}, ${address.city}, ${address.state}, ${address.postalCode}`;
      const itemsSummary = order.items.map(item => `${item.quantity} x ${item.product.name}`).join(', ');

      const paymentMethodMap = {
        'razorpay': 'Online Payment',
        'cod': 'Cash on Delivery',
        'manual': 'Manual Payment'
      };
      const paymentMethod = paymentMethodMap[order.paymentMethod] || order.paymentMethod || 'Cash on Delivery';
      const isPaid = !!order.paymentId || (order.status !== 'Pending Payment' && order.paymentMethod !== 'cod');
      const paymentStatus = isPaid ? 'Paid' : 'Pending';

      const adminComponents = [
        {
          type: "body",
          parameters: [
            { type: "text", text: order.customerName },
            { type: "text", text: recipientNumber || 'N/A' },
            { type: "text", text: order.orderNumber },
            { type: "text", text: `${currency || '₹'}${order.totalAmount.toFixed(2)}` },
            { type: "text", text: `${paymentMethod} (${paymentStatus})` },
            { type: "text", text: new Date(order.orderDate).toLocaleDateString('en-IN') },
            { type: "text", text: fullAddress },
            { type: "text", text: itemsSummary },
          ],
        },
         {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
              { type: "text", text: `admin/orders/${order.id}` } // Just the ID for the dynamic URL
          ]
        }
      ];

      const adminResult = await sendWhatsappMessage(adminPhoneNumber, adminTemplateName, adminComponents);
      await logWhatsappMessage({
        recipientNumber: adminPhoneNumber,
        messageContent: `Template: ${adminTemplateName}`,
        status: adminResult.success ? 'success' : 'failed',
        reason: adminResult.success ? JSON.stringify(adminResult.data) : (adminResult.error || adminResult.reason),
        orderId: order.id,
        userId: null, // Admin notification is not user-specific
        messageType: 'order_confirmation_admin'
      });
    } else {
      console.log('⚠️ Admin phone number not set, skipping admin notification.');
    }

  } catch (error) {
    console.error("❌ Order confirmation error:", error);
    // Log a general failure if the function fails before any API calls
    await logWhatsappMessage({
      recipientNumber: order.shippingAddress?.whatsappNumber || 'N/A',
      messageContent: 'Order confirmation failed before sending.',
      status: 'failed',
      reason: error.message,
      orderId: order.id,
      userId: order.userId,
      messageType: 'order_confirmation_failure'
    });
  }
}

///////////////////////////////////////////////////////////
// ORDER STATUS UPDATE MESSAGE
///////////////////////////////////////////////////////////
async function sendOrderStatusUpdate(order, status) {
  let recipientNumber;
  try {
    const settings = await getSettings();
    const { whatsappSettings, currency, siteName } = settings;

    recipientNumber = order.shippingAddress?.whatsappNumber;
    if (!recipientNumber) {
      console.log(`⚠️ No WhatsApp number for order ${order.orderNumber}`);
      return;
    }

    const templateName = whatsappSettings?.orderStatusUpdateTemplateName || 'order_status_update';
    
    let orderDetails = "";
    switch (status) {
      case "Processing":
        orderDetails = "Your order is currently being processed by our team. We are getting everything ready for you! ⏳";
        break;
      case "Shipped":
        orderDetails = `Great news! Your order has been shipped. 🚚\\nTracking ID: ${order.trackingId || 'N/A'}\\nEstimated Delivery: ${order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN') : 'N/A'}`;
        break;
      case "Delivered":
        orderDetails = "Yay! Your order has been delivered successfully. We hope you love it! 🎉";
        break;
      case "Cancelled":
        orderDetails = `Your order has been cancelled. ❌\\nReason: ${order.cancellationReason || 'Not provided'}`;
        break;
      default:
        orderDetails = `Your order status is now: ${status}.`;
    }

    const paymentMethodMap = {
      'razorpay': 'Online Payment',
      'cod': 'Cash on Delivery',
      'manual': 'Manual Payment'
    };
    const paymentMethod = paymentMethodMap[order.paymentMethod] || order.paymentMethod || 'Cash on Delivery';

    const components = [
      {
        type: "body",
        parameters: [
          { type: "text", text: order.customerName }, // 1
          { type: "text", text: siteName || 'AJR Mart' }, // 2
          { type: "text", text: order.orderNumber }, // 3
          { type: "text", text: status }, // 4
          { type: "text", text: `${currency || '₹'}${order.totalAmount.toFixed(2)}` }, // 5
          { type: "text", text: paymentMethod }, // 6
          { type: "text", text: orderDetails }, // 7
          { type: "text", text: order.customerName }, // 8
          { type: "text", text: siteName || 'AJR Mart' }, // 9
          { type: "text", text: siteName || 'AJR Mart' }, // 10
        ],
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [
            { type: "text", text: `account/orders/${order.id}` }
        ]
      }
    ];

    const result = await sendWhatsappMessage(recipientNumber, templateName, components);
    await logWhatsappMessage({
      recipientNumber,
      messageContent: `Template: ${templateName}`,
      status: result.success ? 'success' : 'failed',
      reason: result.success ? JSON.stringify(result.data) : (result.error || result.reason),
      orderId: order.id,
      userId: order.userId,
      messageType: `status_update_${status.toLowerCase()}`
    });

  } catch (error) {
    console.error("❌ Order status update error:", error);
    await logWhatsappMessage({
      recipientNumber,
      messageContent: `Template: status_update_${status.toLowerCase()}`,
      status: 'failed',
      reason: error.message,
      orderId: order.id,
      userId: order.userId,
      messageType: `status_update_${status.toLowerCase()}`
    });
  }
}

///////////////////////////////////////////////////////////
// OFFER CAMPAIGN MESSAGE
///////////////////////////////////////////////////////////
async function sendOfferCampaignMessage(recipientNumber, message) {
  let result;
  try {
    result = await sendWhatsappMessage(recipientNumber, message);
    await logWhatsappMessage({
      recipientNumber,
      messageContent: message,
      status: result.success ? 'success' : 'failed',
      reason: result.success ? JSON.stringify(result.data) : (result.error || result.reason),
      orderId: null,
      userId: null, // This is a system message, not tied to a specific user
      messageType: 'offer_campaign'
    });
  } catch (error) {
    console.error("❌ Offer campaign message error:", error);
    await logWhatsappMessage({
      recipientNumber,
      messageContent: message,
      status: 'failed',
      reason: error.message,
      orderId: null,
      userId: null,
      messageType: 'offer_campaign'
    });
  }
}


///////////////////////////////////////////////////////////
// TEST FUNCTION (optional)
///////////////////////////////////////////////////////////
async function testWhatsapp(number) {
  return await sendWhatsappMessage(
    number,
    "Hello 👋 This is a test message from AJR Store."
  );
}

///////////////////////////////////////////////////////////
module.exports = {
  sendWelcomeMessage,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendOfferCampaignMessage,
  testWhatsapp,
};
