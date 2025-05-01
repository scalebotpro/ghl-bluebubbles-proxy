// Basic imports
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
require("dotenv").config();

// Initialize Express
const app = express();
app.use(bodyParser.json());

// Basic route to confirm server is running
app.get("/", (req, res) => {
  console.log("Health check hit");
  res.send("BlueBubbles <-> GHL Proxy Online");
});

// GHL to BlueBubbles route
app.post("/outbound", async (req, res) => {
  try {
    const { to, message } = req.body;
    
    console.log(`Sending message to ${to}: ${message}`);
    
    await axios.post(process.env.BLUEBUBBLES_URL, {
      chatGuid: to,
      message,
      method: "apple-script"
    });

    console.log("Message sent to BlueBubbles successfully");
    res.status(200).json({ status: "sent" });
  } catch (err) {
    console.error("BlueBubbles Error:", err.message);
    res.status(500).json({ error: "BlueBubbles failed", details: err.message });
  }
});

// BlueBubbles to GHL route
app.post("/inbound", async (req, res) => {
  try {
    const { data } = req.body;
    const message = data.text;
    const phone = data.handle.address;
    
    console.log(`Received message from ${phone}: ${message}`);

    await axios.post(
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

    console.log("Message forwarded to GHL successfully");
    res.status(200).json({ status: "logged" });
  } catch (err) {
    console.error("GHL Error:", err.message);
    res.status(500).json({ error: "GHL logging failed", details: err.message });
  }
});

// THIS IS THE CRITICAL PART FOR RENDER.COM
const PORT = process.env.PORT || 3000;
console.log(`Attempting to start server on port ${PORT}`);

// First log that we're trying to start
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Add error handler to the server
server.on('error', (error) => {
  console.error('Server error:', error);
});
