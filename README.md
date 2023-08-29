# basic_twitch_chat
A _very_ basic interface with twitch chat, with a built-in include for playing OBS scene items

## To get working:
Download all 3 files into the same folder (twitch_chat.html, twitch_chat.js, obs_control.mjs)

### In OBS:
  Create a new browser source in the scene you 
    want chat to show up in.  
  Add twitch_chat.html as that browser source.

### In twitch_chat.js:
  Change the channelName constant to your channel name.  
  If obs_control is not used, comment out lines 2, 3, and 48
    (use // in front of "import" and "const wsOBS" and "play_clip_items")
    
### If obs_control.js is used:
  Change clips_scene name to the name of the scene in your OBS
    that holds clips you want to play,  
    and change OBSWebSocketURL to match the port for your OBS
    (found under Tools-->WebSocket Server Settings).

    
