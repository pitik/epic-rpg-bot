const api = require("./api");
const { log, ...utils } = require("./utils");

const stopBot = process.env.STOP_BOT === "true";

let commands = [];

try {
  commands = JSON.parse(process.env.COMMANDS);
} catch (error) {
  console.log(error);
  commands = [];
}


function executeCommand(text) {
  if (text && text.command) {
    return Promise.all([
      runCommand(text.command, false),
      runCommand(text.reply, false)
    ]);
  }
  return runCommand(text);
}

function startCommands() {
  for (let index = 0; index < commands.length; index++) {
    const command = commands[index] || {};
    if (command.type || command.text) {
      const callback = () => {
        if (Array.isArray(command.text) && command.text.length > 0) {
          if (command.mode === "seq") {
            return Promise.all(command.text.map(executeCommand));
          } else {
            const textIndex = utils.getShiftCommand(
              index,
              command.text.length
            );
            const text = command.text[textIndex];
            return executeCommand(text);
          }
        } else if (typeof command.text === "string") {
          return runCommand(command.text, false);
        } else {
          return runCommand(command.type, false);
        }
      };

      timeoutValues[index] = setTimeout(() => {
        callback().then(() => {
          commandIntervals[index] = setInterval(
            callback,
            command.interval * 1000
          );
        });
      }, cooldownTime);
    }
  }
}

function runCommand(command, isRpg = true) {
  // typing effect
  api.typing().catch(err => log(err));

  return api
    .sendMessage(command, isRpg)
    .then(res => {
      log(`Running ${command}`);
    })
    .catch(err => log(err));
}

if (!stopBot) {
  startCommands();
}
