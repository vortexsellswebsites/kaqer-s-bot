const{Client,GatewayIntentBits,PermissionsBitField,EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,SlashCommandBuilder,ChannelType,ModalBuilder,TextInputBuilder,TextInputStyle}=require("discord.js");
const fs=require("fs"),path=require("path");

const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages]});
const TOKEN=process.env.TOKEN;
if(!TOKEN)throw new Error("TOKEN is missing.");

const DATA=path.join(__dirname,"data");
fs.mkdirSync(DATA,{recursive:true});
const ecoFile=path.join(DATA,"economy.json"),backupFile=path.join(DATA,"server-backup.json");
if(!fs.existsSync(ecoFile))fs.writeFileSync(ecoFile,"{}");
if(!fs.existsSync(backupFile))fs.writeFileSync(backupFile,"{}");

const read=f=>{try{return JSON.parse(fs.readFileSync(f,"utf8"))}catch{return{}}};
const write=(f,d)=>fs.writeFileSync(f,JSON.stringify(d,null,2));
const money=n=>`$${Number(n||0).toLocaleString()}`;
const userData=(db,id)=>db[id]||=({cash:100,bank:0,lastDaily:0,lastWork:0,warnings:[],pets:[],inventory:[]});
const getRole=(g,n)=>g.roles.cache.find(r=>r.name===n);
const owner=i=>i.member?.permissions?.has(PermissionsBitField.Flags.Administrator)||i.member?.roles?.cache?.some(r=>r.name==="👑 Owner");
const mod=i=>owner(i)||i.member?.roles?.cache?.some(r=>["🛡️ Moderator","🔨 Staff"].includes(r.name));
const staff=i=>owner(i)||i.member?.roles?.cache?.some(r=>["🛡️ Moderator","🔨 Staff"].includes(r.name));
const safeReply=(i,c,e=true)=>i.replied||i.deferred?i.followUp({content:c,ephemeral:e}).catch(()=>{}):i.reply({content:c,ephemeral:e}).catch(()=>{});

