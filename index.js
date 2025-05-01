require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Route to handle messages from GHL to BlueBubbles
app.post("/outbound", async (req, res) => {
  try {
    const { to, message } = req.body;
    
    console.log(`Sending message to ${to}: ${message}`);
    
    // No need to append password - it's already in the BLUEBUBBLES_URL env var
    await axios.post(process.env.BLUEBUBBLES_URL, {
      chatGuid: to,
      message,
      method: "apple-script"
    });

    console.log("Message sent successfully");
    res.status(200).json({ status: "sent" });
  } catch (err) {
    console.error("BlueBubbles Error:", err.message);
    res.status(500).json({ error: "BlueBubbles failed", details: err.message });
  }
});

// Route to handle messages from BlueBubbles to GHL
app.post("/inbound", async (req, res) => {
  try {
    const { data } = req.body;
    const message = data.text;
    const phone = data.handle.address;
    
    console.log(`Received inbound message from ${phone}: ${message}`);

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

    console.log("Message logged to GHL successfully");
    res.status(200).json({ status: "logged" });
  } catch (err) {
    console.error("GHL Error:", err.message);
    res.status(500).json({ error: "GHL logging failed", details: err.message });
  }
});

// Health check route
app.get("/", (req, res) => {
  res.send("BlueBubbles <-> GHL Proxy Online");
});

// Critical: Bind to the PORT that Render provides
const PORT = process.env.PORT || 3000;
// The 0.0.0.0 is critical for Render to detect the app
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
