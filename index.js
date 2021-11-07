const fs = require("fs");
const Eris = require("eris");

let token = fs.readFileSync("token.txt").toString();

const bot = new Eris(token);

bot.on("ready", () => {
  console.log("Bot started");
});

bot.on("error", (err) => {
  console.log(err);
});

let urlAwfulRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

const hardDomainBlacklist = {
    "bit.ly": "Link Redirection platform",
    "discrod-apps.xyz": "Discord scam site",
    "discocrd-gift.com": "Discord scam site",
    "dliscordl.com": "Discord scam site",
    "dlscrod-app.xyz": "Discord scam site"
}

const hardPhraseBlacklist = {
    "bro watch this, working nitro gen": "Nitro Scam",
    "Get Discord Nitro for Free": "Nitro Scam",
    "Click to get Nitro:": "Nitro Scam",
    "@everyone free": "Attempt to ping all server members for a scam",
    "Discord Nitro with Steam": "Nitro Scam",
}

const IsInfringingMessage = (message) => {
    for (let [str,reason] of Object.entries(hardPhraseBlacklist)) {
        if (message.content.toLowerCase().includes(str.toLowerCase())) {
          return `Blacklisted phrase - ${reason}`;
        }
      }
      for (let [str,reason] of Object.entries(hardDomainBlacklist)) {
        if (message.content.toLowerCase().includes("https://" + str.toLowerCase() || "http://" + str.toLowerCase())) {
          return `Blacklisted domain - ${reason}`;
        }
      }
  return false;
};

bot.on("messageCreate", (msg) => {
    let isInfringeReason = IsInfringingMessage(msg);
    if (isInfringeReason) {
        bot.createMessage(msg.channel.id, `<@${msg.author.id}>\nYour message has been deleted for: \n${isInfringeReason}`);
        msg.delete();
    }
})

bot.connect();