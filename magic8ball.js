let magic8ball_arr = [];

async function load_8ball_txt()
{
  let txt = await (await fetch("8ball.txt")).text();
  magic8ball_arr = txt.split('\n');
}
load_8ball_txt();

export function magic8ball()
{
  let rnd = Math.floor(Math.random() * 33);
  return magic8ball_arr[rnd];
}

