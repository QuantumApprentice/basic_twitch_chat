// @ts-nocheck
let magic8ball, play_memes;
let OBS_connect, play_clip_items, ban_meme_item, meme_is_banned, clear_banned_memes;
let wsOBS;
async function load_modules()
{
  try {
    ({magic8ball} = await import("./magic8ball.js"));
  } catch (error) {
    console.log(error);
  }

  try {
    ({OBS_connect,
      play_clip_items,
      ban_meme_item,
      clear_banned_memes,
      meme_is_banned } = await import("./obs_control.mjs"));
  } catch (error) {
    console.log(error);
  }

  try {
    ({play_memes} = await import ('./memes_overlay.js'));
  } catch (error) {
    console.log(error);
  }
}
await load_modules();

if (OBS_connect) {
  wsOBS = OBS_connect();

  setTimeout(()=>{
    if (wsOBS.readyState != 1)
    wsOBS = OBS_connect();
  }, 10000);
}



//other things to do to this before it's done
//1) *FIXED* chat name needs to match color in chatbox
//2) auto-translate chat from other languages?
//2a)auto-translate captions to other languages?
//3) make on-screen chat messages dissappear when deleted
//4) make on-screen chat msgs disappear when ban/timeout
//5) *FIXED* make chat stay on-screen in webcam only scene
//6) sometimes "!" commands don't work after timeouts/bans?
//7) specialized chat commands for this bot
//    !first, !timer,
//8) make randomized memes play correctly (schwarzenoises, etc.)
//9) make memes play sequentially
//10) *FIXED* /me shows "ACTION" in chatmsg
//11) *FIXED* allow chatters to opt out of showing up on stream-chat
//12) *FIXED* parse "!" commands to allow subsequent text to show
//13) add !magic8ball back into chatbot (need bot account access)
//14) long strings of letters with no break will not wrap
//15) !tts add text to speech back in
//16) obs crashes when memes are played while working on any part of the chat interface

//TODO: Try this stuff:
//1)  *FIXED* Set OBS to turn the "Monitor" setting on clips on while playing, off otherwise
//2)  Import the clip into OBS before playing it, then remove it after
//3)  Write something that allows the web-page to play the clip instead


const channelName        = 'quantumapprentice';
const TwitchWebSocketUrl = 'wss://irc-ws.chat.twitch.tv:443';
const maxMsgCount        = 10;
let   current_obs_scene  = '';


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
    let name_strt = txt.indexOf('@', indx) + 1;
    let name_end  = txt.indexOf(".", name_strt);

    // place msg_idx at the beginning of the
    // first character of the message
    let msg_idx = txt.indexOf(`#${channelName}`) + channelName.length +3;

    // create name based on start/end positions
    name = txt.substring(name_strt, name_end).trim();

    if ((name == ":tmi")
      || (name == "justinfan6969")
      || (name.includes("@emote-only=0;"))
      || (name == ":justinfan6969"))
      { return; }

    outmsg = txt.substring(msg_idx).trim();

    // custom rewards have to have special parsing
    handle_custom_reward(tags_obj, outmsg);

    // check if its a bot command and handle
    if (outmsg[0] == '!') {
      let bot_cmd;
      let spc_indx = outmsg.indexOf(' ');
      if (spc_indx > 0) {
        bot_cmd = outmsg.substring(1,spc_indx);
      }
      else {
        bot_cmd = outmsg.substring(1);
        outmsg = '';
      }

      //play memes if its a meme
      let played = false;
      if (play_clip_items) {
        ({played, outmsg} = handle_obs_control(bot_cmd, name));
      }

      if (!played) {
        //else play other commands
        other_bot_commands(bot_cmd, name);
      }


    }
    // display string on stream if not empty
    if (outmsg && !optout_list.includes(name)) {
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
      // console.log('PONG ' + outmsg);
      wsTwitch.send('PONG ' + outmsg);
    }
  }
}

// return string with time in
// hours minutes seconds (hms)
function convert_to_hms(time)
{
  const current_time = Date.now();
  const diff = time - current_time;

  const seconds = Math.floor(diff/1000);  //ms per s
  const minutes = Math.floor(seconds/60); //s per min
  const hours   = Math.floor(minutes/60); //min per h

  const time_left = `${hours}h${minutes % 60}m${seconds % 60}s`;
  return time_left;
}

