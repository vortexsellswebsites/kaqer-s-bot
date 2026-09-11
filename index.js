const {
  Client, GatewayIntentBits, PermissionsBitField,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, SlashCommandBuilder, ChannelType,
  ModalBuilder, TextInputBuilder, TextInputStyle
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN=process.env.TOKEN;
if(!TOKEN) process.exit(console.error("❌ TOKEN missing"));

const DATA=path.join(__dirname,"data");
const ECO=path.join(DATA,"economy.json");
if(!fs.existsSync(DATA)) fs.mkdirSync(DATA,{recursive:true});

function load(file,def){
  try{return fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):def}
  catch{return def}
}
function save(file,data){fs.writeFileSync(file,JSON.stringify(data,null,2))}
let economy=load(ECO,{});

const OWNER="👑 Owner";
const MOD="🛡️ Moderator";
const STAFF="🔨 Staff";
const VERIFIED="Verified";
const MEMBER="Member";

function user(id){
  if(!economy[id]) economy[id]={
    coins:1000,bank:0,animals:{},pets:[],
    inventory:[],lastDaily:0,lastWork:0,wins:0,losses:0,warnings:[]
  };
  return economy[id];
}
function role(m,r){return m.roles.cache.some(x=>x.name===r)}
function owner(m){return m.id===m.guild.ownerId||role(m,OWNER)}
function mod(m){return owner(m)||role(m,MOD)}
function staff(m){return mod(m)||role(m,STAFF)}
function money(n){return Number(n||0).toLocaleString()}
function deny(i,t){return i.reply({content:t,ephemeral:true})}

const animals=[
 ["cat","common",30,100,"🐱","https://cataas.com/cat"],
 ["dog","common",25,90,"🐶"],
 ["rabbit","common",18,75,"🐰"],
 ["fox","uncommon",10,250,"🦊"],
 ["frog","uncommon",7,300,"🐸"],
 ["panda","rare",4,750,"🐼"],
 ["penguin","rare",3,850,"🐧"],
 ["koala","epic",1.5,1500,"🐨"],
 ["tiger","epic",.8,3000,"🐯"],
 ["dragon","legendary",.5,10000,"🐉"],
 ["unicorn","mythic",.2,25000,"🦄"]
];

function hunt(){
 let total=animals.reduce((a,x)=>a+x[2],0),r=Math.random()*total;
 for(const a of animals){r-=a[2];if(r<=0)return a}
 return animals[0];
}

const C=[];

const cmd=(name,desc,build)=>new SlashCommandBuilder()
 .setName(name).setDescription(desc);

C.push(
 cmd("ban","ban a member",x=>x),
 cmd("unban","unban a user"),
 cmd("kick","kick a member"),
 cmd("timeout","timeout a member"),
 cmd("untimeout","remove timeout"),
 cmd("warn","warn a member"),
 cmd("warnings","view warnings"),
 cmd("clear","delete messages"),
 cmd("slowmode","set slowmode"),
 cmd("lock","lock channel"),
 cmd("unlock","unlock channel"),
 cmd("ping","bot latency"),
 cmd("userinfo","user information"),
 cmd("serverinfo","server information"),
 cmd("avatar","view avatar"),
 cmd("botinfo","bot information"),
 cmd("8ball","magic 8ball"),
 cmd("coinflip","flip a coin"),
 cmd("dice","roll dice"),
 cmd("roll","roll a number"),
 cmd("choose","choose an option"),
 cmd("rps","rock paper scissors"),
 cmd("ship","ship two users"),
 cmd("balance","check balance"),
 cmd("daily","daily coins"),
 cmd("work","work for coins"),
 cmd("pay","pay a user"),
 cmd("hunt","hunt an animal"),
 cmd("leaderboard","richest users"),
 cmd("deposit","deposit coins"),
 cmd("withdraw","withdraw coins"),
 cmd("slots","play slots"),
 cmd("gamble","gamble coins"),
 cmd("dicebet","bet on dice"),
 cmd("pets","view pets"),
 cmd("pet","make animal a pet"),
 cmd("feed","feed pet"),
 cmd("play","play with pet"),
 cmd("inventory","view inventory"),
 cmd("shop","view shop"),
 cmd("verify-panel","send verification"),
 cmd("ticket-panel","send ticket panel"),
 cmd("mod-panel","send mod application"),
 cmd("rules","send rules"),
 cmd("announce","make announcement"),
 cmd("say","make bot speak"),
 cmd("addrole","create role"),
 cmd("removerole","delete role"),
 cmd("role","give/remove role"),
 cmd("nick","change nickname"),
 cmd("save-backup","save server backup"),
 cmd("backup","restore backup")
);

