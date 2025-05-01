// OUTBOUND: GHL -> BlueBubbles (iMessage)
app.post("/outbound", async (req, res) => {
  try {
    console.log("Received outbound request:", req.body);
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        details: "Both 'to' and 'message' are required" 
      });
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