function handle_obs_control(bot_cmd, name)
{
  let outmsg, played;
  if (meme_is_banned(bot_cmd)) {
    let ban_time = convert_to_hms(meme_is_banned(bot_cmd));
    outmsg = `!${bot_cmd} This meme is banned for ${ban_time}`;
  } else {
    played = play_clip_items(wsOBS, bot_cmd);

    //TODO: why do I have this here?
    // played = play_memes(bot_cmd);
  }
  if (bot_cmd == "clearmemebans") {
    if (name == channelName) {
      clear_banned_memes();
    }
  }
  return {played, outmsg};
}

function handle_custom_reward(tags_obj, outmsg)
{
  const id = tags_obj.custom_reward_id;
  // this custom reward id is for banning memes temporarily
  if (id === "495a4bcf-5033-42c0-b9bb-93aca4bcf7ae") {
    if (ban_meme_item) {
      ban_meme_item(outmsg);
    }
  }
}

let timer_running = false;
let optout_list   = [];
function other_bot_commands(bot_cmd, name)
{
  // new timer countdown function
  // used to remind me I'm cooking stuff in the kitchen
  if (bot_cmd == "timer") {
    if (!timer_running) {
      timer_running = true;
      let remind_time = 1000*60;
      timer(remind_time);
    }
  }
  if (bot_cmd == "optout") {
    optout_list.push(name);
  }
  if (bot_cmd == "optin") {
    let idx = optout_list.indexOf(name);
    if (idx >= 0) {
      optout_list.splice(idx, 1);
    }
  }
  if (bot_cmd == "magic8ball") {
    if (magic8ball) {
      display_msg(`🎱: ${name}`, magic8ball());
      // wsTwitch.send(`PRIVMSG #${channelName} : ${magic8ball_arr[rnd]}`);
    }
  }
  // if (["specs", "pc", "rig", "pooter"].includes(bot_cmd)) {}
  if (bot_cmd == "specs" || bot_cmd == "pc" || bot_cmd == "rig" || bot_cmd == "pooter")  {
    display_msg(
      "CPU: AMD Ryzen 7 7800X3D 8-core 4.2GHz, \n"      +
      "CPU Cooler: Thermalright PS120SE, \n"            +
      "GFX: nVidia RTX 4060, \n"                        +
      "MOBO: ASRock B650M Pro RS AM5, \n"               +
      "RAM: 32GB G.Skill Flare X5 Series, \n"           +
      "HD: WD_BLACK SN850X NVMe M.2 2280 1TB PCIe, \n"  +
      "PSU: Corsair RM750e ATX"
    )
  }
}

function timer(time)
{
  if (play_clip_items) {
    setTimeout(()=>{
      //need to send message to chat too
      play_clip_items(wsOBS, "khan");
      play_clip_items(wsOBS, "cookie");
      play_clip_items(wsOBS, "nothing");
      play_clip_items(wsOBS, "choppa");
      timer_running = false;
      }, time);
  }
}

// global msg_time to set timeouts on messages
let msg_time = 0;
// display chat message on stream
function display_msg(name, outmsg, tags_obj, emote_list)
{
  let emote;
  let chatMSG = document.createElement("div");

  if (outmsg.startsWith('\x01ACTION')) {
    outmsg = outmsg.substring(7, outmsg.length - 1).trim();

    chatMSG.classList.add('msg_is_emote');
  }

  let auth = document.createElement("div");
  auth.classList.add("Name");

  if (tags_obj?.color) {
    // auth.style.color = tags_obj['color'];
    chatMSG.style.setProperty('--name-color', tags_obj['color']);
  }

  auth.textContent = (tags_obj?.display_name || name) + ' ';

  if (tags_obj?.emotes) {
    let parts = [];
    let end_indx = outmsg.length;

    for (let i = emote_list.length; --i >= 0; ) {
      emote = document.createElement("img");
      emote.setAttribute('src', emote_list[i].url);
      if (i!==0) {
        emote.style = 'margin-left: -14px';
      }

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
      case 'subscriber':          //is user subscribed
        parsed_tags.subscriber = tag_val == 1;
        break;
      case 'custom-reward-id':    //used for meme bans for now
        parsed_tags.custom_reward_id  = tag_val;
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
  });

  update_current_scene();
}
register_obs_handling();

//initialize scene name to global variable
function update_current_scene()
{
  window.obsstudio.getCurrentScene( scene => {
    // console.log("Bot: scene name: ", scene.name);
    current_obs_scene = scene.name;
  });
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

//sanitize function (not currently in use)
function sanitizeMessage(message) {
  message = message.replace(/(<([^>]+)>)/ig, '').trim();
  if(message.length < 1) {
      message = '&lt;/&gt;';
  }
  return message;
}
