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

    await axios.post(bluebubblesURL, {
      chatGuid: phoneNumber,
      message,
      method: "apple-script"
    });

    res.status(200).json({ status: "Message sent via BlueBubbles" });
  } catch (err) {
    console.error("Failed to send message:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("BlueBubbles <-> GHL Proxy Online");
});

// 🚨 This is the fix Render needs: listen on process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