const commands=[
["ban","Ban a member",b=>b.addUserOption(o=>o.setName("user").setDescription("member").setRequired(true)).addStringOption(o=>o.setName("reason").setDescription("reason"))],
["unban","Unban a user",b=>b.addStringOption(o=>o.setName("user").setDescription("user ID").setRequired(true))],
["kick","Kick a member",b=>b.addUserOption(o=>o.setName("user").setDescription("member").setRequired(true)).addStringOption(o=>o.setName("reason").setDescription("reason"))],
["timeout","Timeout a member",b=>b.addUserOption(o=>o.setName("user").setDescription("member").setRequired(true)).addIntegerOption(o=>o.setName("minutes").setDescription("minutes").setMinValue(1).setMaxValue(40320).setRequired(true))],
["untimeout","Remove a timeout",b=>b.addUserOption(o=>o.setName("user").setDescription("member").setRequired(true))],
["warn","Warn a member",b=>b.addUserOption(o=>o.setName("user").setDescription("member").setRequired(true)).addStringOption(o=>o.setName("reason").setDescription("reason").setRequired(true))],
["warnings","View warnings",b=>b.addUserOption(o=>o.setName("user").setDescription("member").setRequired(true))],
["clear","Delete messages",b=>b.addIntegerOption(o=>o.setName("amount").setDescription("1-100").setMinValue(1).setMaxValue(100).setRequired(true))],
["slowmode","Set slowmode",b=>b.addIntegerOption(o=>o.setName("seconds").setDescription("0-21600").setMinValue(0).setMaxValue(21600).setRequired(true))],
["lock","Lock this channel"],
["unlock","Unlock this channel"],
["ping","Check bot latency"],
["userinfo","Show user info",b=>b.addUserOption(o=>o.setName("user").setDescription("user"))],
["serverinfo","Show server info"],
["avatar","Show an avatar",b=>b.addUserOption(o=>o.setName("user").setDescription("user"))],
["botinfo","Show bot info"],
["8ball","Ask the magic 8ball",b=>b.addStringOption(o=>o.setName("question").setDescription("question").setRequired(true))],
["coinflip","Flip a coin"],
["dice","Roll a dice"],
["roll","Roll a custom dice",b=>b.addIntegerOption(o=>o.setName("sides").setDescription("number of sides").setMinValue(2).setMaxValue(1000).setRequired(true))],
["choose","Choose between options",b=>b.addStringOption(o=>o.setName("options").setDescription("separate with commas").setRequired(true))],
["rps","Play rock paper scissors",b=>b.addStringOption(o=>o.setName("choice").setDescription("choice").setRequired(true).addChoices({name:"rock",value:"rock"},{name:"paper",value:"paper"},{name:"scissors",value:"scissors"}))],
["ship","Ship two users",b=>b.addUserOption(o=>o.setName("user1").setDescription("first").setRequired(true)).addUserOption(o=>o.setName("user2").setDescription("second").setRequired(true))],
["balance","Check balance",b=>b.addUserOption(o=>o.setName("user").setDescription("user"))],
["daily","Claim daily cash"],
["work","Work for cash"],
["pay","Pay a user",b=>b.addUserOption(o=>o.setName("user").setDescription("user").setRequired(true)).addIntegerOption(o=>o.setName("amount").setDescription("amount").setMinValue(1).setRequired(true))],
["hunt","Hunt for an animal"],
["leaderboard","Cash leaderboard"],
["deposit","Deposit cash",b=>b.addIntegerOption(o=>o.setName("amount").setDescription("amount").setMinValue(1).setRequired(true))],
["withdraw","Withdraw bank cash",b=>b.addIntegerOption(o=>o.setName("amount").setDescription("amount").setMinValue(1).setRequired(true))],
["slots","Play slots",b=>b.addIntegerOption(o=>o.setName("bet").setDescription("bet").setMinValue(1).setRequired(true))],
["gamble","Gamble cash",b=>b.addIntegerOption(o=>o.setName("amount").setDescription("amount").setMinValue(1).setRequired(true))],
["dicebet","Bet on a dice roll",b=>b.addIntegerOption(o=>o.setName("amount").setDescription("bet").setMinValue(1).setRequired(true))],
["pets","View your pets"],
["pet","View your active pet"],
["feed","Feed your pet"],
["play","Play with your pet"],
["inventory","View inventory"],
["shop","View shop"],
["verify-panel","Send verification panel"],
["ticket-panel","Send ticket panel"],
["mod-panel","Send moderator application panel"],
["rules","Send rules"],
["announce","Send announcement",b=>b.addStringOption(o=>o.setName("message").setDescription("announcement").setRequired(true))],
["say","Make bot say something",b=>b.addStringOption(o=>o.setName("message").setDescription("message").setRequired(true))],
["addrole","Add a role",b=>b.addUserOption(o=>o.setName("user").setDescription("member").setRequired(true)).addRoleOption(o=>o.setName("role").setDescription("role").setRequired(true))],
["removerole","Remove a role",b=>b.addUserOption(o=>o.setName("user").setDescription("member").setRequired(true)).addRoleOption(o=>o.setName("role").setDescription("role").setRequired(true))],
["role","Manage a role",b=>b.addUserOption(o=>o.setName("user").setDescription("member").setRequired(true)).addRoleOption(o=>o.setName("role").setDescription("role").setRequired(true)).addStringOption(o=>o.setName("action").setDescription("add/remove").setRequired(true).addChoices({name:"add",value:"add"},{name:"remove",value:"remove"}))],
["nick","Change nickname",b=>b.addUserOption(o=>o.setName("user").setDescription("member").setRequired(true)).addStringOption(o=>o.setName("nickname").setDescription("nickname").setRequired(true))],
["save-backup","Save server backup"],
["backup","Restore server backup"]
].map(x=>{let b=new SlashCommandBuilder().setName(x[0]).setDescription(x[1]);return(x[2]?x[2](b):b).toJSON()});

const animals=[["🐱","Cat",.45,100],["🐶","Dog",.25,150],["🐰","Rabbit",.15,200],["🦊","Fox",.08,350],["🐺","Wolf",.045,600],["🐉","Dragon",.02,1500],["🦄","Unicorn",.01,3000]];
const pickAnimal=()=>{let r=Math.random(),s=0;for(const a of animals){s+=a[2];if(r<=s)return a}return animals[0]};

client.once("clientReady",async()=>{
 console.log(`✅ Logged in as ${client.user.tag}`);
 try{await client.application.commands.set(commands);console.log(`✅ Registered ${commands.length} commands`)}catch(e){console.error("Command registration:",e)}
});

