// @ts-nocheck
import {OBS_connect, play_clip_items} from "./obs_control.mjs"
let wsOBS = OBS_connect();

setTimeout(()=>{
  if (wsOBS.readyState != 1)
  wsOBS = OBS_connect();
}, 10000);

//other things to do to this before it's done
//1) chat name needs to match color in chatbox
//2) auto-translate chat from other languages?
//3) make on-screen chat messages dissappear when deleted
//4) make on-screen chat msgs disappear when ban/timeout
//5) make chat stay on-screen in webcam only scene
//6) sometimes "!" commands don't work after timeouts/bans?
//7) specialized chat commands for this bot
//    !first, !timer, 
//8) make randomized memes play correctly (schwarzenoises, etc.)
//9) make memes play sequentially



// window.addEventListener('obsStreamingStarted', ()=>{
//   if (!wsOBS) wsOBS = OBS_connect();
// })
// if(window.obsstudio?.pluginVersion) {
//   window.addEventListener('obsStreamingStarted', ...);
// } else {
//   wsOBS = OBS_Connect();
// }

const channelName = 'quantumapprentice';
const TwitchWebSocketUrl = 'wss://irc-ws.chat.twitch.tv:443';
const maxMsgCount = 5;
const maxMsgTime  = 30;

/** @type {HTMLSpanElement|null} */
const chatBody = (document.querySelector("#ChatMessages"));

const wsTwitch = new WebSocket(TwitchWebSocketUrl);

