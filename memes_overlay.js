//this isn't actually used anywhere
//just storing this here as a backup
//for when I want to play memes in a webpage
//instead of in OBS

const obs_sources = {};

//import scenes from previous version of OBS
//into current version of OBS
async function load_sources()
{
  const file = await fetch("../obs_scenes_12.18.23");
  const json = await file.json();
  // console.log("json: ", json);

  // let volume = json.sources.find(el => el.name === )
  let source_info = new Map;
  for (const item of json.sources) {
    // source_info.set(item.name, item.volume);

    source_info.set(item.name, [item.volume, item.settings.local_file]);

  }
  console.log("source_info: ", source_info);

  let clips = json.sources.find(el => el.name === "Clips");
  // console.log("clips: ", clips);

  let source_map = new Map;
  for (const item of clips.settings.items) {
    source_map.set(item.name, item);
  }
  // console.log("source_map: ", source_map);

  for (const source_item of source_map) {
    // console.log(source_item);
    // let current_source = clips.settings.items.find(el => el.name === source_item.name);
    // console.log(current_source);

    obs_sources[source_item[0]] = {
      "transform" : {
        "cropBottom": source_item[1].crop_bottom,
        "cropTop"   : source_item[1].crop_top,
        "cropRight" : source_item[1].crop_right,
        "cropLeft"  : source_item[1].crop_left,
        "positionX" : source_item[1].pos.x,
        "positionY" : source_item[1].pos.y,
        "scaleX"    : source_item[1].scale.x,
        "scaleY"    : source_item[1].scale.y,
        "volume"    : source_info.get(source_item[0])[0],
        "file"      : source_info.get(source_item[0])[1]
      }
    }
  }
  console.log("obs_sources: ", obs_sources);
}
//comment next line in to run import function
// load_sources();

//play memes? I think this was supposed
//to replace OBS Clips scene, but I don't
//think I'm using it right now
export function play_memes(meme)
{
  let play_meme = document.getElementById("memes");
  let video = document.createElement("video");
  video.addEventListener("ended", stop_memes);
  video.addEventListener("error", console.log);

  console.log(meme);

  try {
    video.src = obs_sources[meme].file;
  }
  catch (err) {
    console.log(err);
  }

  video.play();
  play_meme.append(video);
}

function stop_memes(event)
{
  // console.log("meme: ", event);
  event.target.remove();
}