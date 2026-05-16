fetch("https://jarvis-techie.vercel.app/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{role: "user", content: "hello"}],
    model: "llama-3.3-70b-versatile",
    apiKey: "gsk_invalid",
    enableTools: true
  })
}).then(r => r.text()).then(console.log);
