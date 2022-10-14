require('dotenv').config()

const { Client: TClient, auth } = require("twitter-api-sdk");
const mongoose = require('mongoose');
const axios = require('axios');
const open = require('open');


//const {token, clientId, guildId, bearer_token, cid, oauth_cid} = require("./config.json")
const { Client, GatewayIntentBits, REST, SlashCommandBuilder, Collection, Routes, PermissionFlagsBits, 
    ChannelType, GuildTextBasedChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const User = require("./models/user");

const STATE = "my-state";
const dbURI = process.env.dbURI;
const PORT = process.env.PORT || 3000 ;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST({ version: '10' }).setToken(process.env.token);

const authClient = new auth.OAuth2User({
    client_id: process.env.cid,
    client_secret: process.env.oauth_cid,
    callback: "https://discordtwitterbotz.herokuapp.com/",
    scopes: ["tweet.read", "users.read", "offline.access"],
  });
const twitter_client = new TClient(authClient);

function getHours(atime){
    const date1 = new Date(atime);
    const now = Date.now();
    const deltatimeS = now - date1.getTime();
    const secs = (deltatimeS/3600000)
    return secs;
}


function whitelisted(hours){
    return hours >= 24;
}

async function whitelist(interaction){
    const verifiedRole = interaction.guild.roles.cache.get("1026904133011251331");
    if(verifiedRole){
        const member = interaction.member;
        await member.roles.add(verifiedRole)
        .then((msg) => interaction.reply({
            content: "You are now verified!",
            ephemeral: true
        }))
        .catch((err) => {
         //   console.log(err)
            interaction.reply({
                content: "Something went wrong!",
                ephemeral: true
            })
        })
}
}


async function fetchTweetById(interaction, twitter) {
    //console.log(`Request initiated by ${interaction.member.user.tag}`)
   // const someUser = await User.find({user: interaction.member.user.tag}).exec();
    //console.log(someUser)

    if (authClient.isAccessTokenExpired()){
        console.log("Adding new user")
        const aUser = new User({
            user:interaction.member.user.id,
            whitelisted: false,
            token: null,
            twitter: twitter,
        });
        await aUser.save()
        .then(async() => {
            const url = await authClient.generateAuthURL({
                state: STATE,
                code_challenge_method: "s256"
            })
    
            client.channels.fetch('1026904667730477076').then(async(channel) => {
                //console.log(channel)
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                        .setDescription(`Please verify here ${url}`)
                        .setColor("Aqua")
                        .setTitle(`Approve on twitter`)
                    ],
                    components: [
                        new ActionRowBuilder().setComponents(
                            new ButtonBuilder()
                            .setCustomId("verifyTwitter")
                            .setLabel("OauthTwitter")
                            .setStyle(ButtonStyle.Primary)
                        )
                    ],
                    ephemeral: true
                 })})
        })
        .catch(err => console.log(err))
    } else {
        try{
            const user = await twitter_client.users.findMyUser();
            const pinnedTweetId = user.data.pinned_tweet_id;
            const pinnedTweet = await twitter_client.tweets.findTweetById("1578699938049200128", {
                "tweet.fields": "created_at"
            })

            if (pinnedTweet.data != null || pinnedTweet.data != undefined){
                const isPinned = whitelisted(getHours(pinnedTweet.data.created_at));
                if(isPinned){
                    const verifiedRole = interaction.guild.roles.cache.get("1026904133011251331");
                    const member = interaction.member;
                    await member.roles.add(verifiedRole)
              //      console.log("You are now whitelisted!")
                }
            }
        }
        catch(err){
            console.log(`API error: ${err}`)
        }
    };
  }

client.on('ready', () => {

  //console.log(`Logged in as ${client.user.tag}!`);
  const express = require('express');
  const app = express();

  app.get('/', async function (req, res) {

    const aRequest = await authClient.requestAccessToken(res.req.query.code)
    const token = aRequest.token.access_token
    authClient.token.access_token = token;
    try{
        const user = await twitter_client.users.findMyUser();
        const username = user.data.username;

        const someTwitterUser = (await User.find({twitter: username.toLowerCase()}).exec())[0];
        if (someTwitterUser){
            const guild = await client.guilds.fetch(process.env.guildId);
            const pinnedTweetId = user.data.pinned_tweet_id;
            if (pinnedTweetId){
                const pinnedTweet = await twitter_client.tweets.findTweetById(pinnedTweetId, {
                    "tweet.fields": "created_at"
                })
        
                if (pinnedTweet.data != null || pinnedTweet.data != undefined){
                    const isPinned = whitelisted(getHours(pinnedTweet.data.created_at));
                    const filter = { twitter: username };
                    const update = { token: token };
                    if(isPinned){
                        const verifiedRole = guild.roles.cache.get("1026904133011251331");
                        const guildMember = await guild.members.fetch(someTwitterUser.user)
                        await guildMember.roles.add(verifiedRole)
                        await User.deleteOne({_id: someTwitterUser.id})
                    }
                }
            }
            else{
                await User.deleteOne({_id: someTwitterUser.id});
                /*client.channels.fetch('1026904667730477076').then(async(channel) => {
                    console.log(channel)
                    channel.send({
                        content: "There is no pinned tweet!",
                        ephemeral: true
                    })
                }) */
            }
        }
    }
    catch(err){
        console.log(`API error: ${err}`)
    }
  })

  app.listen(PORT, async() => {
    console.log(`App listening on port ${PORT}`)
    await mongoose.connect(dbURI, {ssl: true})
    .then(() => {
        console.log("connected to database!")
    })
    .catch(err => {
        console.log(err)
    });
  })

}); 

