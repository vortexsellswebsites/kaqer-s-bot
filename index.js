const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  SlashCommandBuilder,
  ChannelType
}=require("discord.js");

const fs=require("fs"),path=require("path");

const client=new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN=process.env.TOKEN;
if(!TOKEN)throw new Error("TOKEN is missing.");

const DATA=path.join(__dirname,"data");
fs.mkdirSync(DATA,{recursive:true});

const backupFile=path.join(DATA,"server-backup.json");
if(!fs.existsSync(backupFile))fs.writeFileSync(backupFile,"{}");

const read=f=>{
  try{return JSON.parse(fs.readFileSync(f,"utf8"))}
  catch{return{}}
};
const write=(f,d)=>fs.writeFileSync(f,JSON.stringify(d,null,2));

const isOwner=i=>
  i.member?.permissions?.has(PermissionsBitField.Flags.Administrator)||
  i.member?.roles?.cache?.some(r=>r.name==="👑 Owner");

const isStaff=i=>
  isOwner(i)||
  i.member?.roles?.cache?.some(r=>
    ["🛡️ Moderator","🔨 Staff"].includes(r.name)
  );

const isMod=i=>
  isOwner(i)||
  i.member?.roles?.cache?.some(r=>
    ["🛡️ Moderator","🔨 Staff"].includes(r.name)
  );

const commands=[
  ["ban","Ban a member",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason"))],

  ["unban","Unban a user",b=>b
    .addStringOption(o=>o.setName("user").setDescription("User ID").setRequired(true))],

  ["kick","Kick a member",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason"))],

  ["timeout","Timeout a member",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addIntegerOption(o=>o.setName("minutes").setDescription("Minutes").setMinValue(1).setMaxValue(40320).setRequired(true))],

  ["untimeout","Remove a timeout",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))],

  ["warn","Warn a member",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason").setRequired(true))],

  ["warnings","View warnings",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))],

  ["clear","Delete messages",b=>b
    .addIntegerOption(o=>o.setName("amount").setDescription("1-100").setMinValue(1).setMaxValue(100).setRequired(true))],

  ["slowmode","Set slowmode",b=>b
    .addIntegerOption(o=>o.setName("seconds").setDescription("0-21600").setMinValue(0).setMaxValue(21600).setRequired(true))],

  ["lock","Lock this channel"],
  ["unlock","Unlock this channel"],

  ["ping","Check bot latency"],

  ["userinfo","Show user information",b=>b
    .addUserOption(o=>o.setName("user").setDescription("User"))],

  ["serverinfo","Show server information"],

  ["avatar","Show a user's avatar",b=>b
    .addUserOption(o=>o.setName("user").setDescription("User"))],

  ["botinfo","Show bot information"],

  ["announce","Send an announcement",b=>b
    .addStringOption(o=>o.setName("message").setDescription("Announcement").setRequired(true))],

  ["addrole","Add a role",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true))],

  ["removerole","Remove a role",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true))],

  ["role","Manage a role",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true))
    .addStringOption(o=>o.setName("action").setDescription("Action").setRequired(true)
      .addChoices(
        {name:"Add",value:"add"},
        {name:"Remove",value:"remove"}
      ))],

  ["save-backup","Save a server backup"],
  ["backup","Restore server backup"],

  ["lockdown","Lock down the server"],
  ["unlockdown","Remove server lockdown"],

  ["setwelcome","Set the welcome channel",b=>b
    .addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(true))],

  ["setgoodbye","Set the goodbye channel",b=>b
    .addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(true))],

  ["setlogs","Set the logs channel",b=>b
    .addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(true))],

  ["setmodlog","Set the moderation log channel",b=>b
    .addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(true))],

  ["setverification","Set the verification channel",b=>b
    .addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(true))],

  ["servericon","Change the server icon",b=>b
    .addStringOption(o=>o.setName("url").setDescription("Image URL").setRequired(true))],

  ["serverbanner","Change the server banner",b=>b
    .addStringOption(o=>o.setName("url").setDescription("Image URL").setRequired(true))],

  ["channelinfo","Show channel information",b=>b
    .addChannelOption(o=>o.setName("channel").setDescription("Channel"))],

  ["roleinfo","Show role information",b=>b
    .addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true))]
].map(x=>{
  let b=new SlashCommandBuilder()
    .setName(x[0])
    .setDescription(x[1]);
  return(x[2]?x[2](b):b).toJSON();
});

client.once("clientReady",async()=>{
  console.log(`✅ Logged in as ${client.user.tag}`);
  try{
    await client.application.commands.set(commands);
    console.log(`✅ Registered ${commands.length} commands`);
  }catch(e){
    console.error("❌ Command registration error:",e);
  }
});

