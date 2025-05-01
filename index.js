// BlueBubbles + GHL Integration - Complete Implementation
// This implementation properly handles both inbound and outbound messages
// with explicit GHL conversation logging and enhanced debugging

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const crypto = require("crypto");

// Initialize Express
const app = express();
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// GHL API constants
const GHL_API_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

// Store tokens (in memory for demo, use a database in production)
let tokens = {};

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check route with install page
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>BlueBubbles iMessage Integration for GHL</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; }
        .status { padding: 8px 12px; border-radius: 4px; display: inline-block; }
        .status.online { background-color: #2ecc71; color: white; }
        pre { background-color: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <h1>BlueBubbles iMessage Integration for Go High Level</h1>
      
      <div class="card">
        <h2>Status: <span class="status online">Online</span></h2>
        <p>This integration allows you to send and receive iMessages directly through your GHL account.</p>
        <p><a href="/install" class="button">Install in your GHL account</a></p>
      </div>
      
      <div class="card">
        <h2>Features</h2>
        <ul>
          <li>Send messages via iMessage (blue bubbles) instead of SMS</li>
          <li>Receive inbound iMessages in your GHL conversations</li>
          <li>Use in workflows for automated messaging</li>
          <li>Consistent conversation threading</li>
        </ul>
      </div>
      
      <div class="card">
        <h2>Setup Instructions</h2>
        <ol>
          <li>Click the "Install in your GHL account" button above</li>
          <li>Authorize the app for your GHL location</li>
          <li>Configure BlueBubbles webhook to point to <code>${process.env.APP_URL}/inbound</code></li>
          <li>Start sending iMessages through GHL!</li>
        </ol>
      </div>
      
      <div class="card">
        <h2>Webhook Configuration for GHL Workflows</h2>
        <p>Use this format in your GHL workflow webhook:</p>
        <pre>{
  "to": "+1{{contact.phone}}",
  "message": "Your message here"
}</pre>
      </div>
    </body>
    </html>
  `);
});

// OAuth installation URL
app.get("/install", (req, res) => {
  const clientId = process.env.GHL_CLIENT_ID || "68131529e7e1f17f16ab9251-ma4zu8af";
  const redirectUri = encodeURIComponent(`${process.env.APP_URL}/oauth-callback`);
  const state = crypto.randomBytes(16).toString("hex");
  
  // Store state for verification
  tokens[state] = { timestamp: Date.now() };
  
  // Full scopes based on what you provided
  const scope = "conversations.readonly conversations.write conversations/message.readonly conversations/message.write contacts.readonly contacts.write locations.readonly";
  
  const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${encodeURIComponent(scope)}`;
  
  res.redirect(authUrl);
});

