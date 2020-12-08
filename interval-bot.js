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
      runCommand(text.command),
      runCommand(text.reply)
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
          return runCommand(command.text);
        } else {
          return runCommand(command.type);
        }
      };
      
      callback().then(() => {
        setInterval(
          callback,
          command.interval * 1000
        );
      });
    }
  }
}

function runCommand(command) {
  // typing effect
  api.typing().catch(err => log(err));

  return api
    .sendMessage(command, false)
    .then(res => {
      log(`Running ${command}`);
    })
    .catch(err => log(err));
}

if (!stopBot) {
  startCommands();
}