function options(c){
 switch(c.name){
  case"ban":case"kick":case"timeout":case"untimeout":case"warn":case"warnings":
   c.addUserOption(o=>o.setName("user").setDescription("user").setRequired(true));break;
  case"unban":c.addStringOption(o=>o.setName("userid").setDescription("user id").setRequired(true));break;
  case"clear":c.addIntegerOption(o=>o.setName("amount").setDescription("1-100").setMinValue(1).setMaxValue(100).setRequired(true));break;
  case"slowmode":c.addIntegerOption(o=>o.setName("seconds").setDescription("seconds").setMinValue(0).setMaxValue(21600).setRequired(true));break;
  case"8ball":c.addStringOption(o=>o.setName("question").setDescription("question").setRequired(true));break;
  case"roll":c.addIntegerOption(o=>o.setName("max").setDescription("maximum").setMinValue(2).setMaxValue(1000000).setRequired(true));break;
  case"choose":c.addStringOption(o=>o.setName("options").setDescription("comma separated").setRequired(true));break;
  case"pay":c.addUserOption(o=>o.setName("user").setDescription("user").setRequired(true)).addIntegerOption(o=>o.setName("amount").setDescription("amount").setMinValue(1).setRequired(true));break;
  case"balance":case"avatar":c.addUserOption(o=>o.setName("user").setDescription("user"));break;
  case"deposit":case"withdraw":case"slots":case"gamble":case"dicebet":c.addIntegerOption(o=>o.setName("amount").setDescription("amount").setMinValue(1).setRequired(true));break;
  case"pet":c.addStringOption(o=>o.setName("animal").setDescription("animal").setRequired(true));break;
  case"feed":case"play":c.addIntegerOption(o=>o.setName("number").setDescription("pet number").setMinValue(1).setRequired(true));break;
  case"announce":case"say":c.addStringOption(o=>o.setName("message").setDescription("message").setRequired(true));break;
  case"addrole":c.addStringOption(o=>o.setName("name").setDescription("role name").setRequired(true));break;
  case"removerole":c.addRoleOption(o=>o.setName("role").setDescription("role").setRequired(true));break;
  case"role":
   c.addUserOption(o=>o.setName("user").setDescription("user").setRequired(true))
    .addRoleOption(o=>o.setName("role").setDescription("role").setRequired(true))
    .addStringOption(o=>o.setName("action").setDescription("action").setRequired(true)
    .addChoices({name:"give",value:"give"},{name:"remove",value:"remove"}));break;
  case"nick":
   c.addUserOption(o=>o.setName("user").setDescription("user").setRequired(true))
    .addStringOption(o=>o.setName("nickname").setDescription("nickname").setRequired(true));break;
  case"ship":
   c.addUserOption(o=>o.setName("user1").setDescription("first").setRequired(true))
    .addUserOption(o=>o.setName("user2").setDescription("second").setRequired(true));break;
  case"rps":
   c.addStringOption(o=>o.setName("choice").setDescription("choice").setRequired(true)
   .addChoices({name:"rock",value:"rock"},{name:"paper",value:"paper"},{name:"scissors",value:"scissors"}));break;
 }
 return c;
}

const commands=C.map(x=>options(x).toJSON());

client.once("clientReady", () => {
 console.log(`✅ ${client.user.tag} online`);
 await client.application.commands.set(commands);
 console.log(`✅ ${commands.length} commands loaded`);
});

client.on("guildMemberAdd",async m=>{
 const r=m.guild.roles.cache.find(x=>x.name===MEMBER);
 if(r) await m.roles.add(r).catch(()=>{});
 const ch=m.guild.channels.cache.find(x=>["welcome","👋・welcome"].includes(x.name));
 if(ch) ch.send(`👋 welcome ${m} to **${m.guild.name}**`).catch(()=>{});
});