// OAuth callback
app.get("/oauth-callback", async (req, res) => {
  const { code, state, locationId } = req.query;
  
  // Verify state to prevent CSRF
  if (!tokens[state]) {
    return res.status(400).send("Invalid state parameter");
  }
  
  try {
    console.log("Received OAuth callback. Exchanging code for tokens...");
    
    // Exchange code for tokens
    const tokenResponse = await axios.post(`${GHL_API_URL}/oauth/token`, {
      client_id: process.env.GHL_CLIENT_ID || "68131529e7e1f17f16ab9251-ma4zu8af",
      client_secret: process.env.GHL_CLIENT_SECRET || "1929b3af-6d73-4bfb-aa1b-082509d1861d",
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.APP_URL}/oauth-callback`
    });
    
    console.log("OAuth token exchange successful");
    
    // Store tokens for this location
    tokens[locationId] = {
      access_token: tokenResponse.data.access_token,
      refresh_token: tokenResponse.data.refresh_token,
      expires_at: Date.now() + (tokenResponse.data.expires_in * 1000)
    };
    
    // Success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Installation Complete - BlueBubbles iMessage for GHL</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
          h1 { color: #2c3e50; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 30px; margin: 30px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .success-icon { font-size: 48px; color: #2ecc71; margin-bottom: 20px; }
          .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="success-icon">✓</div>
          <h1>Installation Complete!</h1>
          <p>The BlueBubbles iMessage integration has been successfully installed for your GHL location.</p>
          <p>You can now send and receive iMessages through GHL.</p>
          <a href="${process.env.APP_URL}" class="button">Return to Dashboard</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);
    res.status(500).send(`
      <h1>Error during installation</h1>
      <p>There was an error during the OAuth process: ${err.message}</p>
      <p>Please try again or contact support.</p>
    `);
  }
});

// GHL Webhook handler
app.post("/ghl-webhook", async (req, res) => {
  try {
    console.log("GHL Webhook received:", JSON.stringify(req.body));
    
    // Handle GHL events
    const event = req.body;
    
    // Acknowledge receipt immediately
    res.status(200).json({ status: "received" });
    
    // Process different webhook events
    if (event.type === "conversation.message.sent" && event.data && event.data.direction === "outbound") {
      // Extract necessary info
      const phone = event.data.contact?.phone;
      const message = event.data.message;
      const contactId = event.data.contact?.id;
      const conversationId = event.data.conversationId;
      const locationId = event.locationId;
      
      if (!phone || !message) {
        console.error("Missing required data in webhook", { phone, message });
        return;
      }
      
      // Forward outbound message to BlueBubbles
      const sendResult = await sendToBlueBubbles(phone, message);
      
      // Log the message to GHL conversation
      if (contactId && conversationId) {
        try {
          // Use the proper endpoint for outbound messages
          await logOutboundMessageToGHL(locationId, contactId, conversationId, message);
          
          // Update conversation status to ensure it's properly reflected in GHL
          await updateConversationStatus(locationId, conversationId);
          
          // Add a note to the conversation if BlueBubbles failed
          if (sendResult && !sendResult.success) {
            const noteMessage = `[System Note: Message delivery to BlueBubbles failed. Reason: ${sendResult.error}]`;
            await logInternalNoteToGHL(locationId, contactId, conversationId, noteMessage);
          }
        } catch (logError) {
          console.error("Failed to log outbound message to GHL:", logError.message);
        }
      } else {
        console.error("No contactId or conversationId provided in webhook, cannot log outbound message");
      }
    }
  } catch (err) {
    console.error("GHL Webhook error:", err.message);
  }
});

// DEBUGGING ENDPOINT: Simple endpoint to test if server is receiving inbound messages
app.post("/inbound-debug", (req, res) => {
  // Log the received payload
  console.log("============ INBOUND DEBUG ============");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("Query:", JSON.stringify(req.query, null, 2));
  console.log("=======================================");
  
  // Always respond with success to confirm receipt
  res.status(200).json({
    status: "received",
    timestamp: new Date().toISOString(),
    headers: req.headers,
    body: req.body,
    query: req.query
  });
});

// ENHANCED INBOUND ENDPOINT: For receiving messages from BlueBubbles and logging to GHL
app.post("/inbound", async (req, res) => {
  try {
    console.log("Received inbound message from BlueBubbles - FULL PAYLOAD:", JSON.stringify(req.body));
    
    // Echo back payload for testing
    if (req.query.echo === 'true') {
      return res.status(200).json({ 
        status: "echo", 
        received: req.body, 
        timestamp: new Date().toISOString() 
      });
    }
    
    // Validate the payload
    if (!req.body || !req.body.data) {
      console.error("Invalid payload structure received:", JSON.stringify(req.body));
      return res.status(400).json({ error: "Invalid payload", received: req.body });
    }
    
    const { data } = req.body;
    
    // More detailed validation
    if (!data.text) {
      console.error("Missing text field in data:", JSON.stringify(data));
      return res.status(400).json({ error: "Missing message text", received: data });
    }
    
    if (!data.handle || !data.handle.address) {
      console.error("Missing or invalid handle/address:", JSON.stringify(data));
      return res.status(400).json({ error: "Missing phone number", received: data });
    }
    
    const message = data.text;
    const phone = data.handle.address;
    
    console.log(`Inbound message from ${phone}: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`);
    
    // Use configured location ID or fall back to default
    const locationId = process.env.GHL_DEFAULT_LOCATION_ID || "lKWthVWigQO6xfZysNgf";
    
    // 1. Find or create the contact based on phone number
    let contactId;
    try {
      contactId = await getContactIdByPhone(locationId, phone);
      console.log(`Found/created contact ID: ${contactId}`);
    } catch (err) {
      console.error("Failed to find/create contact:", err.response?.data || err.message);
      return res.status(500).json({ error: "Failed to process contact", details: err.message });
    }
    
    // 2. Get or create a conversation for this contact
    let conversationId;
    try {
      conversationId = await getOrCreateConversation(locationId, contactId);
      console.log(`Found/created conversation ID: ${conversationId}`);
    } catch (err) {
      console.error("Failed to find/create conversation:", err.response?.data || err.message);
      return res.status(500).json({ error: "Failed to process conversation", details: err.message });
    }
    
    // 3. Log the inbound message to GHL
    try {
      console.log("About to log inbound message to GHL with:", { 
        locationId, contactId, conversationId, messageLength: message.length
      });
      
      const logResult = await logInboundMessageToGHL(locationId, contactId, conversationId, message);
      console.log(`GHL inbound message logged successfully: ${logResult.status}`);
      
      // 4. Update conversation status with unread count for inbound messages
      await updateInboundConversationStatus(locationId, conversationId);
      console.log(`GHL conversation status updated`);
      
      res.status(200).json({ 
        status: "success", 
        message: "Inbound message logged to GHL",
        details: {
          contactId,
          conversationId,
          locationId
        }
      });
    } catch (err) {
      console.error("Failed to log inbound message to GHL:", 
        err.response?.data ? JSON.stringify(err.response.data) : err.message);
      return res.status(500).json({ error: "Failed to log message to GHL", details: err.message });
    }
  } catch (err) {
    console.error("Inbound processing error:", err.message, err.stack);
    res.status(500).json({ error: "Failed to process inbound message", details: err.message });
  }
});

// OUTBOUND ENDPOINT: For GHL workflow webhooks sending messages via BlueBubbles
app.post("/outbound", async (req, res) => {
  try {
    console.log("Received outbound request:", JSON.stringify(req.body));
    let { to, message, contactId, locationId } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Both 'to' and 'message' are required"
      });
    }
    
    // Set default locationId if not provided
    locationId = locationId || process.env.GHL_DEFAULT_LOCATION_ID || "lKWthVWigQO6xfZysNgf";
    
    // Format phone number if needed
    to = to.replace(/[^\d+]/g, '');
    if (!to.startsWith('+')) {
      to = '+' + to;
    }
    
    console.log(`Sending message to ${to} via BlueBubbles`);
    
    // 1. First, send the message via BlueBubbles
    const sendResult = await sendToBlueBubbles(to, message);
    console.log(`BlueBubbles send result:`, sendResult.success ? "success" : sendResult.error);
    
    // 2. If contactId is not provided, find or create the contact
    if (!contactId) {
      try {
        console.log(`Finding/creating contact for phone ${to}`);
        contactId = await getContactIdByPhone(locationId, to);
        console.log(`Retrieved/created contactId ${contactId} for phone ${to}`);
      } catch (lookupErr) {
        console.error("Failed to lookup/create contact:", lookupErr.message);
        return res.status(500).json({ 
          error: "Failed to find or create contact", 
          details: lookupErr.message 
        });
      }
    }
    
    // 3. Find or create a conversation for this contact
    let conversationId;
    try {
      console.log(`Finding/creating conversation for contactId ${contactId}`);
      conversationId = await getOrCreateConversation(locationId, contactId);
      console.log(`Using conversationId ${conversationId}`);
    } catch (convErr) {
      console.error("Failed to get/create conversation:", convErr.message);
      return res.status(500).json({ 
        error: "Failed to find or create conversation", 
        details: convErr.message 
      });
    }
    
    // 4. Log the outbound message to GHL
    try {
      console.log(`Logging outbound message to GHL conversation ${conversationId}`);
      const logResult = await logOutboundMessageToGHL(locationId, contactId, conversationId, message);
      console.log(`GHL message logging completed: ${logResult.status}`);
      
      // 5. Update conversation status to ensure it appears in GHL
      await updateConversationStatus(locationId, conversationId);
      console.log(`GHL conversation status updated`);
      
      // 6. If BlueBubbles send failed, add a note to the conversation
      if (!sendResult.success) {
        const noteMessage = `[System Note: Message delivery to BlueBubbles failed. Reason: ${sendResult.error}]`;
        await logInternalNoteToGHL(locationId, contactId, conversationId, noteMessage);
        console.log(`Added failure note to conversation`);
      }
    } catch (logError) {
      console.error("Failed to log message to GHL:", logError.response?.data || logError.message);
      return res.status(500).json({ 
        error: "Failed to log message to GHL", 
        details: logError.message 
      });
    }
    
    // 7. Return detailed response
    res.status(200).json({
      status: "success",
      bluebubbles_delivery: sendResult.success ? "sent" : "failed",
      ghl_logging: "completed",
      details: {
        contactId,
        conversationId,
        locationId
      }
    });
  } catch (err) {
    console.error("Outbound processing error:", err.message);
    res.status(500).json({ 
      error: "Failed to process outbound message", 
      details: err.message 
    });
  }
});

// Function to send message via BlueBubbles
async function sendToBlueBubbles(to, message) {
  // Format phone number
  to = to.replace(/[^\d+]/g, '');
  if (!to.startsWith('+')) {
    to = '+' + to;
  }
  
  // The exact payload BlueBubbles requires
  const payload = {
    chatGuid: to,
    message: message,
    method: "apple-script",
    tempGuid: `temp-${Date.now()}`
  };
  
  console.log(`Sending to BlueBubbles: ${to} (${message.substring(0, 30)}${message.length > 30 ? '...' : ''})`);
  
  try {
    // Set a longer timeout for BlueBubbles requests (30 seconds)
    const response = await axios.post(
      process.env.BLUEBUBBLES_URL,
      payload,
      { 
        timeout: 30000,  // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("BlueBubbles response:", response.status);
    return { success: true, response };
  } catch (err) {
    // Check if it's a timeout error
    if (err.code === 'ECONNABORTED' || (err.response && err.response.status === 524)) {
      console.error("BlueBubbles timeout error. The server might be overloaded or temporarily unavailable.");
      return {
        status: 'timeout',
        success: false,
        error: 'Timeout connecting to BlueBubbles server'
      };
    }
    
    // For CloudFlare errors
    if (err.message && err.message.includes('524')) {
      console.error("CloudFlare timeout error (524) connecting to BlueBubbles server");
      return {
        status: 'cloudflare_timeout',
        success: false,
        error: 'CloudFlare timeout connecting to BlueBubbles server'
      };
    }
    
    console.error("BlueBubbles send error:", 
      err.response?.data ? JSON.stringify(err.response.data).substring(0, 200) + '...' : err.message);
    
    // Return error object instead of throwing
    return {
      status: 'error',
      success: false,
      error: err.message
    };
  }
}

// Function to find or create contact in GHL
async function getContactIdByPhone(locationId, phone) {
  try {
    // Format phone number if needed
    phone = phone.replace(/[^\d+]/g, '');
    if (!phone.startsWith('+')) {
      phone = '+' + phone;
    }
    
    // Prepare the API request URL and payload
    const url = `${GHL_API_URL}/contacts/upsert`;
    const payload = {
      email: null,  // Can be null if not available
      phone: phone,
      locationId: locationId
    };
    
    // Prepare headers - use either OAuth token or private token
    const token = getTokenForLocation(locationId);
    const headers = {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json"
    };
    
    // Log pre-API call
    console.log(`[${new Date().toISOString()}] Looking up/creating contact in GHL`);
    console.log(`URL: ${url}`);
    console.log(`Headers: ${JSON.stringify({ ...headers, Authorization: "***MASKED***" })}`);
    console.log(`Payload: ${JSON.stringify(payload)}`);
    
    // Make the API call
    const response = await axios.post(url, payload, { headers });
    
    // Log post-API call
    console.log(`[${new Date().toISOString()}] GHL contact upsert response: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data)}`);
    
    // Extract contactId from response
    const contactId = response.data.contact?.id;
    
    if (!contactId) {
      throw new Error("Contact ID not found in GHL response");
    }
    
    return contactId;
  } catch (err) {
    console.error("GHL contact lookup/create error:", err.response?.data || err.message);
    throw err;
  }
}

// Function to get or create a conversation for a contact
async function getOrCreateConversation(locationId, contactId) {
  try {
    // First try to find an existing conversation for this contact
    const conversation = await findConversationByContactId(locationId, contactId);
    
    if (conversation) {
      return conversation.id;
    }
    
    // If no conversation exists, create a new one
    const url = `${GHL_API_URL}/conversations/`;
    const payload = {
      locationId,
      contactId
    };
    
    // Prepare headers
    const token = getTokenForLocation(locationId);
    const headers = {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json"
    };
    
    // Log pre-API call
    console.log(`[${new Date().toISOString()}] Creating new conversation in GHL`);
    console.log(`URL: ${url}`);
    console.log(`Headers: ${JSON.stringify({ ...headers, Authorization: "***MASKED***" })}`);
    console.log(`Payload: ${JSON.stringify(payload)}`);
    
    // Make the API call
    const response = await axios.post(url, payload, { headers });
    
    // Log post-API call
    console.log(`[${new Date().toISOString()}] GHL conversation create response: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data)}`);
    
    // Extract conversationId from response
    const conversationId = response.data.conversation?.id;
    
    if (!conversationId) {
      throw new Error("Conversation ID not found in GHL response");
    }
    
    return conversationId;
  } catch (err) {
    console.error("GHL conversation get/create error:", err.response?.data || err.message);
    throw err;
  }
}

// Function to find a conversation by contact ID
async function findConversationByContactId(locationId, contactId) {
  try {
    // Search for conversations by contact ID
    const url = `${GHL_API_URL}/conversations/search`;
    
    // Prepare headers
    const token = getTokenForLocation(locationId);
    const headers = {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json"
    };
    
    // Build query params
    const params = {
      locationId,
      contactId,
      limit: 1, // We only need one conversation
      sortBy: "last_message_date", // Get the most recent conversation
      sort: "desc"
    };
    
    // Log pre-API call
    console.log(`[${new Date().toISOString()}] Searching for conversation in GHL`);
    console.log(`URL: ${url}`);
    console.log(`Headers: ${JSON.stringify({ ...headers, Authorization: "***MASKED***" })}`);
    console.log(`Params: ${JSON.stringify(params)}`);
    
    // Make the API call
    const response = await axios.get(url, { headers, params });
    
    // Log post-API call
    console.log(`[${new Date().toISOString()}] GHL conversation search response: ${response.status}`);
    console.log(`Found ${response.data.conversations?.length || 0} conversations`);
    
    // Return the first conversation if any found
    if (response.data.conversations && response.data.conversations.length > 0) {
      return response.data.conversations[0];
    }
    
    return null;
  } catch (err) {
    console.error("GHL conversation search error:", err.response?.data || err.message);
    return null;
  }
}

// Log outbound messages to GHL
async function logOutboundMessageToGHL(locationId, contactId, conversationId, message) {
  try {
    // Get token for this location
    const token = getTokenForLocation(locationId);
    
    // Important: Use the inbound messages endpoint but with direction "outbound"
    const url = `${GHL_API_URL}/conversations/messages/inbound`;
    const payload = {
      contactId,
      conversationId,
      message,
      type: "SMS",  // Use uppercase SMS as per GHL API requirements
      direction: "outbound",
      locationId
    };
    
    // Prepare headers
    const headers = {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      locationId
    };
    
    // Log pre-API call
    console.log(`[${new Date().toISOString()}] Logging outbound message to GHL`);
    console.log(`URL: ${url}`);
    console.log(`Headers: ${JSON.stringify({ ...headers, Authorization: "***MASKED***" })}`);
    console.log(`Payload: ${JSON.stringify(payload)}`);
    
    // Make the API call
    const response = await axios.post(url, payload, { headers });
    
    // Log post-API call
    console.log(`[${new Date().toISOString()}] GHL outbound logging response: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data)}`);
    
    return response;
  } catch (err) {
    console.error("GHL outbound logging error:", err.response?.data || err.message);
    throw err;
  }
}

// Log inbound messages to GHL
async function logInboundMessageToGHL(locationId, contactId, conversationId, message) {
  try {
    // Get token for this location
    const token = getTokenForLocation(locationId);
    
    // Use the inbound messages endpoint with direction "inbound"
    const url = `${GHL_API_URL}/conversations/messages/inbound`;
    const payload = {
      contactId,
      conversationId,
      message,
      type: "SMS",  // Use uppercase SMS as per GHL API requirements
      direction: "inbound",
      locationId
    };
    
    // Prepare headers
    const headers = {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      locationId
    };
    
    // Log pre-API call
    console.log(`[${new Date().toISOString()}] Logging inbound message to GHL`);
    console.log(`URL: ${url}`);
    console.log(`Headers: ${JSON.stringify({ ...headers, Authorization: "***MASKED***" })}`);
    console.log(`Payload: ${JSON.stringify(payload)}`);
    
    // Make the API call
    const response = await axios.post(url, payload, { headers });
    
    // Log post-API call
    console.log(`[${new Date().toISOString()}] GHL inbound logging response: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data)}`);
    
    return response;
  } catch (err) {
    console.error("GHL inbound logging error:", err.response?.data || err.message);
    throw err;
  }
}

// Log internal notes to GHL conversation
async function logInternalNoteToGHL(locationId, contactId, conversationId, message) {
  try {
    // Get token for this location
    const token = getTokenForLocation(locationId);
    
    // Use the messages endpoint with messageType for internal notes
    const url = `${GHL_API_URL}/conversations/messages`;
    const payload = {
      contactId,
      conversationId,
      message,
      type: "TYPE_INTERNAL_COMMENT",
      locationId
    };
    
    // Prepare headers
    const headers = {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      locationId
    };
    
    // Log pre-API call
    console.log(`[${new Date().toISOString()}] Logging internal note to GHL`);
    console.log(`URL: ${url}`);
    console.log(`Headers: ${JSON.stringify({ ...headers, Authorization: "***MASKED***" })}`);
    console.log(`Payload: ${JSON.stringify(payload)}`);
    
    // Make the API call
    const response = await axios.post(url, payload, { headers });
    
    // Log post-API call
    console.log(`[${new Date().toISOString()}] GHL internal note response: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data)}`);
    
    return response;
  } catch (err) {
    console.error("GHL internal note error:", err.response?.data || err.message);
    throw err;
  }
}

// Update conversation status in GHL for outbound messages
async function updateConversationStatus(locationId, conversationId) {
  try {
    // Get token for this location
    const token = getTokenForLocation(locationId);
    
    // Use the conversation update endpoint
    const url = `${GHL_API_URL}/conversations/${conversationId}`;
    const payload = {
      locationId,
      // For outbound messages, make sure conversation appears in inbox
      inbox: true
    };
    
    // Prepare headers
    const headers = {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      locationId
    };
    
    // Log pre-API call
    console.log(`[${new Date().toISOString()}] Updating conversation status in GHL`);
    console.log(`URL: ${url}`);
    console.log(`Headers: ${JSON.stringify({ ...headers, Authorization: "***MASKED***" })}`);
    console.log(`Payload: ${JSON.stringify(payload)}`);
    
    // Make the API call
    const response = await axios.put(url, payload, { headers });
    
    // Log post-API call
    console.log(`[${new Date().toISOString()}] GHL conversation update response: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data)}`);
    
    return response;
  } catch (err) {
    console.error("GHL conversation update error:", err.response?.data || err.message);
    // Don't throw error here to prevent cascading failures
  }
}

// Update conversation status in GHL for inbound messages
async function updateInboundConversationStatus(locationId, conversationId) {
  try {
    // Get token for this location
    const token = getTokenForLocation(locationId);
    
    // Use the conversation update endpoint
    const url = `${GHL_API_URL}/conversations/${conversationId}`;
    const payload = {
      locationId,
      // For inbound messages, set unread count and ensure inbox visibility
      inbox: true,
      unreadCount: 1
    };
    
    // Prepare headers
    const headers = {
      Authorization: `Bearer ${token}`,
      Version: GHL_API_VERSION,
      "Content-Type": "application/json",
      locationId
    };
    
    // Log pre-API call
    console.log(`[${new Date().toISOString()}] Updating inbound conversation status in GHL`);
    console.log(`URL: ${url}`);
    console.log(`Headers: ${JSON.stringify({ ...headers, Authorization: "***MASKED***" })}`);
    console.log(`Payload: ${JSON.stringify(payload)}`);
    
    // Make the API call
    const response = await axios.put(url, payload, { headers });
    
    // Log post-API call
    console.log(`[${new Date().toISOString()}] GHL inbound conversation update response: ${response.status}`);
    console.log(`Response data: ${JSON.stringify(response.data)}`);
    
    return response;
  } catch (err) {
    console.error("GHL inbound conversation update error:", err.response?.data || err.message);
    // Don't throw error here to prevent cascading failures
  }
}

// Function to get appropriate token for a location
function getTokenForLocation(locationId) {
  // If we have an OAuth token for this location, use it
  if (tokens[locationId] && tokens[locationId].access_token) {
    // Check if token needs refresh (do this asynchronously)
    if (tokens[locationId].expires_at - Date.now() < 300000) {
      refreshTokenIfNeeded(locationId).catch(err => {
        console.error(`Token refresh error: ${err.message}`);
      });
    }
    return tokens[locationId].access_token;
  }
  
  // Fall back to private token
  return process.env.GHL_PRIVATE_TOKEN;
}

// Function to refresh token if needed
async function refreshTokenIfNeeded(locationId) {
  const tokenData = tokens[locationId];
  
  if (!tokenData) {
    throw new Error("No token found for this location");
  }
  
  // If token expires in less than 5 minutes, refresh it
  if (tokenData.expires_at - Date.now() < 300000) {
    try {
      console.log("Refreshing token for location:", locationId);
      
      const refreshResponse = await axios.post(`${GHL_API_URL}/oauth/token`, {
        client_id: process.env.GHL_CLIENT_ID || "68131529e7e1f17f16ab9251-ma4zu8af",
        client_secret: process.env.GHL_CLIENT_SECRET || "1929b3af-6d73-4bfb-aa1b-082509d1861d",
        grant_type: "refresh_token",
        refresh_token: tokenData.refresh_token
      });
      
      // Update tokens
      tokens[locationId] = {
        access_token: refreshResponse.data.access_token,
        refresh_token: refreshResponse.data.refresh_token,
        expires_at: Date.now() + (refreshResponse.data.expires_in * 1000)
      };
      
      console.log("Token refreshed for location:", locationId);
    } catch (err) {
      console.error("Token refresh failed:", err.response?.data || err.message);
      throw err;
    }
  }
}

// Test endpoint for webhook functionality
app.get("/test", async (req, res) => {
  try {
    const phone = req.query.phone || "+15555555555";
    const message = req.query.message || "Test message via BlueBubbles";
    const locationId = req.query.locationId || process.env.GHL_DEFAULT_LOCATION_ID || "lKWthVWigQO6xfZysNgf";
    
    // Process an outbound message just like the /outbound endpoint
    
    // 1. Send via BlueBubbles
    const sendResult = await sendToBlueBubbles(phone, message);
    
    // 2. Log to GHL if needed
    let ghlResult = "skipped";
    if (locationId) {
      try {
        // Find or create contact
        const contactId = await getContactIdByPhone(locationId, phone);
        // Find or create conversation
        const conversationId = await getOrCreateConversation(locationId, contactId);
        // Log outbound message
        await logOutboundMessageToGHL(locationId, contactId, conversationId, message);
        // Update conversation status
        await updateConversationStatus(locationId, conversationId);
        
        ghlResult = {
          status: "success",
          contactId,
          conversationId
        };
      } catch (ghlErr) {
        ghlResult = {
          status: "error",
          error: ghlErr.message
        };
      }
    }
    
    res.json({
      success: true,
      message: "Test message processed",
      bluebubbles: sendResult.success ? 
        { success: true, message: "Message sent successfully!" } : 
        { success: false, error: sendResult.error },
      ghl: ghlResult
    });
  } catch (err) {
    console.error("Test failed:", err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Test endpoint for inbound webhook simulation
app.get("/test-inbound", (req, res) => {
  const phone = req.query.phone || "+15555555555";
  const message = req.query.message || "Test inbound message from BlueBubbles";
  
  // Create sample BlueBubbles payload
  const testPayload = {
    data: {
      text: message,
      handle: {
        address: phone
      },
      service: "iMessage",
      dateCreated: new Date().toISOString(),
      guid: "test-guid-" + Date.now()
    }
  };
  
  // Display instructions for testing
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Inbound Webhook</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        pre { background-color: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>Test Inbound Webhook</h1>
      
      <div class="card">
        <h2>Test Payload</h2>
        <p>Use the following curl command to test your inbound webhook:</p>
        <pre>curl -X POST "${process.env.APP_URL}/inbound" \
  -H "Content-Type: application/json" \
  -d '${JSON.stringify(testPayload, null, 2)}'</pre>
      </div>
      
      <div class="card">
        <h2>Test with echo mode</h2>
        <p>To test with echo mode (returns the payload without processing):</p>
        <pre>curl -X POST "${process.env.APP_URL}/inbound?echo=true" \
  -H "Content-Type: application/json" \
  -d '${JSON.stringify(testPayload, null, 2)}'</pre>
      </div>
      
      <div class="card">
        <h2>Test Debug Endpoint</h2>
        <p>To test the debug endpoint:</p>
        <pre>curl -X POST "${process.env.APP_URL}/inbound-debug" \
  -H "Content-Type: application/json" \
  -d '${JSON.stringify(testPayload, null, 2)}'</pre>
      </div>
      
      <div class="card">
        <h2>Payload JSON</h2>
        <pre>${JSON.stringify(testPayload, null, 2)}</pre>
      </div>
    </body>
    </html>
  `);
});

