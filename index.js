let express = require("express");
let bodyParser = require("body-parser");
let app = express();
let http = require("http").Server(app);
let io = require("socket.io")(http);
let redis = require("redis");
let client = "";
let port = 3000;

app.use("/static", express.static("static"));
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

http.listen(port, () => {
  console.log("Server Started. Listening on *:" + port);
});

let chatters = [];
let chat_messages = [];

client = redis.createClient({ host: "localhost", port: 6379 });

client.once("ready", () => {
  client.flushdb();

  client.get("chat_users", (err, reply) => {
    if (reply) {
      chatters = JSON.parse(reply);
    }
  });
  client.get("chat_app_messages", (err, reply) => {
    if (reply) {
      chat_messages = JSON.parse(reply);
    }
  });
});

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.post("/join", (req, res) => {
  let username = req.body.username;

  if (chatters.indexOf(username) === -1) {
    chatters.push(username);
    client.set("chat_users", JSON.stringify(chatters));
    res.send({
      chatters: chatters,
      status: "OK"
    });
  } else {
    res.send({
      status: "FAILED"
    });
  }
});

app.post("/leave", (req, res) => {
  let username = req.body.username;
  chatters.splice(chatters.indexOf(username), 1);
  client.set("chat_users", JSON.stringify(chatters));
  res.send({
    status: "OK"
  });
});

app.post("/send_message", (req, res) => {
  let username = req.body.username;
  let message = req.body.message;

  chat_messages.push({
    sender: username,
    message: message
  });
  client.set("chat_app_messages", JSON.stringify(chat_messages));
  res.send({
    status: "OK"
  });
});

app.get("/get_messages", (req, res) => {
  res.send(chat_messages);
});

app.get("/get_chatters", (req, res) => {
  res.send(chatters);
});

io.on("connection", socket => {
  socket.on("message", function(data) {
    io.emit("send", data);
  });
  socket.on("update_chatter_count", function(data) {
    io.emit("count_chatters", data);
  });
});
