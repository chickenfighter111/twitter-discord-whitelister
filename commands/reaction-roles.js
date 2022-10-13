const {MessageEmbed} = require("discord.js")
 
module.exports = {
    name: 'reaction-roles',
    description: "Verify command",
    async execute(client, msg , args, Discord){
        if (msg.member.roles.cache.has('728233239998627842')) return;

        const channel = "1026904667730477076";
        const memberRole = "1026904133011251331";
        const verifyEmoji = "✔️";


        let embed = new MessageEmbed()
        .setColor("GREEN")
        .setTitle("React to verify")
        .setDescription("React with ✔️ to get verified")
    }
}