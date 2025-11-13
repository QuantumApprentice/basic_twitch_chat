// play scene items from obs based on twich chat
let clipSceneItemList = {};
let banned_memes = null;

export function OBS_connect() {
  const OBSWebSocketURL = 'ws://127.0.0.1:4455';
  const wsOBS = new WebSocket(OBSWebSocketURL, 'obswebsocket.json');

  wsOBS.onopen  = console.log;
  wsOBS.onclose = console.log;
  wsOBS.onerror = console.log;

  wsOBS.onmessage = (msg)=> {
    const obsMSG = JSON.parse(msg.data);

    if (obsMSG['op'] == 0) {
      // let wsVersion = obsMSG.d.obsWebSocketVersion;
      let wsRPCVersion = obsMSG.d.rpcVersion;

      if (wsRPCVersion != 1) {
        console.error("OBS RPC version changed! Now I'm out of DATE!");
      }

      const myIdentifyResponse = {
        'op' : 1,
        'd'  : {"rpcVersion":1}
      }
      const out = JSON.stringify(myIdentifyResponse);
      wsOBS.send(out);
    }
    else if (obsMSG['op'] == 2) {
      parse_clip_items(wsOBS);
    }
    else if (obsMSG['op'] == 5) {
      close_clip_items(wsOBS, obsMSG);
    }
    else if (obsMSG['op'] == 7) {
      store_scene_items_list(obsMSG);
      load_banned_items_list();
    }
    else {
      console.log("not 0 or 7: ", obsMSG);
    }
  }

  return wsOBS;
}

function close_clip_items(wsOBS, obj) {
  if (obj.d.eventType == "MediaInputPlaybackEnded") {
    let request = {
      "op" : 8,
      "d"  : {
        "requestId"    : "Quantum Bot",
        "haltOnFailure": false,
        "requests": [
          {   //turn monitoring off (prevents audio sources from staying open)
            "requestType": "SetInputAudioMonitorType",
            "requestId"  : "Quantum Bot",
            "requestData": {
              "inputName"  : obj.d.eventData.inputName,
              "monitorType": "OBS_MONITORING_TYPE_NONE"
            }
          },
          {   //disable scene item (close video)
            "requestType"  : "SetSceneItemEnabled",
            "requestId"    : "Quantum Bot",
            "requestData"  : {
              "sceneName"  : "Clips",
              "sceneItemId": clipSceneItemList[obj.d.eventData.inputName],
              "sceneItemEnabled": false,
            }
          }
        ]
      }
    }
    wsOBS.send(JSON.stringify(request));

    // let stop_media = {
    //   "op": 6,
    //   "d" : {
    //     "requestType"  : "SetSceneItemEnabled",
    //     "requestId"    : "Quantum Bot",
    //     "requestData"  : {
    //       "sceneName"  : "Clips",
    //       "sceneItemId": clipSceneItemList[obj.d.eventData.inputName],
    //       "sceneItemEnabled": false,
    //     }
    //   }
    // }
    // wsOBS.send(JSON.stringify(stop_media));
  }
}

function load_banned_items_list()
{
  banned_memes = JSON.parse(
    localStorage.getItem("banned_memes") || '{}'
  );

  // console.log("banned memes list: ", banned_memes);
  // console.log("localStorage ", localStorage);
}

//returns time until ban is lifted
//or 0 if not banned
export function meme_is_banned(meme)
{
  if (banned_memes) {
    return (banned_memes[meme]);
  } else {
    return 0;
  }
}

export function clear_banned_memes()
{
  localStorage.removeItem("banned_memes");
  load_banned_items_list();
}

export function ban_meme_item(msg)
{
  console.log("working on banning memes");

  const day = 24*60*60*1000; //86400000; //ms per 24 hours
  let banTime = 0;
  if (meme_is_banned(msg)) {
    banTime = Number(banned_memes[msg]) + day;
  } else {
    banTime = Date.now() + day;
  }

  if (banned_memes == null) {
    banned_memes = {};
  }
  banned_memes[msg] = banTime;

  localStorage.setItem("banned_memes", JSON.stringify(banned_memes));
  // console.log("localStorage after setItem() ", localStorage);
}


//TODO: add a queue for the clips to play
//    one at a time
export function play_clip_items(wsOBS, clipname) {

  if (clipSceneItemList[clipname]) {
    play_clip(wsOBS, clipname);
  } else if (clipname == "schwarzenoises") {
    play_clip(wsOBS, "sch-back");
    play_clip(wsOBS, "sch-airplane");
    play_clip(wsOBS, "sch-legs");
    play_clip(wsOBS, "sch-lungs");
    play_clip(wsOBS, "sch-body");
    play_clip(wsOBS, "sch-groin");
  } else if (clipname == "slaprandom") {
    if (Math.random() > .5) {
      play_clip(wsOBS, "slap");
    } else {
      play_clip(wsOBS, "shutup2");
    }

  } else {
    return false;
  }

  return true;
}

function play_clip(wsOBS, clipname)
{
  let request = {
    "op" : 8,
    "d"  : {
      "requestId"    : "Quantum Bot",
      "haltOnFailure": false,
      "requests": [
        {       //play the clip
          "requestType"  : "SetSceneItemEnabled",
          "requestData"  : {
            "sceneName"  : "Clips",
            "sceneItemId": clipSceneItemList[clipname],
            "sceneItemEnabled": true
          }
        }, {    //set audio to monitoring (so I can hear the audio)
          "requestType": "SetInputAudioMonitorType",
          "requestData": {
            "inputName"  : clipname,
            "monitorType": "OBS_MONITORING_TYPE_MONITOR_ONLY"
          }
        }
      ]
    }
  }
  wsOBS.send(JSON.stringify(request));
}

function parse_clip_items(wsOBS) {
  let item_list_req = {
    "op": 6,
    "d" : {
      "requestType" : "GetSceneItemList",
      "requestId"   : "Quantum Bot",
      "requestData" : {
        "sceneName" : "Clips"
      }
    }
  }
  wsOBS.send(JSON.stringify(item_list_req));
}

function store_scene_items_list(obsMSG)
{
  // console.log("op 7: ", obsMSG);
  if (obsMSG.d.requestType == "GetSceneItemList") {
    let items = obsMSG.d.responseData.sceneItems;
    for (const item of items) {
      clipSceneItemList[item.sourceName] = item.sceneItemId;
    }
  }
}

