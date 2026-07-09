let emotes_7tv = new Map();

async function get_7tv_twitch_id(twitch_name)
{
  let payload = {
    query: `query GetTwitchID($query: String!) {
    users(query: $query) {
    connections {
      platform
      username
      id
    }}}`,
    variables: {
      query: twitch_name
  }};

  let res = await fetch("https://7tv.io/v3/gql", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  let res_json = await res.json();
  // console.log("twitch id for 7tv: ", res_json);
  // the llm's keep suggesting I use search to get the id, but eff em
  // however this is somewhat fragile if this changes
  // ...but really, if it changes then there's no guarantee
  // the new struct will even have an 'id' entry
  let id = res_json['data']['users'][0]['connections'][0]['id']

  return id;
}

export async function get_7tv_user_emotes(user)
{
  let twitch_id = await get_7tv_twitch_id(user);
  // console.log(twitch_id);

  let res = await fetch(`https://7tv.io/v3/users/twitch/${twitch_id}`);
  let emotes = await res.json();

  emotes.emote_set.emotes.forEach(e=>{
    emotes_7tv.set(e.name, e.id);
  });
}

export async function get_7tv_global_emotes()
{
  fetch("https://7tv.io/v3/emote-sets/global")
        .then(r=>r.json())
        .then(d=>{
          const emotes = d.emotes;
          emotes.forEach(e=>{
            emotes_7tv.set(e.name, e.id);
          });
        });

  // console.log("emotes_7tv: ", emotes_7tv);
  return emotes_7tv;
}

// this takes the outmsg string from twitch_chat.js
// and checks each word in the string for a match with 7tv emote names
// then replaces those words with the equivalent img element
export function parse_7tv_emotes(msg)
{
  let word_array = msg.split(" ");
  let outmsg = msg;

  for (let i = 0; i < word_array.length; i++) {
    const word = word_array[i];

    if (emotes_7tv.has(word)) {
      let id = emotes_7tv.get(word);

      let emote = document.createElement("img");
      emote.setAttribute('src', `https://cdn.7tv.app/emote/${id}/2x.webp`);
      emote.style = 'display: inline;'
      if (i!==0) {
        emote.style = 'margin-left: -14px';
      }

      word_array[i] = emote.outerHTML;
    }
  }
  outmsg = word_array.join(" ");

  return outmsg;
}