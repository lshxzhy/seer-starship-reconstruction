// Compress long rosters before handing the snapshot to the conversation host.
function createWidgetSpiritRecords(readArchive,writeArchive){
  async function decode(item){
    if(!item)return {revision:0,data:null};
    if(!item.gzip)return {revision:item.revision,data:item.data};
    const bytes=Uint8Array.from(atob(item.gzip),c=>c.charCodeAt(0));
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return {revision:item.revision,data:JSON.parse(await new Response(stream).text())};
  }
  return {read:()=>decode(readArchive()),async commit(expected,data){
    const item=readArchive();
    if((item?.revision||0)!==expected)return {ok:false,record:await decode(item)};
    const revision=expected+1;let archive={revision,data};
    const json=JSON.stringify(data);
    if(typeof CompressionStream==='function'&&typeof DecompressionStream==='function'){
      const blob=new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
      const bytes=new Uint8Array(await new Response(blob).arrayBuffer());
      let raw='';for(const byte of bytes)raw+=String.fromCharCode(byte);
      archive={revision,gzip:btoa(raw)};
    }
    await writeArchive(archive);
    return {ok:true,record:{revision,data}};
  }};
}
