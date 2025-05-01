const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

// GHL → BlueBubbles
app.post("/outbound", async (req, res) => {
  const { to, message } = req.body;

  try {
    await axios.post(process.env.BLUEBUBBLES_URL, {
      chatGuid: to,
      message,
      method: "apple-script"
    });

    res.status(200).json({ status: "sent" });
  } catch (err) {
    res.status(500).json({ error: "BlueBubbles failed", details: err.message });
  }
});

// BlueBubbles → GHL
app.post("/inbound", async (req, res) => {
  const { data } = req.body;
  const message = data.text;
  const phone = data.handle.address;

  try {
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

    res.status(200).json({ status: "logged" });
  } catch (err) {
    res.status(500).json({ error: "GHL logging failed", details: err.message });
  }
});

app.get("/", (req, res) => res.send("BlueBubbles <-> GHL Proxy Online"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

