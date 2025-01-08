// play scene items from obs based on twich chat
let clipSceneItemList = {};

export function OBS_connect() {
  const OBSWebSocketURL = 'ws://127.0.0.1:4455';
  const wsOBS = new WebSocket(OBSWebSocketURL, 'obswebsocket.json');

  wsOBS.onopen  = console.log;
  wsOBS.onclose = console.log;
  wsOBS.onerror = console.log;

  wsOBS.onmessage = (msg)=> {
    const obsMSG = JSON.parse(msg.data);

    if (obsMSG['op'] == 0) {
      let wsVersion = obsMSG.d.obsWebSocketVersion;
      let wsRPCVersion = obsMSG.d.rpcVersion;

      if (wsRPCVersion != 1) {
        console.error("OBS RPC version changed! Now I'm out of DATE!")
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

