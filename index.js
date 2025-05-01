// BlueBubbles + GHL Developer App Integration - Fixed Version
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

// Store tokens (in memory for demo, use a database in production)
let tokens = {};

// Basic logging middleware
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
        <h2>Testing</h2>
        <p>You can test sending an iMessage using this URL:</p>
        <pre>GET ${process.env.APP_URL}/test?phone=+YOUR_PHONE&message=Testing</pre>
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
  const scope = "businesses.readonly companies.readonly calendars.readonly calendars.write calendars/events.readonly calendars/events.write calendars/groups.readonly calendars/groups.write calendars/resources.readonly calendars/resources.write campaigns.readonly conversations.readonly conversations.write conversations/message.readonly conversations/message.write conversations/reports.readonly conversations/livechat.write contacts.readonly contacts.write locations.readonly locations/customValues.readonly locations/customValues.write locations/customFields.readonly locations/customFields.write locations/tasks.readonly locations/tasks.write locations/tags.readonly locations/tags.write opportunities.readonly opportunities.write users.readonly";
  
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
    console.log("GHL Webhook received:", req.body);
    
    // Handle GHL events
    const event = req.body;
    
    // Acknowledge receipt immediately
    res.status(200).json({ status: "received" });
    
    // Process different webhook events
    if (event.type === "conversation.message.sent" && event.data && event.data.direction === "outbound") {
      // Forward outbound message to BlueBubbles
      await sendToBlueBubbles(event.data.contact.phone, event.data.message);
    }
    
    // Handle other webhook types as needed
    
  } catch (err) {
    console.error("GHL Webhook error:", err.message);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

// BlueBubbles -> GHL route
app.post("/inbound", async (req, res) => {
  try {
    console.log("Received inbound message from BlueBubbles");
    
    // Validate the payload
    if (!req.body || !req.body.data) {
      return res.status(400).json({ error: "Invalid payload" });
    }
    
    const { data } = req.body;
    const message = data.text;
    const phone = data.handle.address;
    
    if (!message || !phone) {
      return res.status(400).json({ error: "Missing message data" });
    }
    
    console.log(`Inbound message from ${phone}: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`);
    
    // Find a location that has authorized the app
    const locationId = Object.keys(tokens).find(key => 
      tokens[key] && tokens[key].access_token && !key.includes("-")
    );
    
    if (!locationId) {
      console.error("No authorized GHL location found");
      // Fall back to using the private token method
      if (process.env.GHL_PRIVATE_TOKEN) {
        console.log("Falling back to private token method");
        await sendToGHLUsingPrivateToken(phone, message);
        return res.status(200).json({ status: "logged using private token" });
      } else {
        return res.status(500).json({ error: "No authorized GHL location" });
      }
    }
    
    // Forward to GHL Conversations API using OAuth token
    await sendToGHL(locationId, phone, message);
    
    res.status(200).json({ status: "logged" });
  } catch (err) {
    console.error("Inbound error:", err.message);
    res.status(500).json({ error: "Failed to process inbound message" });
  }
});

// Manual test endpoint
app.post("/outbound", async (req, res) => {
  try {
    console.log("Received manual outbound request:", req.body);
    let { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Both 'to' and 'message' are required"
      });
    }
    
    // Send via BlueBubbles
    await sendToBlueBubbles(to, message);
    
    res.status(200).json({ status: "sent" });
  } catch (err) {
    console.error("Manual outbound error:", err.message);
    res.status(500).json({ error: "Failed to send message", details: err.message });
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
  
  console.log(`Sending to BlueBubbles: ${to.substring(0, 6)}... (${message.substring(0, 30)}${message.length > 30 ? '...' : ''})`);
  
  const response = await axios.post(
    process.env.BLUEBUBBLES_URL,
    payload
  );
  
  console.log("BlueBubbles response:", response.status);
  return response;
}

// Function to send message to GHL using OAuth
async function sendToGHL(locationId, phone, message) {
  try {
    // Ensure we have a valid token
    await refreshTokenIfNeeded(locationId);
    
    const response = await axios.post(
      `${GHL_API_URL}/conversations/messages`,
      {
        contact: { phone },
        message,
        direction: "inbound",
        channel: "sms"
      },
      {
        headers: {
          Authorization: `Bearer ${tokens[locationId].access_token}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
          locationId
        }
      }
    );
    
    console.log("GHL message sent:", response.status);
    return response;
  } catch (err) {
    console.error("GHL API error:", err.response?.data || err.message);
    throw err;
  }
}

// Fallback for using private token
async function sendToGHLUsingPrivateToken(phone, message) {
  try {
    const response = await axios.post(
      `${GHL_API_URL}/conversations/messages`,
      {
        contact: { phone },
        message,
        direction: "inbound",
        channel: "sms"
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GHL_PRIVATE_TOKEN}`,
          Version: "2021-07-28",
          "Content-Type": "application/json"
        }
      }
    );
    
    console.log("GHL message sent using private token:", response.status);
    return response;
  } catch (err) {
    console.error("GHL API private token error:", err.response?.data || err.message);
    throw err;
  }
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

// Simple test endpoint - IMPORTANT! This is the one that was missing before
app.get("/test", async (req, res) => {
  try {
    const phone = req.query.phone || "+15555555555";
    const message = req.query.message || "Test message via BlueBubbles";
    
    await sendToBlueBubbles(phone, message);
    
    res.json({
      success: true,
      message: "Test message sent successfully!"
    });
  } catch (err) {
    console.error("Test failed:", err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// For backward compatibility - another test endpoint 
app.get("/simple-test", async (req, res) => {
  try {
    const phone = req.query.phone || "+15555555555";
    const message = req.query.message || "Test message via BlueBubbles";
    
    await sendToBlueBubbles(phone, message);
    
    res.json({
      success: true,
      message: "Test message sent successfully!"
    });
  } catch (err) {
    console.error("Test failed:", err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
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
    ghl_app_configured: true,
    authorized_locations: Object.keys(sanitizedTokens).filter(k => sanitizedTokens[k].has_access_token).length,
    tokens: sanitizedTokens
  });
});

// Server startup
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
