import { createCanvas, loadImage, registerFont } from "canvas";
import * as fs from "fs";
import { AttachmentBuilder } from "discord.js";
import { MongoClient } from "mongodb";
import schedule from "node-schedule";
import config from "../config.js";

// ID канала
const channelID = config.cmdChannel;

async function loadImageAndDraw(ctx, imgPath, x, y, width, height) {
  try {
    const img = await loadImage(imgPath);
    ctx.drawImage(img, x, y, width, height);
  } catch (err) {
    console.log(`Image ${imgPath} не найдена`);
  }
}

function calculateScore(wins, matches) {
  if (matches < 5) return 0;
  const winrate = (wins / matches) * 100;
  const weightFactor = Math.log(matches);
  return winrate * weightFactor;
}

// Функция для адаптивного изменения размера шрифта чисел
function adjustNumberFontSize(ctx, text, maxWidth, baseFontSize) {
  let fontSize = baseFontSize;
  do {
    ctx.font = `${fontSize}pt InterBold`; // Устанавливаем текущий размер шрифта
    fontSize -= 2; // Уменьшаем размер шрифта на 2pt
  } while (ctx.measureText(text).width > maxWidth && fontSize > 10); // Пока текст не поместится или шрифт не станет слишком маленьким
  return ctx.font; // Возвращаем итоговый размер шрифта
}

