let shiftCommand = [];

function getShiftCommand(indexCommand, textLength = 1) {
  if (
    shiftCommand[indexCommand] === undefined ||
    shiftCommand[indexCommand] === textLength - 1
  ) {
    shiftCommand[indexCommand] = 0;
  } else {
    shiftCommand[indexCommand]++;
  }

  return shiftCommand[indexCommand];
}

function getEnv() {
  return {
    superProperty: process.env.SUPER_PROPERTY,
    token: process.env.TOKEN,
    channelId: process.env.CHANNEL_ID,
    username: process.env.USERNAME,
    minHP: process.env.MIN_HP
  };
}

function log(...messages) {
  console.log(new Date(), "\t", ...messages);
}

function hasEpicGuard(data = []) {
  const { username } = getEnv();

  return data.find(({ mentions, author, content }) => {
    return (
      mentions.length > 0 &&
      author.bot &&
      author.username === "EPIC RPG" &&
      mentions.find(m => m.username === username) !== undefined &&
      (/EPIC GUARD/g.test(content) || /, you are in the/g.test(content))
    );
  });
}

function hasRelease(data = []) {
  const { username } = getEnv();
  let hasTypeJail = false;
  let hasTypeProtest = false;
  let hasGuardRelease = false;
  const regexHandleByUser = new RegExp(
    `Everything seems fine \\*\\*${username}\\*\\*, keep playing`,
    "g"
  );

  for (let index = 0; index < data.length; index++) {
    const { author, content } = data[index];

    if (author.username === "EPIC RPG") {
      if (regexHandleByUser.test(content)) {
        log("Already handle by user it self");
        return true;
      }

      if (hasGuardRelease === false) {
        hasGuardRelease = /Fine, i will let you go/g.test(content);
      }
    } else if (author.username === username) {
      if (hasTypeJail === false) {
        hasTypeJail = /rpg jail/g.test(content.trim().toLowerCase());
      }
      if (hasTypeProtest === false) {
        hasTypeProtest = /protest/g.test(content.trim().toLowerCase());
      }
    }
  }

  log(`is ${username} wrote 'rpg jail' ? ${hasTypeJail}`);
  log(`is ${username} wrote 'protest' ? ${hasTypeProtest}`);
  log(`is EPIC RPG wrote 'Fine, i will let you go' ? ${hasGuardRelease}`);

  return hasTypeJail && hasTypeProtest && hasGuardRelease;
}

function getRemainingHPFromContent(content = "") {
  const test = content.match(/remaining HP is (.*)/);

  if (test && test.length > 1 && typeof test[1] === "string") {
    const hp = test[1].split("/").map(Number);
    if (hp.length > 1) {
      const remainingHP = hp[0];
      log(`Remaining HP => ${hp[0]}/${hp[1]}`);
      if (!isNaN(remainingHP)) return remainingHP;
    }
  }
  const isLost = /(lost fighting)/g.test(content);
  if (isLost) return 0;

  log("Can't get remaining HP from message", content);

  return -1;
}

function getRemainingHPFromProfile(fields = []) {
  const fieldStats = fields.find(f => f.name === "STATS");

  if (fieldStats) {
    const match = fieldStats.value.match(/([0-9]+)\/([0-9]+)$/);
    if (match && match.length >= 3) {
      const remainingHP = parseInt(match[1], 10);
      if (!isNaN(remainingHP)) return remainingHP;
    }
  }

  return -1;
}

function isProfileMessage(username = "", embeds = []) {
  if (embeds.length > 0) {
    const embed = embeds[0];
    return (
      embed.author && embed.author.name.indexOf(`${username}'s profile`) >= 0
    );
  }

  return false;
}

function isHunting(username = "", content = "") {
  const regexHandleByUser = new RegExp(
    `\\*\\*${username}\\*\\* found and killed`,
    "g"
  );

  return regexHandleByUser.test(content);
}

function isNeedHealAfterHunting(username = "", messages = [], minHP = 100) {
  for (let index = 0; index < messages.length; index++) {
    const { author = {}, content = "" } = messages[index];
    if (author.username === "EPIC RPG" && isHunting(username, content)) {
      log("Min HP", minHP);
      const remainingHP = getRemainingHPFromContent(content);
      return remainingHP >= 0 && remainingHP <= minHP;
    }
  }
}

function isNeedHealFromProfile(username = "", messages = [], minHP = 100) {
  for (let index = 0; index < messages.length; index++) {
    const { author = {}, embeds = [] } = messages[index];
    if (author.username === "EPIC RPG" && isProfileMessage(username, embeds)) {
      log("Min HP", minHP);
      const remainingHP = getRemainingHPFromProfile(embeds[0].fields);
      return remainingHP >= 0 && remainingHP <= minHP;
    }
  }
}

function hasLootbox(username = "", content = "") {
  const regexHandleByUser = new RegExp(
    `\\*\\*${username}\\*\\* got (.*) lootbox`,
    "g"
  );

  return regexHandleByUser.test(content);
}

function isGotLootbox(username = "", messages = [], around) {
  for (let index = 0; index < messages.length; index++) {
    const { author = {}, content = "", id } = messages[index];

    if (around == id) {
      return false;
    }

    if (author.username === "EPIC RPG" && hasLootbox(username, content)) {
      return true;
    }
  }

  return false;
}

// CREDIT: https://stackoverflow.com/a/51671987/11376743
function parseTime(s) {
  var tokens = { d: 8.64e7, h: 3.6e6, m: 6e4, s: 1e3 };
  var buff = "";
  return s.split("").reduce(function(ms, c) {
    c in tokens ? (ms += buff * tokens[c]) && (buff = "") : (buff += c);
    return ms;
  }, 0);
}

function getCommandsCooldown(fields = []) {
  const regex = /(Daily|Weekly|Lootbox|Vote|Hunt|Adventure|Training|Duel|Quest \| Epic quest|Chop \| Fish \| Pickup \| Mine|Arena|Dungeon \| Miniboss)\`\*\*\s\(\**((\d+d \d+h \d+m \d+s)|(\d+h \d+m \d+s)|(\d+m \d+s))\**/gm;

  // TODO: THIS IS NOT SAFE CODE
  return fields.reduce(
    (result, field) =>
      Object.assign(
        result,
        [...field.value.matchAll(regex)].reduce((result, v) => {
          const r = v.filter(r => r !== undefined);
          const key = r[1].split(" | ")[0].toLowerCase();
          const value = parseTime(r[r.length - 1].replace(/\s/g, ""));
          return Object.assign(result, { [key]: value });
        }, {})
      ),
    {}
  );
}

module.exports = {
  getCommandsCooldown,
  getShiftCommand,
  log,
  hasRelease,
  hasEpicGuard,
  getEnv,
  isNeedHealAfterHunting,
  isNeedHealFromProfile,
  isGotLootbox
};