wsTwitch.onopen = ()=>{
    wsTwitch.send(`CAP REQ :twitch.tv/commands twitch.tv/tags`);
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
  // console.log("fullmsg: ", fullmsg);
  let txt = fullmsg.data;
  let name = '';
  let outmsg = '';
  let indx = 0;
  let just_tags = '';
  let tags_obj = {};
  const emote_list = [];

  if (txt[0] == '@') {
    indx = txt.indexOf(' ');
    just_tags = txt.slice(0, indx);
    indx++;
    tags_obj = parse_tags(just_tags);
    get_emote_list(tags_obj['emotes'], emote_list);
  }


  if (txt[indx] == ':') {
    // get the important data positions
    let pos1 = txt.indexOf('@', indx) + 1;
    let pos2 = txt.indexOf(".", pos1);
    let pos3 = txt.indexOf(`#${channelName}`)+2;
    pos3 += channelName.length + 1;

    // create strings based on those positions
    name = txt.substring(pos1, pos2).trim();

    if ((name == ":tmi") || (name == "justinfan6969")
      || (name.includes("@emote-only=0;"))
      || (name == ":justinfan6969"))
      { return; }

    outmsg = txt.substring(pos3).trim();
    // check if its a bot command
    if (outmsg[0] == '!') {
      play_clip_items(wsOBS, outmsg.slice(1).trim());
      // new timer countdown function
      if (outmsg.slice(1).trim() == "timer") {
        let remind_time = 1000*60*10;
        timer(remind_time);
      }
    }
    else {
      // display string on stream
      display_msg(name, outmsg, tags_obj, emote_list);
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

function timer(time)
{
  setTimeout(()=>{
    //need to send message to chat too
    play_clip_items(wsOBS, "khan");
    play_clip_items(wsOBS, "cookie");
    play_clip_items(wsOBS, "nothing");
    play_clip_items(wsOBS, "choppa");
    }, time);
}

// global msg_time to set timeouts on messages
let msg_time = 0;
// display chat message on stream
function display_msg(name, outmsg, tags_obj, emote_list) {
  let emote;
  let chatMSG = document.createElement("div");

  let auth = document.createElement("div");
  auth.classList.add("Name");

  if (tags_obj['color']) {
    auth.style.color = tags_obj['color'];
  }

  auth.textContent = tags_obj['display_name'] || name;

  if (tags_obj['emotes']) {
      let parts = [];
      let end_indx = outmsg.length;

    for (let i = emote_list.length; --i >= 0; ) {
      emote = document.createElement("img");
      emote.setAttribute('src', emote_list[i].url);

      let last_half = esc_html(outmsg.slice(emote_list[i].end + 1, end_indx));
      parts.unshift(last_half);
      parts.unshift(emote.outerHTML);
      end_indx = emote_list[i].start;
    }
    parts.unshift(esc_html(outmsg.slice(0, end_indx)));
    outmsg = parts.join('');
  }

  let msg = document.createElement("div");
  msg.classList.add("Message");
  msg.innerHTML = outmsg;


  chatMSG.append(auth, msg);
  // chat message has to be prepended to appear on bottom
  chatBody.prepend(chatMSG);

  chatMSG.classList.add("message_box");
  if (chatBody.children.length > maxMsgCount) {
    // if more than maxMsgCount, delete first message
    chatBody.lastElementChild.remove();
    // chatBody.children[chatBody.children.length].remove();
  }

  let fade_time = msg.textContent.length/3;

  fade_time = Math.max(10, Math.min(30, fade_time));
  let expectedEndTime = performance.now() + 1000 * fade_time;
  if (expectedEndTime < msg_time) {
    fade_time = (msg_time - performance.now())/1000;
  }
  else {
    msg_time = expectedEndTime;
  }

  // window.obsstudio.getCurrentScene(scene => {
  //   if (scene.name === 'Desktop') {
  //     document.documentElement.classList.add('Desktop');
  //     chatMSG.style.animation = `fadeOut forwards 1s ${fade_time}s`;
  //   }
  // });
  chatMSG.style.animation = `fadeOut forwards 1s ${fade_time}s`;

}

// Basic parse function from twitch
function parse_tags(tags) {
  let parsed_tags = tags.split(';');
  parsed_tags.forEach(tag => {
    let tag_key = tag.split('=');
    let tag_val = (tag_key[1] === '') ? null : tag_key[1];
    switch (tag_key[0]) {
      case 'emotes':
        if (tag_val) {
          let dict_emotes = {};
          let emotes = tag_val.split('/');
          emotes.forEach(em => {
            let emote_parts = em.split(':');
            let txt_pos = [];
            let positions = emote_parts[1].split(',');
            positions.forEach(position => {
              let pos_parts = position.split('-');
              txt_pos.push({
                startPosition: pos_parts[0],
                endPosition: pos_parts[1]
              })
            });
            dict_emotes[emote_parts[0]] = txt_pos;
          })
          parsed_tags[tag_key[0]] = dict_emotes;
        }
        else {
          parsed_tags[tag_key[0]] = null;
        }
        break;
      case 'color':
        parsed_tags.color = tag_val;
        break;
      case 'display-name':
        parsed_tags.display_name = tag_val;
        break;
    }
  })
  // creates an empty list if returns null
  parsed_tags['emotes'] ??= {};
  return parsed_tags;
}

// Parse the emote_obj to just get emotes,
//  place them in an array with urls for each
//  position, then sort the array by position
function get_emote_list(emote_obj, emote_list)
{
  const cdn_url = "https://static-cdn.jtvnw.net/emoticons/v2/" //<id>/<format>/<theme_mode>/<"

  for (const [emote_id, pos] of Object.entries(emote_obj)) {
    let out_url = cdn_url + emote_id + "/default/dark/2.0";

    for (const i of pos) {
      emote_list.push ({
        id: emote_id,
        url: out_url,
        start: parseInt(i.startPosition),
        end: parseInt(i.endPosition),
      });
    }

  }
  emote_list.sort((a,b)=>a.start - b.start);
}

// Make text strings with potential HTML exploits
//  safe for putting into an HTML element
function esc_html(s) {
  if (!s) {return s};
  let el = document.createElement('i');
  el.textContent = s;

  return el.innerHTML;
}