client.on("guildMemberAdd",async member=>{
  const channel=member.guild.systemChannel;
  if(channel)
    channel.send(`👋 Welcome ${member} to **${member.guild.name}**!`).catch(()=>{});
});

client.on("guildMemberRemove",async member=>{
  const channel=member.guild.systemChannel;
  if(channel)
    channel.send(`👋 **${member.user?.tag||"A member"}** has left the server.`).catch(()=>{});
});

client.on("interactionCreate",async i=>{
  try{
    if(!i.isChatInputCommand())return;

    await i.deferReply({ephemeral:true});

    const c=i.commandName;

    const ownerOnly=[
      "ban","unban","addrole","removerole","role",
      "save-backup","backup","lockdown","unlockdown",
      "setwelcome","setgoodbye","setlogs","setmodlog",
      "setverification","servericon","serverbanner"
    ];

    const staffOnly=[
      "kick","timeout","untimeout","warn","warnings",
      "clear","slowmode","lock","unlock","announce",
      "channelinfo","roleinfo"
    ];

    if(ownerOnly.includes(c)&&!isOwner(i))
      return i.editReply("❌ Owner only.");

    if(staffOnly.includes(c)&&!isMod(i))
      return i.editReply("❌ Moderator/Staff only.");

    if(c==="ban"){
      const u=i.options.getUser("user");
      const m=await i.guild.members.fetch(u.id).catch(()=>null);
      if(!m)return i.editReply("❌ Member not found.");
      await m.ban({reason:i.options.getString("reason")||"No reason"});
      return i.editReply(`🔨 Banned **${u.tag}**.`);
    }

    if(c==="unban"){
      await i.guild.members.unban(i.options.getString("user"));
      return i.editReply("✅ User unbanned.");
    }

    if(c==="kick"){
      const u=i.options.getUser("user");
      const m=await i.guild.members.fetch(u.id).catch(()=>null);
      if(!m)return i.editReply("❌ Member not found.");
      await m.kick(i.options.getString("reason")||"No reason");
      return i.editReply(`👢 Kicked **${u.tag}**.`);
    }

    if(c==="timeout"){
      const u=i.options.getUser("user");
      const m=await i.guild.members.fetch(u.id).catch(()=>null);
      if(!m)return i.editReply("❌ Member not found.");
      await m.timeout(
        i.options.getInteger("minutes")*60000,
        "Moderator timeout"
      );
      return i.editReply(`⏱️ Timed out **${u.tag}**.`);
    }

    if(c==="untimeout"){
      const u=i.options.getUser("user");
      const m=await i.guild.members.fetch(u.id).catch(()=>null);
      if(!m)return i.editReply("❌ Member not found.");
      await m.timeout(null,"Timeout removed");
      return i.editReply(`✅ Timeout removed from **${u.tag}**.`);
    }

    if(c==="warn"){
      const u=i.options.getUser("user");
      return i.editReply(`⚠️ **${u.tag}** was warned.\nReason: ${i.options.getString("reason")}`);
    }

    if(c==="warnings")
      return i.editReply(`⚠️ **${i.options.getUser("user").tag}** has no recorded warnings.`);

    if(c==="clear"){
      const n=i.options.getInteger("amount");
      await i.channel.bulkDelete(n,true);
      return i.editReply(`🧹 Deleted **${n}** messages.`);
    }

    if(c==="slowmode"){
      await i.channel.setRateLimitPerUser(i.options.getInteger("seconds"));
      return i.editReply("🐢 Slowmode updated.");
    }

    if(c==="lock"){
      await i.channel.permissionOverwrites.edit(
        i.guild.roles.everyone,
        {SendMessages:false}
      );
      return i.editReply("🔒 Channel locked.");
    }

    if(c==="unlock"){
      await i.channel.permissionOverwrites.edit(
        i.guild.roles.everyone,
        {SendMessages:null}
      );
      return i.editReply("🔓 Channel unlocked.");
    }

    if(c==="ping")
      return i.editReply(`🏓 **${client.ws.ping}ms**`);

    if(c==="userinfo"){
      const u=i.options.getUser("user")||i.user;
      return i.editReply({
        embeds:[new EmbedBuilder()
          .setTitle(u.tag)
          .setThumbnail(u.displayAvatarURL())
          .addFields(
            {name:"ID",value:u.id},
            {name:"Account Created",value:`<t:${Math.floor(u.createdTimestamp/1000)}:R>`}
          )]
      });
    }

    if(c==="serverinfo"){
      return i.editReply({
        embeds:[new EmbedBuilder()
          .setTitle(i.guild.name)
          .addFields(
            {name:"Members",value:String(i.guild.memberCount)},
            {name:"Channels",value:String(i.guild.channels.cache.size)},
            {name:"Roles",value:String(i.guild.roles.cache.size)}
          )]
      });
    }

    if(c==="avatar"){
      const u=i.options.getUser("user")||i.user;
      return i.editReply(u.displayAvatarURL({size:1024}));
    }

    if(c==="botinfo")
      return i.editReply(
        `🤖 **${client.user.tag}**\nServers: ${client.guilds.cache.size}`
      );

    if(c==="announce"){
      await i.channel.send({
        embeds:[new EmbedBuilder()
          .setTitle("📢 Announcement")
          .setDescription(i.options.getString("message"))
          .setTimestamp()]
      });
      return i.editReply("✅ Announcement sent.");
    }

    if(c==="addrole"||c==="removerole"){
      const m=await i.guild.members.fetch(i.options.getUser("user").id);
      const r=i.options.getRole("role");

      if(c==="addrole")await m.roles.add(r);
      else await m.roles.remove(r);

      return i.editReply("✅ Done.");
    }

    if(c==="role"){
      const m=await i.guild.members.fetch(i.options.getUser("user").id);
      const r=i.options.getRole("role");
      const action=i.options.getString("action");

      if(action==="add")await m.roles.add(r);
      else await m.roles.remove(r);

      return i.editReply("✅ Done.");
    }

    if(c==="save-backup"){
      const backup={
        roles:i.guild.roles.cache
          .filter(r=>r.id!==i.guild.id)
          .map(r=>({
            name:r.name,
            color:r.hexColor,
            hoist:r.hoist,
            mentionable:r.mentionable
          })),
        channels:i.guild.channels.cache.map(ch=>({
          name:ch.name,
          type:ch.type,
          parent:ch.parent?.name||null
        }))
      };

      write(backupFile,backup);
      return i.editReply("💾 Server backup saved.");
    }

    if(c==="backup"){
      const b=read(backupFile);

      if(!b.roles&&!b.channels)
        return i.editReply("❌ No backup found.");

      for(const r of b.roles||[]){
        if(!i.guild.roles.cache.some(x=>x.name===r.name)){
          await i.guild.roles.create({
            name:r.name,
            color:r.color,
            hoist:r.hoist,
            mentionable:r.mentionable
          }).catch(()=>{});
        }
      }

      return i.editReply("♻️ Backup restored.");
    }

    if(c==="lockdown"){
      for(const ch of i.guild.channels.cache.values()){
        if(ch.isTextBased()){
          await ch.permissionOverwrites.edit(
            i.guild.roles.everyone,
            {SendMessages:false}
          ).catch(()=>{});
        }
      }
      return i.editReply("🚨 Server lockdown enabled.");
    }

    if(c==="unlockdown"){
      for(const ch of i.guild.channels.cache.values()){
        if(ch.isTextBased()){
          await ch.permissionOverwrites.edit(
            i.guild.roles.everyone,
            {SendMessages:null}
          ).catch(()=>{});
        }
      }
      return i.editReply("🔓 Server lockdown removed.");
    }

    if(["setwelcome","setgoodbye","setlogs","setmodlog","setverification"].includes(c)){
      return i.editReply(
        `✅ **${c}** channel set to ${i.options.getChannel("channel")}.`
      );
    }

    if(c==="servericon"){
      await i.guild.setIcon(i.options.getString("url"));
      return i.editReply("🖼️ Server icon updated.");
    }

    if(c==="serverbanner"){
      await i.guild.setBanner(i.options.getString("url"));
      return i.editReply("🖼️ Server banner updated.");
    }

    if(c==="channelinfo"){
      const ch=i.options.getChannel("channel")||i.channel;
      return i.editReply(
        `📺 **${ch.name}**\nID: ${ch.id}\nType: ${ch.type}`
      );
    }

    if(c==="roleinfo"){
      const r=i.options.getRole("role");
      return i.editReply(
        `🎭 **${r.name}**\nID: ${r.id}\nMembers: ${r.members.size}\nPosition: ${r.position}`
      );
    }

    return i.editReply("❌ Unknown command.");

  }catch(e){
    console.error("Interaction error:",e);

    if(i.deferred||i.replied)
      return i.editReply("❌ Something went wrong. Check Railway logs.").catch(()=>{});

    return i.reply({
      content:"❌ Something went wrong.",
      ephemeral:true
    }).catch(()=>{});
  }
});

process.on("unhandledRejection",console.error);
process.on("uncaughtException",console.error);

client.login(TOKEN);