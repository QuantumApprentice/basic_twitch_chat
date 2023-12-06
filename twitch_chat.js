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
//10) /me shows "ACTION" in chatmsg
//11) allow chatters to opt out of showing up on stream-chat



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
const maxMsgCount = 10;
let   current_obs_scene   = '';

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
  // console.log("txt: ", txt);
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

    if ((name == ":tmi")
      || (name == "justinfan6969")
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

  // let msg_is_emote = false;
  let emote;
  let chatMSG = document.createElement("div");

  if (outmsg.startsWith('\x01ACTION')) {
    outmsg = outmsg.substring(7, outmsg.length - 1).trim();
    // msg_is_emote = true;

    chatMSG.classList.add('msg_is_emote');
  }

  let auth = document.createElement("div");
  auth.classList.add("Name");

  if (tags_obj['color']) {
    // auth.style.color = tags_obj['color'];
    chatMSG.style.setProperty('--name-color', tags_obj['color']);
  }

  auth.textContent = (tags_obj['display_name'] || name) + ' ';

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
  }

  animate_message(chatMSG, true);
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

// EventListener to detect OBS scene change
// Changes chat msg class based on current scene
function register_obs_handling()
{
  if (!window.obsstudio) return;
  window.addEventListener('obsSceneChanged', event => {
    // console.log("Bot: scene name: ", event.detail.name);
    current_obs_scene = event.detail.name;
    update_chat_animaton();
  })

  update_current_scene();

  // window.obsstudio.getCurrentScene( scene => {
  //   // display_msg("Bot: ", scene, '', '');
  //   // console.log("Bot: scene name: ", scene.name);
  //   if (scene.name === 'Cam Only') {
  //     document.documentElement.classList.add('obs-scene-cam-only');
  //   }
  // })
  // window.addEventListener('obsSceneChanged', event => {
  //   if (event.detail.name === 'Cam Only') {
  //     document.documentElement.classList.add('obs-scene-cam-only');
  //   }
  //   else {
  //     document.documentElement.classList.remove('obs-scene-cam-only');
  //   }
  //   // console.log("Bot: scene name: ", event.detail.name);
  //   // display_msg("Bot: ", event.detail.name, '', '');
  // })
}
register_obs_handling();

//initialize scene name to global variable
function update_current_scene()
{
  window.obsstudio.getCurrentScene( scene => {
    // console.log("Bot: scene name: ", scene.name);
    current_obs_scene = scene.name;
  })
}

//turn all chat message fadeout animation on/off
//based on current_obs_scene
function update_chat_animaton()
{
  let chatMSGs = document.getElementsByClassName('message_box');
  // console.log("chatMSGs", chatMSGs);
  for (const msg_box of chatMSGs) {
    // console.log("msg_box", msg_box);
    animate_message(msg_box);
  }
}

function animate_message(msg_box, is_new_msg=false)
{
  if (current_obs_scene === 'Cam Only') {
    // msg_box.style.animation = 'none';
    msg_box.style.animation = is_new_msg ? 'fadeIn 1s' : 'none';
    return;
  }

  let msg_txt = msg_box.querySelector('.Message');
  // console.log("chat_message_div", msg_div);

  let fade_time = msg_txt.textContent.length/3;

  fade_time = Math.max(10, Math.min(30, fade_time));
  let expectedEndTime = performance.now() + 1000 * fade_time;
  if (expectedEndTime < msg_time) {
    fade_time = (msg_time - performance.now())/1000;
  }
  else {
    msg_time = expectedEndTime;
  }

  if (is_new_msg) {
    msg_box.style.animation = `fadeIn 1s, fadeOut forwards 1s ${fade_time}s`;
  }
  else {
    msg_box.style.animation = `fadeOut forwards 1s ${fade_time}s`;
  }
}



//You have three situations where you 
//need to deal with animation: 
//1)when a chat message is received,
//2)when you switch to cam only, 
//3)and when you switch away from cam only

//When you receive a chat message, you 
//need to check if you're in the cam only
//scene and not set the animation
//(and set it if you're on another scene)

//When you switch to cam only, you need 
//to go through the elements and remove 
//the animation

//When you switch away from cam only, 
//you need to recalculate the animations 
//and set it on the elements again

//a) use a global with the current scene name 
//(or at least a boolean for whether 
//or not the messages should be fading out)
//The reason for this is because you have 
//an event handler that handles whenever 
//the scene changes, and you can retrieve 
//it once, and then you have direct access 
//to it all of the time without having to 
//wait for a callback or a promise to 
//resolve as in the case of asking for the 
//scene name again whenever you receive a 
//new chat message

//Then b) I would make a new function to 
//deal with updating one of the message_box 
//elements with the appropriate animation 
//style, depending on that global variable
//Importantly, it would take the element and 
//nothing else - it can calculate the "length" 
//of the message by inspecting the 
//innerText / textContent of the element 
//instead of the incoming chat message directly
//This is because when you're dealing with 
//the scene changes, you don't have direct 
//access to the chat messages anymore, so 
//the calculation becomes consistent everywhere

//Then c) Update the incoming chat message handler 
//and scene change handlers to pass the elements 
//into that function
//That function can also deal with the short-text 
//after long text thing, and still use that 
//msg_time global, etc