async function sendTopImageToChannel(client) {
  const clientdb = new MongoClient(config.dbLink);
  try {
    await clientdb.connect();
    const db = clientdb.db("SquadJS");
    const collection = db.collection("mainstats");

    const players = await collection.find({}).toArray();

    if (!players.length) {
      console.log("Нет игроков для отображения.");
      return;
    }

    const filteredPlayers = players.filter(
      (player) => (player.matches?.cmdmatches ?? 0) >= 5
    );

    if (!filteredPlayers.length) {
      console.log("Нет игроков с минимум 5 матчами для отображения.");
      return;
    }

    filteredPlayers.forEach((player) => {
      const cmdwon = player.matches?.cmdwon ?? 0; // Количество побед
      const cmdmatches = player.matches?.cmdmatches ?? 0; // Всего игр

      player.score = calculateScore(cmdwon, cmdmatches); // Оценка игрока
    });

    filteredPlayers.sort((a, b) => b.score - a.score);

    const topPlayers = filteredPlayers.slice(0, 7);

    const canvas = createCanvas(3555, 4131); // Размеры изображения
    const ctx = canvas.getContext("2d");

    await loadImageAndDraw(ctx, "./img/background.png", 0, 0, 3555, 4131);

    registerFont("./img/Inter-Bold.ttf", { family: "InterBold" });

    ctx.fillStyle = "#ffffff"; // Цвет для текста
    ctx.font = "40pt InterBold"; // Шрифт и размер текста

    function adjustFontSize(ctx, text, maxWidth, fontSize) {
      do {
        ctx.font = `${fontSize--}pt InterBold`; // Уменьшение размера шрифта
      } while (ctx.measureText(text).width > maxWidth && fontSize > 15); // Пока ширина текста больше максимальной и шрифт больше 10pt
      return ctx.font;
    }

    topPlayers.forEach((player, index) => {
      const cmdwinrate = player.matches?.cmdwinrate ?? 0;
      const cmdmatches = player.matches?.cmdmatches ?? 0;
      const cmdwon = player.matches?.cmdwon ?? 0;

      if (index === 0) {
        // 1 место
        let fontSize = 116;
        ctx.font = adjustFontSize(ctx, player.name, 900, fontSize); // Устанавливаем шрифт для имени
        ctx.fillText(player.name, 221, 1700); // Имя игрока

        // Рейтинг (без адаптивного изменения шрифта)
        ctx.font = "106pt InterBold";
        ctx.fillText(`${cmdwinrate.toFixed(2)}%`, 221, 1900); // Рейтинг

        // Всего игр (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdmatches.toString(), 200, 106); // Адаптивный размер шрифта
        ctx.fillText(cmdmatches, 219, 2110); // Всего игр

        // Всего побед (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdwon.toString(), 200, 106); // Адаптивный размер шрифта
        ctx.fillText(cmdwon, 490, 2110); // Всего побед
      } else if (index === 1) {
        // 2 место
        let fontSize = 86;
        ctx.font = adjustFontSize(ctx, player.name, 900, fontSize); // Устанавливаем шрифт для имени
        ctx.fillText(player.name, 1324, 1690); // Имя игрока

        // Рейтинг (без адаптивного изменения шрифта)
        ctx.font = "96pt InterBold";
        ctx.fillText(`${cmdwinrate.toFixed(2)}%`, 1324, 1905); // Рейтинг

        // Всего игр (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdmatches.toString(), 200, 96); // Адаптивный размер шрифта
        ctx.fillText(cmdmatches, 1324, 2095); // Всего игр

        // Всего побед (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdwon.toString(), 200, 96); // Адаптивный размер шрифта
        ctx.fillText(cmdwon, 1600, 2095); // Всего побед
      } else if (index === 2) {
        // 3 место
        let fontSize = 86;
        ctx.font = adjustFontSize(ctx, player.name, 900, fontSize); // Устанавливаем шрифт для имени
        ctx.fillText(player.name, 2440, 1725); // Имя игрока

        // Рейтинг (без адаптивного изменения шрифта)
        ctx.font = "76pt InterBold";
        ctx.fillText(`${cmdwinrate.toFixed(2)}%`, 2440, 1900); // Рейтинг

        // Всего игр (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdmatches.toString(), 200, 76); // Адаптивный размер шрифта
        ctx.fillText(cmdmatches, 2440, 2085); // Всего игр

        // Всего побед (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdwon.toString(), 200, 76); // Адаптивный размер шрифта
        ctx.fillText(cmdwon, 2710, 2085); // Всего побед
      } else if (index === 3) {
        // 4 место
        let fontSize = 100;
        ctx.font = adjustFontSize(ctx, player.name, 900, fontSize); // Устанавливаем шрифт для имени
        ctx.fillText(player.name, 405, 2440); // Имя игрока

        // Рейтинг (без адаптивного изменения шрифта)
        ctx.font = "50pt InterBold";
        ctx.fillText(`${cmdwinrate.toFixed(2)}%`, 200, 2605); // Рейтинг

        // Всего игр (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdmatches.toString(), 150, 50); // Адаптивный размер шрифта
        ctx.fillText(cmdmatches, 520, 2605); // Всего игр

        // Всего побед (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdwon.toString(), 150, 50); // Адаптивный размер шрифта
        ctx.fillText(cmdwon, 815, 2605); // Всего побед
      } else if (index === 4) {
        // 5 место
        let fontSize = 100;
        ctx.font = adjustFontSize(ctx, player.name, 900, fontSize); // Устанавливаем шрифт для имени
        ctx.fillText(player.name, 2057, 2440); // Имя игрока

        // Рейтинг (без адаптивного изменения шрифта)
        ctx.font = "50pt InterBold";
        ctx.fillText(`${cmdwinrate.toFixed(2)}%`, 1856, 2605); // Рейтинг

        // Всего игр (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdmatches.toString(), 150, 50); // Адаптивный размер шрифта
        ctx.fillText(cmdmatches, 2175, 2605); // Всего игр

        // Всего побед (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdwon.toString(), 150, 50); // Адаптивный размер шрифта
        ctx.fillText(cmdwon, 2470, 2605); // Всего побед
      } else if (index === 5) {
        // 6 место
        let fontSize = 100;
        ctx.font = adjustFontSize(ctx, player.name, 900, fontSize); // Устанавливаем шрифт для имени
        ctx.fillText(player.name, 405, 2965); // Имя игрока

        // Рейтинг (без адаптивного изменения шрифта)
        ctx.font = "50pt InterBold";
        ctx.fillText(`${cmdwinrate.toFixed(2)}%`, 200, 3130); // Рейтинг

        // Всего игр (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdmatches.toString(), 150, 50); // Адаптивный размер шрифта
        ctx.fillText(cmdmatches, 520, 3130); // Всего игр

        // Всего побед (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdwon.toString(), 150, 50); // Адаптивный размер шрифта
        ctx.fillText(cmdwon, 815, 3130); // Всего побед
      } else if (index === 6) {
        // 7 место
        let fontSize = 100;
        ctx.font = adjustFontSize(ctx, player.name, 900, fontSize); // Устанавливаем шрифт для имени
        ctx.fillText(player.name, 2057, 2965); // Имя игрока

        // Рейтинг (без адаптивного изменения шрифта)
        ctx.font = "50pt InterBold";
        ctx.fillText(`${cmdwinrate.toFixed(2)}%`, 1856, 3130); // Рейтинг

        // Всего игр (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdmatches.toString(), 150, 50); // Адаптивный размер шрифта
        ctx.fillText(cmdmatches, 2175, 3130); // Всего игр

        // Всего побед (с адаптивным изменением шрифта)
        ctx.font = adjustNumberFontSize(ctx, cmdwon.toString(), 150, 50); // Адаптивный размер шрифта
        ctx.fillText(cmdwon, 2470, 3130); // Всего побед
      }
    });

    const imageBuffer = canvas.toBuffer("image/png");
    fs.writeFileSync("./top5.png", imageBuffer);

    const attachment = new AttachmentBuilder("./top5.png");
    const channel = await client.channels.fetch(channelID);
    await channel.send({ files: [attachment] });
  } catch (error) {
    console.error("Ошибка при отправке изображения:", error);
  } finally {
    await clientdb.close();
  }
}

function startWeeklyTopTask(client) {
  // 20:00 по московскому времени
  schedule.scheduleJob("0 20 * * 0", () => {
    sendTopImageToChannel(client);
  });

  // sendTopImageToChannel(client);
}

export default startWeeklyTopTask;
