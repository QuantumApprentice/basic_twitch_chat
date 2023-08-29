// @ts-nocheck
import {OBS_connect, play_clip_items} from "./obs_control.mjs"
const wsOBS = OBS_connect();

const channelName = 'quantumapprentice';
const TwitchWebSocketUrl = 'wss://irc-ws.chat.twitch.tv:443';
const maxMsgCount = 5;
const maxMsgTime  = 30;

/** @type {HTMLSpanElement|null} */
const chatBody = (document.querySelector("#ChatMessages"));

const wsTwitch = new WebSocket(TwitchWebSocketUrl);

wsTwitch.onopen = ()=>{
    // wsTwitch.send(`CAP REQ :twitch.tv/commands twitch.tv/tags`);
    wsTwitch.send(`NICK justinfan6969`);
    wsTwitch.send(`JOIN #${channelName}`);
    // console.log('WebSocket connection opened');    //debug
}

//// message parsing using regex
// ws.onmessage = (msg) => {
//     let x = msg.data;
//     let y = /@(.+?)(PRIVMSG+)/.exec(x);
//     if (y) {
//         console.log(y);
//     }
//     chatmsg.innerText += x;
// };

wsTwitch.onmessage = (fullmsg) => {
  let txt = fullmsg.data;
  let name = '';
  let outmsg = '';

  if (txt[0] == ':') {
    // get the important data positions
    let pos1 = txt.indexOf("@") + 1;
    let pos2 = txt.indexOf(".", pos1);
    let pos3 = txt.indexOf(`#${channelName}`)+2;
    // create strings based on those positions
    pos3 += channelName.length + 1;
    name = txt.substring(pos1, pos2).trim();
    outmsg = txt.substring(pos3).trim();
    // check if its a bot command
    if (outmsg[0] == '!') {
      play_clip_items(wsOBS, outmsg.slice(1).trim());
    }
    else {
      // display string on stream
      display_msg(name, outmsg);
    }

  }
  else {
    // handle pings
    // other twitch specific things should
    // be handled here too
    let pos2 = txt.indexOf(":");
    name = txt.slice(0, pos2).trim();
    outmsg = txt.slice(pos2).trim();

    if (name == 'PING') {
      console.log('PONG ' + outmsg);
      wsTwitch.send('PONG ' + outmsg);
    }
  }
}

// display chat message on stream
function display_msg(name, outmsg) {
  let chatMSG = document.createElement("div");

  let auth = document.createElement("div");
  auth.classList.add("Name");
  auth.textContent = name;

  let msg = document.createElement("div");
  msg.classList.add("Message");
  msg.textContent = outmsg;

  chatMSG.append(auth, msg);
  // chat message has to be prepended to appear on bottom
  chatBody.prepend(chatMSG);

  chatMSG.classList.add("message_box");
  if (chatBody.children.length > maxMsgCount) {
    // if more than maxMsgCount, delete first message
    chatBody.children[0].remove();
  }

  // delete chat message after maxMsgTime has passed
  chatMSG.dataset.fadeOutTime = performance.now() + 5000;
  setTimeout(function(){
      chatMSG.classList.add('messages');
      setTimeout(function(){chatMSG.remove();},1000);
  },maxMsgTime*1000);
}


