import { Client, GatewayIntentBits, Collection, Events } from "discord.js";
import getCommands from "./commands/getCommands.js";
import { config } from "dotenv";
import sendTopImageToChannel  from "./utility/getCMDOnDiscord.js";
import startWeeklyResetTask from "./utility/resetCMDstat.js";
config();

const client = new Client({
  intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});
client.commands = new Collection();
const commands = await getCommands();

for (const command of commands) {
  if ("data" in command && "execute" in command)
    client.commands.set(command.data.name, command);
  else logger.verbose("discord", 1, `The command missing! in index.js`);
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  sendTopImageToChannel(client);
  startWeeklyResetTask();
});
 
client.on(Events.InteractionCreate, async (interaction) => {
  const command = interaction.client.commands.get(interaction.commandName);
  if (interaction.isChatInputCommand()) {
    try {
      await command.execute(interaction);
    } catch (error) {
      if (interaction.replied || interaction.deferred) {
        console.log(error);
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  }
});

await client.login(process.env.CLIENT_TOKEN);
