import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import getStatsOnDiscord from "../utility/getStatsOnDiscord.js";
import getStatsOnDiscordWithoutSteamID from "../utility/getStatsOnDiscordWithoutSteamID.js";
import options from "../config.js";
import { config } from "dotenv";
config();

const { dbLink, adminsPath, statsChannelID } = options;

const statsCommand = new SlashCommandBuilder()
  .setName("stats")
  .setDescription("Получить статистику игрока")
  .setDefaultMemberPermissions(PermissionFlagsBits.RequestToSpeak);

statsCommand.addStringOption((option) =>
  option
    .setName("steamid64")
    .setDescription("Введите 17 цифр steamID64 для получения статистики игрока")
    .setRequired(false)
    .setMaxLength(17)
    .setMinLength(17)
);

const execute = async (interaction) => {
  try {
    const channelId = interaction.channelId;

    if (channelId !== statsChannelID) {
      return await interaction.reply({
        content:
          "Команда доступна только VIP пользователям в канале 'Статистика'",
        ephemeral: true,
      });
    }
    await interaction.deferReply();
    const userParam = interaction.options.getString("steamid64");
    if (userParam) {
      await getStatsOnDiscord(dbLink, userParam, interaction);
    } else {
      await getStatsOnDiscordWithoutSteamID(dbLink, adminsPath, interaction);
    }
  } catch (error) {
    await interaction.reply({
      content: "Произошла ошибка.",
      ephemeral: true,
    });
  }
};

export default { data: statsCommand, execute };