client.on("guildMemberAdd",async m=>{
 const r=getRole(m.guild,"Member");
 if(r)await m.roles.add(r).catch(()=>{});
 if(m.guild.systemChannel)m.guild.systemChannel.send(`👋 Welcome ${m} to **${m.guild.name}**!`).catch(()=>{});
});

client.on("messageCreate",async m=>{
 if(m.author.bot||!m.guild)return;
 if(m.channel.name==="🍯・honeypot-security"&&!staff(m)){
  await m.delete().catch(()=>{});
  await m.member.ban({reason:"Honeypot security channel"}).catch(()=>{});
 }
});

client.on("interactionCreate",async i=>{
 try{
  if(i.isButton()){
   if(i.customId==="verify"){
    await i.deferReply({ephemeral:true});
    const r=getRole(i.guild,"Verified");
    if(!r)return i.editReply("❌ The `Verified` role doesn't exist.");
    if(r.position>=i.guild.members.me.roles.highest.position)return i.editReply("❌ Move the Verified role below the bot's highest role.");
    await i.member.roles.add(r);
    return i.editReply("✅ You're verified!");
   }

   if(i.customId==="create_ticket"){
    await i.deferReply({ephemeral:true});
    const ch=await i.guild.channels.create({
     name:`ticket-${i.user.username}`.toLowerCase().slice(0,90),
     type:ChannelType.GuildText,
     permissionOverwrites:[
      {id:i.guild.roles.everyone.id,deny:[PermissionsBitField.Flags.ViewChannel]},
      {id:i.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages,PermissionsBitField.Flags.ReadMessageHistory]}
     ]
    });
    const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("close_ticket").setLabel("Close Ticket").setStyle(ButtonStyle.Danger));
    await ch.send({content:`🎫 ${i.user}, staff will help you soon.`,components:[row]});
    return i.editReply(`✅ Ticket created: ${ch}`);
   }

   if(i.customId==="close_ticket"){
    await i.deferReply({ephemeral:true});
    await i.editReply("🔒 Closing ticket...");
    setTimeout(()=>i.channel.delete().catch(()=>{}),1000);
    return;
   }

   if(i.customId==="moderator_apply"){
    const modal=new ModalBuilder().setCustomId("moderator_application").setTitle("Moderator Application");
    modal.addComponents(
     new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("age").setLabel("Age").setStyle(TextInputStyle.Short).setRequired(true)),
     new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("why").setLabel("Why should we choose you?").setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
    return i.showModal(modal);
   }

   if(i.customId.startsWith("application_")){
    if(!staff(i))return safeReply(i,"❌ Staff only.");
    await i.deferReply({ephemeral:true});
    const p=i.customId.split("_"),action=p[1],id=p[2];
    const m=await i.guild.members.fetch(id).catch(()=>null);
    if(!m)return i.editReply("❌ Member not found.");
    return i.editReply(`✅ Application ${action}ed for ${m.user.tag}.`);
   }
  }

  if(i.isModalSubmit()&&i.customId==="moderator_application"){
   await i.deferReply({ephemeral:true});
   const ch=i.guild.channels.cache.find(c=>c.name.includes("staff")&&c.isTextBased());
   if(ch){
    const row=new ActionRowBuilder().addComponents(
     new ButtonBuilder().setCustomId(`application_accept_${i.user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
     new ButtonBuilder().setCustomId(`application_deny_${i.user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
    );
    await ch.send({
     content:`📋 **Moderator Application**\nApplicant: ${i.user}\nAge: ${i.fields.getTextInputValue("age")}\nWhy: ${i.fields.getTextInputValue("why")}`,
     components:[row]
    }).catch(()=>{});
   }
   return i.editReply("✅ Application submitted.");
  }

  if(!i.isChatInputCommand())return;

  await i.deferReply({ephemeral:true});
  const c=i.commandName;

  if(["ban","unban"].includes(c)&&!owner(i))return i.editReply("❌ Owner only.");
  if(["kick","timeout","untimeout","warn","warnings","clear","slowmode","lock","unlock"].includes(c)&&!mod(i))return i.editReply("❌ Moderator/Staff only.");
  if(["addrole","removerole","role","nick","save-backup","backup"].includes(c)&&!owner(i))return i.editReply("❌ Owner only.");
  if(["verify-panel","ticket-panel","mod-panel","rules","announce","say"].includes(c)&&!staff(i))return i.editReply("❌ Staff only.");

  if(c==="ban"){
   const m=await i.guild.members.fetch(i.options.getUser("user").id).catch(()=>null);
   if(!m)return i.editReply("❌ Member not found.");
   await m.ban({reason:i.options.getString("reason")||"No reason"});
   return i.editReply("🔨 Banned.");
  }

  if(c==="unban"){
   await i.guild.members.unban(i.options.getString("user"));
   return i.editReply("✅ Unbanned.");
  }

  if(c==="kick"){
   const m=await i.guild.members.fetch(i.options.getUser("user").id).catch(()=>null);
   if(!m)return i.editReply("❌ Member not found.");
   await m.kick(i.options.getString("reason")||"No reason");
   return i.editReply("👢 Kicked.");
  }

  if(c==="timeout"){
   const m=await i.guild.members.fetch(i.options.getUser("user").id).catch(()=>null);
   if(!m)return i.editReply("❌ Member not found.");
   await m.timeout(i.options.getInteger("minutes")*60000,"Moderator timeout");
   return i.editReply("⏱️ Timed out.");
  }

  if(c==="untimeout"){
   const m=await i.guild.members.fetch(i.options.getUser("user").id).catch(()=>null);
   if(!m)return i.editReply("❌ Member not found.");
   await m.timeout(null,"Timeout removed");
   return i.editReply("✅ Timeout removed.");
  }

  if(c==="warn"){
   const db=read(ecoFile),u=i.options.getUser("user"),d=userData(db,u.id);
   d.warnings.push({reason:i.options.getString("reason"),by:i.user.id,at:Date.now()});
   write(ecoFile,db);
   return i.editReply(`⚠️ Warned ${u.tag}.`);
  }

  if(c==="warnings"){
   const db=read(ecoFile),u=i.options.getUser("user"),d=userData(db,u.id);
   return i.editReply(d.warnings.length?d.warnings.map((w,n)=>`${n+1}. ${w.reason}`).join("\n"):"✅ No warnings.");
  }

  if(c==="clear"){
   const n=i.options.getInteger("amount");
   await i.channel.bulkDelete(n,true);
   return i.editReply(`🧹 Deleted ${n} messages.`);
  }

  if(c==="slowmode"){
   await i.channel.setRateLimitPerUser(i.options.getInteger("seconds"));
   return i.editReply("🐢 Slowmode updated.");
  }

  if(c==="lock"){
   await i.channel.permissionOverwrites.edit(i.guild.roles.everyone,{SendMessages:false});
   return i.editReply("🔒 Channel locked.");
  }

  if(c==="unlock"){
   await i.channel.permissionOverwrites.edit(i.guild.roles.everyone,{SendMessages:null});
   return i.editReply("🔓 Channel unlocked.");
  }

  if(c==="addrole"||c==="removerole"){
   const m=await i.guild.members.fetch(i.options.getUser("user").id),r=i.options.getRole("role");
   c==="addrole"?await m.roles.add(r):await m.roles.remove(r);
   return i.editReply("✅ Done.");
  }

  if(c==="role"){
   const m=await i.guild.members.fetch(i.options.getUser("user").id),r=i.options.getRole("role"),a=i.options.getString("action");
   a==="add"?await m.roles.add(r):await m.roles.remove(r);
   return i.editReply("✅ Done.");
  }

  if(c==="nick"){
   const m=await i.guild.members.fetch(i.options.getUser("user").id);
   await m.setNickname(i.options.getString("nickname"));
   return i.editReply("✅ Nickname changed.");
  }

  if(c==="save-backup"){
   const backup={
    roles:i.guild.roles.cache.filter(r=>r.id!==i.guild.id).map(r=>({name:r.name,color:r.hexColor,hoist:r.hoist,mentionable:r.mentionable,permissions:r.permissions.bitfield.toString()})),
    channels:i.guild.channels.cache.map(ch=>({name:ch.name,type:ch.type,parent:ch.parent?.name||null}))
   };
   write(backupFile,backup);
   return i.editReply("💾 Backup saved.");
  }

  if(c==="backup"){
   const b=read(backupFile);
   if(!b.channels)return i.editReply("❌ No backup found.");
   for(const r of b.roles||[])if(!getRole(i.guild,r.name))await i.guild.roles.create({name:r.name,color:r.color,hoist:r.hoist,mentionable:r.mentionable,permissions:BigInt(r.permissions||0)}).catch(()=>{});
   return i.editReply("♻️ Backup restored.");
  }

  if(c==="ping")return i.editReply(`🏓 ${client.ws.ping}ms`);

  if(c==="userinfo"){
   const u=i.options.getUser("user")||i.user;
   return i.editReply({embeds:[new EmbedBuilder().setTitle(u.tag).setThumbnail(u.displayAvatarURL()).addFields({name:"ID",value:u.id},{name:"Created",value:`<t:${Math.floor(u.createdTimestamp/1000)}:R>`})]});
  }

  if(c==="serverinfo")return i.editReply({embeds:[new EmbedBuilder().setTitle(i.guild.name).addFields({name:"Members",value:String(i.guild.memberCount)},{name:"Channels",value:String(i.guild.channels.cache.size)},{name:"Roles",value:String(i.guild.roles.cache.size)})]});

  if(c==="avatar"){
   const u=i.options.getUser("user")||i.user;
   return i.editReply(u.displayAvatarURL({size:1024}));
  }

  if(c==="botinfo")return i.editReply(`🤖 ${client.user.tag}\nServers: ${client.guilds.cache.size}`);

  if(c==="8ball"){
   const a=["Yes.","No.","Maybe.","Definitely.","Probably not.","Ask again later.","Absolutely.","I don't know."];
   return i.editReply(`🎱 ${a[Math.floor(Math.random()*a.length)]}`);
  }

  if(c==="coinflip")return i.editReply(`🪙 ${Math.random()<.5?"Heads":"Tails"}!`);
  if(c==="dice")return i.editReply(`🎲 ${1+Math.floor(Math.random()*6)}`);

  if(c==="roll"){
   const s=i.options.getInteger("sides");
   return i.editReply(`🎲 ${1+Math.floor(Math.random()*s)}`);
  }

  if(c==="choose"){
   const o=i.options.getString("options").split(",").map(x=>x.trim()).filter(Boolean);
   return i.editReply(`🎯 ${o[Math.floor(Math.random()*o.length)]||"Nothing"}`);
  }

  if(c==="rps"){
   const choices=["rock","paper","scissors"],u=i.options.getString("choice"),b=choices[Math.floor(Math.random()*3)];
   let result=u===b?"Tie!":(u==="rock"&&b==="scissors")||(u==="paper"&&b==="rock")||(u==="scissors"&&b==="paper")?"You win!":"I win!";
   return i.editReply(`✊ You: **${u}**\n🤖 Me: **${b}**\n${result}`);
  }

  if(c==="ship"){
   const u1=i.options.getUser("user1"),u2=i.options.getUser("user2");
   return i.editReply(`💘 ${u1.username} + ${u2.username} = **${Math.floor(Math.random()*101)}%**`);
  }

  const db=read(ecoFile);
  const eco=["balance","daily","work","pay","hunt","leaderboard","deposit","withdraw","slots","gamble","dicebet","pets","pet","feed","play","inventory","shop"];

  if(eco.includes(c)){
   const d=userData(db,i.user.id);

   if(c==="balance"){
    const u=i.options.getUser("user")||i.user,t=userData(db,u.id);
    return i.editReply(`💰 **${u.username}**\nCash: ${money(t.cash)}\nBank: ${money(t.bank)}`);
   }

   if(c==="daily"){
    if(Date.now()-d.lastDaily<86400000)return i.editReply("⏳ Daily is on cooldown.");
    d.cash+=500;d.lastDaily=Date.now();write(ecoFile,db);
    return i.editReply("💵 You got $500!");
   }

   if(c==="work"){
    if(Date.now()-d.lastWork<3600000)return i.editReply("⏳ Work is on cooldown.");
    const n=100+Math.floor(Math.random()*401);
    d.cash+=n;d.lastWork=Date.now();write(ecoFile,db);
    return i.editReply(`💼 You earned ${money(n)}!`);
   }

   if(c==="pay"){
    const u=i.options.getUser("user"),n=i.options.getInteger("amount");
    if(u.id===i.user.id||d.cash<n)return i.editReply("❌ Not enough cash.");
    d.cash-=n;userData(db,u.id).cash+=n;write(ecoFile,db);
    return i.editReply(`💸 Paid ${money(n)} to ${u}.`);
   }

   if(c==="hunt"){
    const a=pickAnimal();
    d.cash+=a[3];d.pets.push({name:a[1],emoji:a[0],value:a[3]});write(ecoFile,db);
    return i.editReply(`${a[0]} **You caught a ${a[1]}!** +${money(a[3])}`);
   }

   if(c==="leaderboard"){
    const list=Object.entries(db).sort((a,b)=>(b[1].cash+b[1].bank)-(a[1].cash+a[1].bank)).slice(0,10);
    return i.editReply(list.length?list.map((v,n)=>`**${n+1}.** <@${v[0]}> — ${money(v[1].cash+v[1].bank)}`).join("\n"):"No data.");
   }

   if(c==="deposit"){
    const n=i.options.getInteger("amount");
    if(d.cash<n)return i.editReply("❌ Not enough cash.");
    d.cash-=n;d.bank+=n;write(ecoFile,db);
    return i.editReply(`🏦 Deposited ${money(n)}.`);
   }

   if(c==="withdraw"){
    const n=i.options.getInteger("amount");
    if(d.bank<n)return i.editReply("❌ Not enough bank cash.");
    d.bank-=n;d.cash+=n;write(ecoFile,db);
    return i.editReply(`🏦 Withdrew ${money(n)}.`);
   }

   if(["slots","gamble","dicebet"].includes(c)){
    const n=i.options.getInteger(c==="slots"?"bet":"amount");
    if(d.cash<n)return i.editReply("❌ Not enough cash.");
    const win=Math.random()<.45,mult=c==="slots"&&Math.random()<.2?5:2;
    d.cash+=win?n*(mult-1):-n;write(ecoFile,db);
    return i.editReply(win?`🎰 You won ${money(n*mult)}!`:`💀 You lost ${money(n)}.`);
   }

   if(c==="pets")return i.editReply(d.pets.length?d.pets.map((p,n)=>`${n+1}. ${p.emoji} ${p.name}`).join("\n"):"🐾 You have no pets. Use `/hunt`!");
   if(c==="pet")return i.editReply(d.pets[0]?`${d.pets[0].emoji} Your pet is **${d.pets[0].name}**.`:"🐾 No pet yet.");
   if(c==="feed")return i.editReply(d.pets[0]?`🍖 You fed ${d.pets[0].name}!`:"🐾 Get a pet with `/hunt`.");
   if(c==="play")return i.editReply(d.pets[0]?`🎾 You played with ${d.pets[0].name}!`:"🐾 Get a pet with `/hunt`.");
   if(c==="inventory")return i.editReply(d.inventory.length?d.inventory.join("\n"):"🎒 Inventory is empty.");
   if(c==="shop")return i.editReply("🛒 **Shop**\n🍎 Apple — $50\n🧸 Toy — $100\n🍖 Pet Food — $75");
  }

  if(c==="verify-panel"){
   const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("verify").setLabel("Verify").setStyle(ButtonStyle.Success));
   await i.channel.send({content:"✅ **Verification**\nClick below to verify.",components:[row]});
   return i.editReply("✅ Panel sent.");
  }

  if(c==="ticket-panel"){
   const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("create_ticket").setLabel("Create Ticket").setStyle(ButtonStyle.Primary));
   await i.channel.send({content:"🎫 **Support Tickets**\nClick below to open a ticket.",components:[row]});
   return i.editReply("✅ Panel sent.");
  }

  if(c==="mod-panel"){
   const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("moderator_apply").setLabel("Apply").setStyle(ButtonStyle.Primary));
   await i.channel.send({content:"🛡️ **Moderator Applications**\nClick below to apply.",components:[row]});
   return i.editReply("✅ Panel sent.");
  }

  if(c==="rules")return i.editReply("📜 **SERVER RULES**\n1. Respect everyone.\n2. No spam.\n3. No harassment.\n4. No advertising.\n5. Follow Discord's Terms of Service.\n6. Listen to staff.");

  if(c==="announce"){
   await i.channel.send({embeds:[new EmbedBuilder().setTitle("📢 Announcement").setDescription(i.options.getString("message"))]});
   return i.editReply("✅ Sent.");
  }

  if(c==="say"){
   await i.channel.send(i.options.getString("message"));
   return i.editReply("✅ Sent.");
  }

  return i.editReply("❌ Unknown command.");
 }catch(e){
  console.error(e);
  return safeReply(i,"❌ Something went wrong. Check your Railway logs.");
 }
});

process.on("unhandledRejection",console.error);
process.on("uncaughtException",console.error);
client.login(TOKEN);