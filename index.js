/*
	Gabriel Hoy
	11/7/2021
	This is the result of an all-nighter emergency fix to my community and people posting links to discord - don't expect super clean code, I might tidy it in the future
*/
const fs = require("fs");
const Eris = require("eris");
const axios = require("axios");

let token = fs.readFileSync("token.txt").toString();

const bot = new Eris(token);

bot.on("ready", () => {
	console.log("Bot started");
});

bot.on("error", (err) => {
	console.log(err);
});

//thanks stack overflow
let urlAwfulRegex = /((?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?)/gi;

const hardDomainBlacklist = {
		"discrod-apps.xyz": "Discord scam site",
		"discocrd-gift.com": "Discord scam site",
		"dliscordl.com": "Discord scam site",
		"dlscrod-app.xyz": "Discord scam site",
		"discord-app.xyz": "Discord scam site",
		"freenitro.com": "Discord scam site",
		"free-nitro.com": "Discord scam site",
		"discordieam.com": "Discord scam site",
		"freediscordnitro.com": "Discord scam site",
		"discocrd-gift.com": "Discord scam site",
		"dateingclub.com": "Misc. Scam link",
		"grabify.com": "IP Logging link",
		"discordgifts.com": "Discord scam site",
		"discordappp.com": "Discord scam site",
		"discordap.com": "Discord scam site",
		"boostnitro.com": "Discord scam site",
		"discordboost.com": "Discord scam site",
		"discord-nittro.xyz": "Discord scam site"
}

const hardPhraseBlacklist = {
		"bro watch this, working nitro gen": "Nitro Scam",
		"Get Discord Nitro for Free": "Nitro Scam",
		"Click to get Nitro:": "Nitro Scam",
		"@everyone free": "Attempt to ping all server members for a scam",
		"Discord Nitro with Steam": "Nitro Scam",
		"Free distribution of": "Scam text",
		"Free discord nitro": "Likely Scam Message - \"Free Discord Nitro\"",
		"get free nitro": "Likely scam message",
		"airdrop from steam": "Steam-Discord AirDrop Scam"
}

//has to be decently specific or uncommon, spans sites code for it
const blacklistedSiteContent = {
	"Get 3 months of Discord Nitro free from STEAM.": "Steam-Discord Scam",
	"pososi_mudila.webm": "Steam-Discord scam",
	"3 months of Discord Nitro free": "Discord Nitro Scam",
}

//self explanatory, returns a promise that resolves after a timeout for sleeping in node
function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

//levenshtein Distance, used to determine the general "similarity" between two strings
function Levenshtein(str1, str2) {
	let len1 = str1.length;
	let len2 = str2.length;
	let matrix = [];
	let cost = 0;

	if (len1 == 0) {
		return len2;
	} else if (len2 == 0) {
		return len1;
	} else if (str1 == str2) {
		return 0;
	}

	for (let i = 0; i <= len1; i++) {
		matrix[i] = [];
		matrix[i][0] = i;
	}
	for (let j = 0; j <= len2; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= len1; i++) {
		for (let j = 1; j <= len2; j++) {
			if (str1.charAt(i - 1) == str2.charAt(j - 1)) {
				cost = 0;
			} else {
				cost = 1;
			}

			matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
		}
	}

	return matrix[len1][len2];
}

const StripLink = (link, keepTopLevelDomain) => {
	return link.replace("https://","").replace("http://","").replace("www.","").replace(keepTopLevelDomain ? "" : /\.[^.]+$/, "");
}

const IsInfringingLink = async (link) => {
	let strippedLink = StripLink(link);
	if (strippedLink.toLowerCase() == "discord" || strippedLink.toLowerCase() == "discordapp") {
		return false;
	}
	//is this link quite literally just discord
	if (Levenshtein(strippedLink, "discord") <= 3) {
		return `Attempt at bypassing the discord.com domain [Levenshtein check failed - ${Levenshtein(strippedLink, "discord")}]`;
	}
	for (let [str,reason] of Object.entries(hardDomainBlacklist)) {
		//strip url of domain extension
		str = StripLink(str);
		//Check levenshtein distance, ignore the domain extension since we dont really care and have verified its *not* discord
		if (Levenshtein(strippedLink, str) <= 3) {
			return `Attempt at bypassing a scam domain[Levenshtein check failed - ${Levenshtein(strippedLink, str)} - ${reason}]`;
		}
	}
	try {
		//Start the actual website content check
		console.log("getting link", link);
		let response = await axios.get(link);

		for (let [str,reason] of Object.entries(blacklistedSiteContent)) {
			if (response.data.toLowerCase().includes(str.toLowerCase())) {
				return `Attempt at posting an unsafe site[${reason}]`;
			}
		}

		if (response.request._redirectable._redirectCount > 0) {
			
			let infringeStatus = await IsInfringingLink(response.request.res.responseUrl);
			if (infringeStatus) {
				return `Attempt at redirection to an unsafe domain - Redirect details:\n${infringeStatus}`;
			}
			//return `Redirect - test - orig: ${link} - redirect - ${response.request.res.responseUrl} - countRedirects = ${response.request._redirectable._redirectCount}`
		}
	} catch (err) {
		console.warn(err);
	}
	return false;
}

const IsInfringingMessage = async (message) => {
	//Hard checks(Can go out of date)
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

	//Match checks
	if (message.content.toLowerCase().includes("@everyone") && (message.content.toLowerCase().includes("nitro") || message.content.toLowerCase().includes("3 months") || message.content.toLowerCase().includes("steam"))) {
		return "Attempt to ping all server members for a scam";
	}

	//Soft checks(Should stay generally up-to-speed with scams as they progress)
	//Gets a list of all the links in the message, iterates through them
	for (let linkText of (message.content.match(urlAwfulRegex) || [])) {
		let isInfringe = await IsInfringingLink(linkText);
		if (isInfringe) {
			return isInfringe;
		}
	}
	return false;
};

bot.on("messageCreate", async (msg) => {
	if (msg.author.id == bot.user.id) return;
		try {
			let isInfringeReason = await IsInfringingMessage(msg);
			if (isInfringeReason) {
				msg.delete();
				bot.createMessage(msg.channel.id, `<@${msg.author.id}>\nYour message has been deleted for: \n${isInfringeReason}`).then(msg => {
					setTimeout(() => {
						msg.delete();
					}, 10000);
				});
			}
		} catch (err) {
			console.log(err);
		}
})

bot.connect();