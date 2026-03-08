import fs from "fs/promises";

const OUT = "./assets/kanji.js";

async function fetchJSON(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error("HTTP "+r.status);
  return r.json();
}

function clean(arr){
  if(!Array.isArray(arr)) return [];
  return arr.map(x=>String(x).trim()).filter(Boolean);
}

async function main(){

  console.log("Téléchargement liste Jōyō...");

  const list = await fetchJSON("https://kanjiapi.dev/v1/kanji/joyo");

  console.log("Kanji trouvés :", list.length);

  const out = [];

  const batch = 25;

  for(let i=0;i<list.length;i+=batch){

    const part = list.slice(i,i+batch);

    const res = await Promise.all(

      part.map(async k=>{
        try{

          const info = await fetchJSON(`https://kanjiapi.dev/v1/kanji/${k}`);

          return {
            k: info.kanji,
            g: typeof info.grade==="number"?info.grade:7,
            m: clean(info.meanings),
            on: clean(info.on_readings),
            kun: clean(info.kun_readings)
          };

        }catch(e){
          console.log("skip",k);
          return null;
        }
      })

    );

    out.push(...res.filter(Boolean));

    console.log(`Progress ${Math.min(i+batch,list.length)}/${list.length}`);

  }

  const file =
`// AUTO GENERATED JOYO KANJI

export const KANJI =
${JSON.stringify(out,null,2)};
`;

  await fs.writeFile(OUT,file,"utf8");

  console.log("✅ fichier créé :",OUT);
  console.log("kanji écrits :",out.length);

}

main();