client.on("interactionCreate",async i=>{
 if(i.isButton()){
  if(i.customId==="verify"){
   const r=i.guild.roles.cache.find(x=>x.name===VERIFIED);
   if(!r)return deny(i,"❌ Verified role doesn't exist.");
   await i.member.roles.add(r).catch(()=>{});
   return deny(i,"✅ you're verified!");
  }

  if(i.customId==="create_ticket"){
   const name=`ticket-${i.user.username.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,15)}`;
   if(i.guild.channels.cache.find(x=>x.name===name))return deny(i,"❌ you already have a ticket.");
   const ch=await i.guild.channels.create({
    name,type:ChannelType.GuildText,
    permissionOverwrites:[
     {id:i.guild.id,deny:[PermissionsBitField.Flags.ViewChannel]},
     {id:i.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages]}
    ]
   });
   const row=new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("close_ticket").setLabel("close ticket").setStyle(ButtonStyle.Danger)
   );
   await ch.send({content:`${i.user}`,embeds:[new EmbedBuilder().setTitle("🎫 Ticket").setDescription("Tell us what you need help with.")],components:[row]});
   return deny(i,`✅ ticket created: ${ch}`);
  }

  if(i.customId==="close_ticket"){
   if(!staff(i.member))return deny(i,"❌ staff only.");
   return i.channel.delete().catch(()=>{});
  }

  if(i.customId==="moderator_apply"){
   const modal=new ModalBuilder().setCustomId("mod_apply").setTitle("Moderator Application");
   for(const [id,label,style] of [
    ["age","how old are you?",TextInputStyle.Short],
    ["experience","staff experience?",TextInputStyle.Paragraph],
    ["reason","why should we choose you?",TextInputStyle.Paragraph]
   ])modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(true)
   ));
   return i.showModal(modal);
  }

  if(i.customId.startsWith("accept_")){
   if(!mod(i.member))return deny(i,"❌ moderators only.");
   const m=await i.guild.members.fetch(i.customId.slice(7)).catch(()=>null);
   if(m){
    const r=i.guild.roles.cache.find(x=>x.name===MOD);
    if(r)await m.roles.add(r).catch(()=>{});
   }
   return i.update({content:`✅ application accepted for ${m||"user"}`,components:[]});
  }

  if(i.customId.startsWith("deny_")){
   if(!mod(i.member))return deny(i,"❌ moderators only.");
   return i.update({content:"❌ application denied.",components:[]});
  }
 }

 if(i.isModalSubmit()&&i.customId==="mod_apply"){
  const ch=i.guild.channels.cache.find(x=>["mod-applications","moderator-applications"].includes(x.name));
  if(!ch)return deny(i,"❌ application channel doesn't exist.");
  const row=new ActionRowBuilder().addComponents(
   new ButtonBuilder().setCustomId(`accept_${i.user.id}`).setLabel("accept").setStyle(ButtonStyle.Success),
   new ButtonBuilder().setCustomId(`deny_${i.user.id}`).setLabel("deny").setStyle(ButtonStyle.Danger)
  );
  await ch.send({
   embeds:[new EmbedBuilder().setTitle("🛡️ Moderator Application").setDescription(
    `**applicant:** ${i.user}\n**age:** ${i.fields.getTextInputValue("age")}\n**experience:** ${i.fields.getTextInputValue("experience")}\n**why:** ${i.fields.getTextInputValue("reason")}`
   )],components:[row]
  });
  return deny(i,"✅ application submitted!");
 }

 if(!i.isChatInputCommand())return;
 const c=i.commandName,m=i.member;

 const levels={
  ban:"owner",unban:"owner",kick:"mod",timeout:"staff",untimeout:"staff",
  warn:"mod",warnings:"mod",clear:"mod",slowmode:"mod",lock:"mod",unlock:"mod",
  "verify-panel":"owner","ticket-panel":"owner","mod-panel":"owner",rules:"owner",
  announce:"owner",say:"owner",addrole:"owner",removerole:"owner",role:"owner",
  nick:"owner","save-backup":"owner",backup:"owner"
 };
 if(levels[c]){
  const ok=levels[c]==="owner"?owner(m):levels[c]==="mod"?mod(m):staff(m);
  if(!ok)return deny(i,`❌ ${levels[c]} only.`);
 }

 const u=i.options.getUser("user");
 const amount=i.options.getInteger("amount");
 const data=user(i.user.id);

 if(c==="ping")return i.reply(`🏓 pong — ${client.ws.ping}ms`);
 if(c==="botinfo")return i.reply(`🤖 **${client.user.username}**\nservers: ${client.guilds.cache.size}\nusers: ${client.users.cache.size}`);
 if(c==="avatar")return i.reply((u||i.user).displayAvatarURL({size:1024}));
 if(c==="serverinfo")return i.reply(`🏠 **${i.guild.name}**\nmembers: **${i.guild.memberCount}**\nchannels: **${i.guild.channels.cache.size}**\nroles: **${i.guild.roles.cache.size}**`);
 if(c==="userinfo"){
  const x=u||i.user;
  return i.reply({embeds:[new EmbedBuilder().setTitle(`👤 ${x.username}`).setThumbnail(x.displayAvatarURL()).addFields({name:"ID",value:x.id})]});
 }

 if(c==="coinflip")return i.reply(Math.random()<.5?"🪙 heads!":"🪙 tails!");
 if(c==="dice")return i.reply(`🎲 **${Math.floor(Math.random()*6)+1}**`);
 if(c==="roll")return i.reply(`🎲 **${Math.floor(Math.random()*i.options.getInteger("max"))+1}**`);
 if(c==="8ball"){
  const a=["yes","no","maybe","definitely","nah 😭","ask again later","100%"];
  return i.reply(`🎱 ${a[Math.floor(Math.random()*a.length)]}`);
 }
 if(c==="choose"){
  const a=i.options.getString("options").split(",").map(x=>x.trim()).filter(Boolean);
  return i.reply(`👉 i choose **${a[Math.floor(Math.random()*a.length)]}**`);
 }
 if(c==="rps"){
  const a=i.options.getString("choice"),b=["rock","paper","scissors"][Math.floor(Math.random()*3)];
  const win=(a==="rock"&&b==="scissors")||(a==="paper"&&b==="rock")||(a==="scissors"&&b==="paper");
  return i.reply(`you: **${a}**\nme: **${b}**\n\n${a===b?"tie 😭":win?"you win 🏆":"i win 😭"}`);
 }
 if(c==="ship"){
  return i.reply(`💗 ${i.options.getUser("user1")} + ${i.options.getUser("user2")} = **${Math.floor(Math.random()*101)}%**`);
 }

 if(c==="balance"){
  const x=user(u?.id||i.user.id);
  return i.reply(`💰 **${u?.username||i.user.username}**\nwallet: **${money(x.coins)}**\nbank: **${money(x.bank)}**`);
 }

 if(c==="daily"){
  if(Date.now()-data.lastDaily<86400000)return deny(i,"⏰ daily is still on cooldown.");
  const n=Math.floor(Math.random()*1001)+1000;
  data.coins+=n;data.lastDaily=Date.now();save(ECO,economy);
  return i.reply(`🎁 daily — **+${money(n)} coins**`);
 }

 if(c==="work"){
  if(Date.now()-data.lastWork<1800000)return deny(i,"⏰ work is on cooldown.");
  const n=Math.floor(Math.random()*501)+250;
  data.coins+=n;data.lastWork=Date.now();save(ECO,economy);
  return i.reply(`💼 you worked and earned **${money(n)} coins**`);
 }

 if(c==="pay"){
  const r=i.options.getUser("user"),x=user(r.id);
  if(r.id===i.user.id||data.coins<amount)return deny(i,"❌ not enough coins.");
  data.coins-=amount;x.coins+=amount;save(ECO,economy);
  return i.reply(`💸 paid ${r} **${money(amount)} coins**`);
 }

 if(c==="deposit"){
  if(data.coins<amount)return deny(i,"❌ not enough coins.");
  data.coins-=amount;data.bank+=amount;save(ECO,economy);
  return i.reply(`🏦 deposited **${money(amount)} coins**`);
 }

 if(c==="withdraw"){
  if(data.bank<amount)return deny(i,"❌ not enough bank coins.");
  data.bank-=amount;data.coins+=amount;save(ECO,economy);
  return i.reply(`🏦 withdrew **${money(amount)} coins**`);
 }

 if(c==="hunt"){
  const a=hunt();
  data.animals[a[0]]=(data.animals[a[0]]||0)+1;save(ECO,economy);
  const e=new EmbedBuilder().setTitle(`${a[4]} You caught a ${a[0]}!`).setDescription(`rarity: **${a[1]}**\nvalue: **${money(a[3])} coins**\nyou have **${data.animals[a[0]]}**`);
  if(a[5])e.setImage(a[5]);
  return i.reply({embeds:[e]});
 }

 if(c==="leaderboard"){
  const list=Object.entries(economy).sort((a,b)=>(b[1].coins+b[1].bank)-(a[1].coins+a[1].bank)).slice(0,10);
  return i.reply(`🏆 **Leaderboard**\n\n${list.map((x,n)=>`**${n+1}.** <@${x[0]}> — **${money(x[1].coins+x[1].bank)}**`).join("\n")}`);
 }

 if(["gamble","slots","dicebet"].includes(c)){
  if(data.coins<amount)return deny(i,"❌ not enough coins.");
  if(c==="gamble"){
   const win=Math.random()<.5;
   data.coins+=win?amount:-amount;win?data.wins++:data.losses++;
   save(ECO,economy);return i.reply(win?`🎰 **YOU WON** +${money(amount)}`:`🎰 **YOU LOST** -${money(amount)} 😭`);
  }
  if(c==="dicebet"){
   const r=Math.floor(Math.random()*6)+1,win=r>=4;
   data.coins+=win?amount:-amount;save(ECO,economy);
   return i.reply(`🎲 rolled **${r}** — ${win?`won **${money(amount)}**`:`lost **${money(amount)}** 😭`}`);
  }
  const s=["🍒","🍋","🍊","🍉","⭐","💎"],a=[0,1,2].map(()=>s[Math.floor(Math.random()*s.length)]);
  const win=a[0]===a[1]&&a[1]===a[2]?amount*5:a[0]===a[1]||a[1]===a[2]||a[0]===a[2]?amount*2:0;
  data.coins+=win?win:-amount;save(ECO,economy);
  return i.reply(`🎰 **${a.join(" | ")}**\n${win?`🔥 won **${money(win)}**`:`😭 lost **${money(amount)}**`}`);
 }

 if(c==="pets"){
  return i.reply(data.pets.length?`🐾 **Pets**\n${data.pets.map((p,n)=>`**${n+1}.** ${p.emoji} ${p.name} — ${p.rarity}`).join("\n")}`:"🐾 no pets yet.");
 }

 if(c==="pet"){
  const n=i.options.getString("animal").toLowerCase(),a=animals.find(x=>x[0]===n);
  if(!a||!data.animals[n])return deny(i,"❌ you haven't caught that animal.");
  data.animals[n]--;data.pets.push({name:n,emoji:a[4],rarity:a[1],hunger:100,happiness:100});save(ECO,economy);
  return i.reply(`${a[4]} your **${n}** is now your pet!`);
 }

 if(c==="feed"||c==="play"){
  const p=data.pets[i.options.getInteger("number")-1];
  if(!p)return deny(i,"❌ pet not found.");
  c==="feed"?p.hunger=Math.min(100,p.hunger+25):p.happiness=Math.min(100,p.happiness+25);
  save(ECO,economy);return i.reply(`${p.emoji} you ${c==="feed"?"fed":"played with"} **${p.name}**`);
 }

 if(c==="inventory")return i.reply(data.inventory.length?`🎒 ${data.inventory.join("\n")}`:"🎒 inventory empty.");
 if(c==="shop")return i.reply("🛒 **Shop**\n\n🍖 pet food — 100 coins\n🎾 pet toy — 250 coins");

 if(c==="verify-panel"){
  return i.channel.send({
   embeds:[new EmbedBuilder().setTitle("✅ Verification").setDescription("Click below to verify.")],
   components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("verify").setLabel("Verify").setStyle(ButtonStyle.Success))]
  }).then(()=>deny(i,"✅ panel sent."));
 }

 if(c==="ticket-panel"){
  return i.channel.send({
   embeds:[new EmbedBuilder().setTitle("🎫 Support").setDescription("Click below to open a ticket.")],
   components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("create_ticket").setLabel("Open Ticket").setStyle(ButtonStyle.Primary))]
  }).then(()=>deny(i,"✅ panel sent."));
 }

 if(c==="mod-panel"){
  return i.channel.send({
   embeds:[new EmbedBuilder().setTitle("🛡️ Moderator Applications").setDescription("Click below to apply.")],
   components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("moderator_apply").setLabel("Apply").setStyle(ButtonStyle.Primary))]
  }).then(()=>deny(i,"✅ panel sent."));
 }

 if(c==="rules"){
  return i.channel.send({embeds:[new EmbedBuilder().setTitle("📜 Rules").setDescription(
   "1. Be respectful\n2. No spam\n3. No harassment\n4. No cheating/scamming\n5. Keep things appropriate\n6. Listen to staff\n7. Don't abuse exploits\n8. Have fun 😭"
  )]}).then(()=>deny(i,"✅ rules sent."));
 }

 if(c==="announce"){
  await i.channel.send({embeds:[new EmbedBuilder().setTitle("📢 Announcement").setDescription(i.options.getString("message")).setTimestamp()]});
  return deny(i,"✅ announcement sent.");
 }

 if(c==="say"){
  await i.channel.send(i.options.getString("message"));return deny(i,"✅ sent.");
 }

 if(c==="addrole"){
  const r=await i.guild.roles.create({name:i.options.getString("name")});
  return i.reply(`✅ created ${r}`);
 }

 if(c==="removerole"){
  const r=i.options.getRole("role");await r.delete();return i.reply(`🗑️ deleted **${r.name}**`);
 }

 if(c==="role"){
  const r=i.options.getRole("role"),x=await i.guild.members.fetch(u.id);
  i.options.getString("action")==="give"?await x.roles.add(r):await x.roles.remove(r);
  return i.reply(`✅ role updated for ${u}`);
 }

 if(c==="nick"){
  const x=await i.guild.members.fetch(u.id);await x.setNickname(i.options.getString("nickname"));
  return i.reply(`✅ nickname changed.`);
 }

 if(c==="kick"||c==="ban"||c==="timeout"||c==="untimeout"){
  const x=await i.guild.members.fetch(u.id).catch(()=>null);
  if(!x)return deny(i,"❌ member not found.");
  if(x.id===i.guild.ownerId||x.roles.highest.position>=m.roles.highest.position)return deny(i,"❌ you can't moderate that member.");
  try{
   if(c==="kick")await x.kick();
   if(c==="ban")await x.ban();
   if(c==="timeout")await x.timeout(i.options.getInteger("minutes")*60000);
   if(c==="untimeout")await x.timeout(null);
   return i.reply(`✅ ${u.tag} ${c==="untimeout"?"is no longer timed out":`${c}ned`}.`);
  }catch{return deny(i,"❌ action failed.")}
 }

 if(c==="unban"){
  try{await i.guild.members.unban(i.options.getString("userid"));return i.reply("✅ unbanned.");}
  catch{return deny(i,"❌ couldn't unban.")}
 }

 if(c==="warn"){
  const x=user(u.id);x.warnings.push({reason:"warning",date:Date.now(),by:i.user.id});save(ECO,economy);
  return i.reply(`⚠️ ${u.tag} was warned.`);
 }

 if(c==="warnings"){
  const x=user(u.id);return i.reply(x.warnings.length?`⚠️ ${u.tag} has **${x.warnings.length}** warning(s).`:`✅ ${u.tag} has no warnings.`);
 }

 if(c==="clear"){
  const n=await i.channel.bulkDelete(i.options.getInteger("amount"),true);
  return deny(i,`🧹 deleted ${n.size} messages.`);
 }

 if(c==="slowmode"){
  await i.channel.setRateLimitPerUser(i.options.getInteger("seconds"));
  return i.reply("🐌 slowmode updated.");
 }

 if(c==="lock"||c==="unlock"){
  await i.channel.permissionOverwrites.edit(i.guild.roles.everyone,{SendMessages:c==="unlock"?null:false});
  return i.reply(c==="lock"?"🔒 channel locked.":"🔓 channel unlocked.");
 }
});

process.on("unhandledRejection",console.error);
process.on("uncaughtException",console.error);
client.login(TOKEN);