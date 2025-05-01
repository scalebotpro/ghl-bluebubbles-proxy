require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

app.post("/", async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    const bluebubblesURL = `${process.env.BLUEBUBBLES_URL}?password=${process.env.BLUEBUBBLES_PASSWORD}`;

    const response = await axios.post(bluebubblesURL, {
      chatGuid: phoneNumber,
      message,
      method: "apple-script"
    });

    res.status(200).json({ status: "sent", response: response.data });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to send message", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ BlueBubbles <-> GHL Proxy is running.");
});

// 🚨 Render looks for this!
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});