// Debug route
app.get("/debug", (req, res) => {
  // Remove sensitive info
  const sanitizedTokens = {};
  Object.keys(tokens).forEach(key => {
    if (tokens[key].access_token) {
      sanitizedTokens[key] = {
        has_access_token: true,
        expires_at: tokens[key].expires_at,
        expires_in_minutes: Math.floor((tokens[key].expires_at - Date.now()) / 60000)
      };
    } else {
      sanitizedTokens[key] = { timestamp: tokens[key].timestamp };
    }
  });
  
  res.json({
    app_url: process.env.APP_URL,
    bluebubbles_configured: !!process.env.BLUEBUBBLES_URL,
    ghl_private_token_configured: !!process.env.GHL_PRIVATE_TOKEN,
    default_location_id: process.env.GHL_DEFAULT_LOCATION_ID || "Not configured",
    authorized_locations: Object.keys(sanitizedTokens).filter(k => sanitizedTokens[k].has_access_token).length,
    tokens: sanitizedTokens,
    endpoints: {
      inbound: `${process.env.APP_URL}/inbound`,
      inbound_debug: `${process.env.APP_URL}/inbound-debug`,
      outbound: `${process.env.APP_URL}/outbound`,
      test: `${process.env.APP_URL}/test`,
      test_inbound: `${process.env.APP_URL}/test-inbound`
    },
    environment: {
      app_url: process.env.APP_URL,
      node_env: process.env.NODE_ENV,
      port: process.env.PORT || 10000
    }
  });
});

// Server startup
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`BlueBubbles + GHL Integration server running on port ${PORT}`);
  console.log(`Inbound webhook URL: ${process.env.APP_URL}/inbound`);
  console.log(`Debug webhook URL: ${process.env.APP_URL}/inbound-debug`);
});
