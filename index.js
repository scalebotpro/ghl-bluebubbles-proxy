// GHL to BlueBubbles Integration - Production Ready
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

// Initialize Express
const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check route
app.get("/", (req, res) => {
  res.send("BlueBubbles <-> GHL Proxy Online");
});

// OUTBOUND: GHL -> BlueBubbles (iMessage)
app.post("/outbound", async (req, res) => {
  try {
    console.log("Received outbound request:", req.body);
    let { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        details: "Both 'to' and 'message' are required" 
      });
    }
    
    // Format phone number to ensure it works
    // Remove all non-digit characters except the + sign
    to = to.replace(/[^\d+]/g, '');
    
    // Ensure it has a + prefix if it doesn't
    if (!to.startsWith('+')) {
      to = '+' + to;
    }
    
    console.log(`Sending message to ${to}: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`);
    
    // Prepare the BlueBubbles request exactly as needed
    const blueBubblesPayload = {
      chatGuid: to,
      message: message,
      method: "apple-script",
      tempGuid: `temp-${Date.now()}`  // Add a temporary GUID
    };
    
    console.log("BlueBubbles payload:", blueBubblesPayload);
    
    const response = await axios.post(
      process.env.BLUEBUBBLES_URL, 
      blueBubblesPayload
    );
    
    console.log("Message sent successfully:", response.status);
    res.status(200).json({ status: "sent" });
  } catch (err) {
    console.error("BlueBubbles Error:", err.message);
    
    // Add more detailed error logging
    if (err.response) {
      console.error("Response data:", err.response.data);
      console.error("Response status:", err.response.status);
      console.error("Response headers:", err.response.headers);
    }
    
    res.status(500).json({ error: "Failed to send message", details: err.message });
  }
});

// INBOUND: BlueBubbles (iMessage) -> GHL
app.post("/inbound", async (req, res) => {
  try {
    console.log("Received inbound request:", req.body);
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
    
    console.log(`Received message from ${phone}: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`);
    
    // Forward to GHL Conversations API
    const ghlResponse = await axios.post(
      "https://services.leadconnectorhq.com/conversations/messages",
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
    
    console.log("Message forwarded to GHL:", ghlResponse.status);
    res.status(200).json({ status: "logged" });
  } catch (err) {
    console.error("GHL Error:", err.message);
    res.status(500).json({ error: "Failed to forward message", details: err.message });
  }
});

// BlueBubbles API test with various formats
app.get("/test-api", async (req, res) => {
  try {
    const phone = req.query.phone || "+15555555555"; // Default test number
    const message = req.query.message || "Test message from API test endpoint";
    
    console.log(`Testing API with phone=${phone}, message=${message}`);
    
    // Format 1: Standard format
    const payload1 = {
      chatGuid: phone,
      message: message,
      method: "apple-script"
    };
    
    console.log("Trying format 1:", payload1);
    let result = { formats: {} };
    
    try {
      const response1 = await axios.post(
        process.env.BLUEBUBBLES_URL,
        payload1
      );
      result.formats.format1 = {
        success: true,
        status: response1.status,
        data: response1.data
      };
    } catch (err) {
      result.formats.format1 = {
        success: false,
        error: err.message,
        status: err.response?.status,
        data: err.response?.data
      };
    }
    
    // Format 2: Using guid instead of chatGuid
    const payload2 = {
      guid: phone,
      message: message,
      method: "apple-script"
    };
    
    console.log("Trying format 2:", payload2);
    
    try {
      const response2 = await axios.post(
        process.env.BLUEBUBBLES_URL,
        payload2
      );
      result.formats.format2 = {
        success: true,
        status: response2.status,
        data: response2.data
      };
    } catch (err) {
      result.formats.format2 = {
        success: false,
        error: err.message,
        status: err.response?.status,
        data: err.response?.data
      };
    }
    
    res.json({
      test_results: result,
      bluebubbles_url: process.env.BLUEBUBBLES_URL.split('?')[0] // Hide password
    });
  } catch (err) {
    console.error("API test failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Debug route to check environment variables
app.get("/debug", (req, res) => {
  res.json({
    bluebubbles_url_configured: !!process.env.BLUEBUBBLES_URL,
    ghl_token_configured: !!process.env.GHL_PRIVATE_TOKEN,
    environment: process.env.NODE_ENV,
    port: process.env.PORT
  });
});

// Status route for monitoring
app.get("/status", (req, res) => {
  res.json({
    status: "online",
    time: new Date().toISOString(),
    environment: {
      bluebubbles_configured: !!process.env.BLUEBUBBLES_URL,
      ghl_configured: !!process.env.GHL_PRIVATE_TOKEN
    }
  });
});

// CRITICAL for Render to detect the port
const PORT = process.env.PORT || 10000;
console.log(`Starting server on port ${PORT}...`);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Error handler for server startup
server.on('error', (error) => {
  console.error('Server failed to start:', error);
});