client.on('interactionCreate', async (interaction) => {
    let twitterUsername;
	if (interaction.isChatInputCommand()){
        switch(interaction.commandName){
            case "setup": {
                client.channels.fetch('1026904667730477076').then(async(channel) => {
                    //console.log(channel)
                    await channel.send({
                        
                        embeds: [
                            new EmbedBuilder()
                            .setDescription("Please verify")
                            .setColor("Aqua")
                            .setTitle(`Welcome to ${interaction.guild?.name}`)
                        ],
                        components: [
                            new ActionRowBuilder().setComponents(
                                new ButtonBuilder()
                                .setCustomId("verifyMember")
                                .setLabel("Verify")
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('✔️')
                            )
                        ]
                    })
                })
               // const channel = interaction.options.getChannel('channel');
               // channel.send()
                break;
            }
            case "fetch": {
                /*const atime = "2022-10-08T10:52:50.000Z";
                const sd = new Date(atime);
                console.log("time: " + sd.getTime())

                const now = Date.now();
                console.log("now: " + now)
                console.log("Deltatime: " + (now - sd.getTime())/3600000 ) */
                interaction.reply({content: "Done"})
                break;
            }
            case "embed": {
                client.channels.fetch('1026904667730477076').then(async(channel) => {
                    await channel.send({
                        embeds: [
                            new EmbedBuilder()
                            .setDescription("Click to claim whitelist")
                            .setColor("Aqua")
                            .setTitle(`Whitelist claimer`)
                        ],
                        components: [
                            new ActionRowBuilder().setComponents(
                                new ButtonBuilder()
                                .setCustomId("wl")
                                .setLabel("Submit request")
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('📝')
                            )
                        ]
                    });
                })
                break;
            };
            default: break;
        }
    }
    else if(interaction.isButton()){
        switch(interaction.customId){
            case "verifyMember": {
                const verifiedRole = interaction.guild.roles.cache.get("1026904133011251331");
                if(verifiedRole){
                    const member = interaction.member;
                    await member.roles.add(verifiedRole)
                    .then((msg) => interaction.reply({
                        content: "You are now verified!",
                        ephemeral: true
                    }))
                    .catch((err) => {
                        console.log(err)
                        interaction.reply({
                            content: "Something went wrong!",
                            ephemeral: true
                        })
                    })
                }
                break;
            }
            case "wl": {
                if (!(interaction.member.toJSON().roles).includes("1026904133011251331")){
                    const modal = new ModalBuilder()
                    .setTitle("Register your twitter profile")
                    .setCustomId("twitterModal")
                    .setComponents(new ActionRowBuilder().setComponents(new TextInputBuilder().setLabel("twitter username").setCustomId("twitterUsername").setStyle(TextInputStyle.Short)))
                    interaction.showModal(modal)
                }else return;
                break;
            }
            default: break;
        }
    }
    else if(interaction.type === InteractionType.ModalSubmit){
        if (interaction.customId === "twitterModal"){
            //console.log(interaction.fields.fields.get("twitterUsername").value)
            twitterUsername = interaction.fields.fields.get("twitterUsername").value
            await fetchTweetById(interaction, twitterUsername);
        }
    }

}); 

async function main(){
    try{
        rest.put(Routes.applicationGuildCommands(process.env.clientId, process.env.guildId), 
        {
            body: [
                new SlashCommandBuilder()
                .setName("setup")
                .setDescription("Setup welcome channel bot")
                
                //.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addChannelOption((option) => 
                    option
                    .setName("channel")
                    .setDescription("Channel to send messages to")
                    .addChannelTypes(ChannelType.GuildText)
                )
                ,
                new SlashCommandBuilder().setName('fetch').setDescription('Fetch a tweet'),
                new SlashCommandBuilder().setName('embed').setDescription("embedding a wl")

                ],
        })
        await client.login(process.env.token);
    }
    catch(err){
       // console.log(err)
    }
};

main();

