import { MongoClient } from "mongodb";
import { AttachmentBuilder } from "discord.js";
import * as fs from "fs";
import { loadImage, createCanvas, registerFont } from "canvas";
import calcVehicleTime from "./calcVehicleTime.js";
import calcVehicleKills from "./calcVehicleKills.js";

function parseIconUrl(url) {
  let newUrl = url.replace("/URL:", "");
  if (newUrl.endsWith("+")) {
    newUrl = newUrl.slice(0, -1);
  }

  return newUrl;
}

async function getUserCurrentGroupAndNextGroup(user, configCollection) {
  const config = await configCollection.findOne({
    type: "score",
  });

  if (!config) return;

  const data = await getUserHighScoreAndGroup(user);

  if (!data) return;

  const [groupId, score] = data;
  const currentGroup = config.icons[groupId];

  let currentRank;
  let nextRank;

  for (const rank of currentGroup) {
    if (rank.needScore > score) {
      nextRank = rank;

      break;
    } else {
      nextRank = rank;
    }
  }

  for (const rank of currentGroup) {
    if (score >= rank.needScore) {
      currentRank = rank;
    }
  }

  return [currentRank, nextRank];
}

async function getUserHighScoreAndGroup(user) {
  if (!user) return;

  const { scoreGroups } = user;
  let highGroupId = "1";

  for (const groupId in scoreGroups) {
    if (scoreGroups[groupId] >= (scoreGroups?.[highGroupId] || 0)) {
      highGroupId = groupId;
    }
  }

  return [highGroupId, scoreGroups?.[highGroupId] || 0];
}

async function loadImageAndDraw(
  ctx,
  imgPath,
  x,
  y,
  maxWidth,
  maxHeight,
  fit = "contain"
) {
  try {
    const img = await loadImage(imgPath);
    const aspectRatio = img.width / img.height;
    const targetAspectRatio = maxWidth / maxHeight;

    let newWidth,
      newHeight,
      offsetX = 0,
      offsetY = 0;

    if (fit === "cover") {
      // Заполнение всей области с обрезкой
      if (aspectRatio > targetAspectRatio) {
        newHeight = maxHeight;
        newWidth = newHeight * aspectRatio;
        offsetX = (maxWidth - newWidth) / 2;
      } else {
        newWidth = maxWidth;
        newHeight = newWidth / aspectRatio;
        offsetY = (maxHeight - newHeight) / 2;
      }
    } else if (fit === "contain") {
      // Вписывание в область с сохранением пропорций
      if (aspectRatio > targetAspectRatio) {
        newWidth = maxWidth;
        newHeight = newWidth / aspectRatio;
        offsetY = (maxHeight - newHeight) / 2;
      } else {
        newHeight = maxHeight;
        newWidth = newHeight * aspectRatio;
        offsetX = (maxWidth - newWidth) / 2;
      }
    } else if (fit === "fill") {
      // Растягивание на всю область (может искажать пропорции)
      newWidth = maxWidth;
      newHeight = maxHeight;
    }

    ctx.drawImage(img, x + offsetX, y + offsetY, newWidth, newHeight);
  } catch (err) {
    console.log(`Image ${imgPath} not found`);
  }
}

async function gettime(time, field) {
  if (field === "sec") {
    time = time / 1000;
    const h = Math.floor((time % (3600 * 24)) / 3600);
    const m = Math.floor((time % 3600) / 60);
    const hDisplay = h > 0 ? h + "ч" : "";
    const mDisplay = m > 0 ? m + "м" : "";
    return hDisplay + mDisplay;
  }
  const d = Math.floor(time / 1440);
  const h = Math.floor((time % 1440) / 60);
  const dDisplay = d > 0 ? d + "д " : "";
  const hDisplay = h > 0 ? h + "ч " : "";
  return dDisplay + hDisplay;
}

async function getStatsOnDiscord(dblink, steamId, interaction) {
  const clientdb = new MongoClient(dblink);
  const dbName = "SquadJS";
  const dbCollection = "mainstats";
  const dbConfigCollection = "configs";

  try {
    await clientdb.connect();
    const db = clientdb.db(dbName);
    const collection = db.collection(dbCollection);
    const configCollection = db.collection(dbConfigCollection);
    const user = await collection.findOne({
      _id: steamId,
    });
    if (!user) {
      await interaction.editReply({
        content: "Игрок не найден в базе данных.",
        ephemeral: true,
      });
      return;
    }
    const roles = Object.entries(user.roles);
    let sortRoles = roles.sort((a, b) => b[1] - a[1]);
    const weapons = Object.entries(user.weapons);
    const resultWeapons = {};
    let artillerySum = 0;
    let knifeSum = 0;

    for (const [key, value] of weapons) {
      const splitKey = key.split("_");
      const secondPart = splitKey[1]; // Получаем вторую часть после разделения

      let prefix, suffix;
      if (secondPart && secondPart.includes("Projectile")) {
        [prefix, suffix] = splitKey.slice(1, 3);
      } else {
        prefix = secondPart || ""; // Если secondPart undefined, используем пустую строку
        suffix = undefined;
      }

      const weaponKey = suffix ? `${prefix} ${suffix}` : prefix;
      if (weaponKey === "Projectile 155mm" || weaponKey === "Heavy") {
        artillerySum += value;
      } else {
        resultWeapons[weaponKey] = (resultWeapons[weaponKey] || 0) + value;
      }

      if (
        weaponKey === "SOCP" ||
        weaponKey === "AK74Bayonet" ||
        weaponKey === "M9Bayonet" ||
        weaponKey === "G3Bayonet" ||
        weaponKey === "Bayonet2000" ||
        weaponKey === "AKMBayonet" ||
        weaponKey === "SA80Bayonet" ||
        weaponKey === "QNL-95" ||
        weaponKey === "OKC-3S"
      ) {
        knifeSum += value;
      }
    }

    const resultArray = Object.entries(resultWeapons).sort(
      (a, b) => b[1] - a[1]
    );
    const time = (await gettime(user.squad.timeplayed?.toString())) || 0;
    const roleTime1 = await gettime(sortRoles[0][1].toString());
    const roleTime2 = await gettime(sortRoles[1][1].toString());
    const role1Img = sortRoles[0][0].split("_").join("");
    const role2Img = sortRoles[1][0].split("_").join("");
    const leader = (await gettime(user.squad.leader?.toString())) || 0;
    const cmd = (await gettime(user.squad.cmd?.toString())) || 0;
    const vehicle = await calcVehicleTime(user.possess);
    const vehicleKills = await calcVehicleKills(user.weapons);
    const heliTime = (await gettime(vehicle[1])) || 0;
    const heavyTime = (await gettime(vehicle[0])) || 0;
    const killPerMatch = user.kills / user.matches.matches;
    const [, currentExp] = await getUserHighScoreAndGroup(user);
    const [currentExpGroup, nextExpGroup] =
      await getUserCurrentGroupAndNextGroup(user, configCollection);
    const isMaxExp = currentExp >= nextExpGroup.needScore;

    registerFont("./img/Inter-Medium.ttf", {
      family: "InterMed",
    });
    registerFont("./img/Inter-Bold.ttf", {
      family: "InterBold",
    });
    registerFont("./img/Inter-SemiBold.ttf", {
      family: "InterSemi",
    });

    const width = 1920;
    const height = 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    await loadImageAndDraw(ctx, "./img/stats.png", 0, 0, 1920, 1080, "fill");
    await loadImageAndDraw(
      ctx,
      `./img/Icon_${role1Img}_kit.png`,
      120,
      550,
      100,
      100,
      "contain"
    );

    ctx.fillStyle = "#efefef";
    ctx.font = "48pt InterBold";
    ctx.fillText(user.name, 82, 150); // Имя
    ctx.font = "32pt InterBold";
    ctx.fillText(user.matches.matches, 145, 405); // Всего игр
    ctx.fillText(time || 0, 390, 405); // Всего часов
    ctx.fillText(leader || 0, 633, 405); // Свадной
    ctx.fillText(heavyTime || 0, 878, 405); // Мехвод
    ctx.fillText(heliTime || 0, 145, 490); // Пилот
    ctx.fillText(cmd || 0, 390, 490); // ЦМД
    ctx.fillText(user.revives.toString() || 0, 633, 490); // Помощь
    ctx.fillText(user.teamkills.toString(), 876, 490); // Тимкилы

    ctx.font = "28pt InterBold";
    ctx.fillText(sortRoles[0][0].split("_").join("").toUpperCase(), 234, 630); // Первая роль

    if (resultArray.length != 0) {
      ctx.textAlign = "right";
      await loadImageAndDraw(
        ctx,
        `./img/weapons/${resultArray[0][0].toLowerCase()}.png`,
        645,
        565,
        140,
        70,
        "contain"
      );
      ctx.fillText(resultArray[0][1], 900, 627); // Первое оружие
      ctx.textAlign = "left";
      ctx.font = "32pt InterBold";
      ctx.fillText(user.matches.won.toString(), 369, 1000); //Побед
      ctx.fillText(user.kd.toString(), 80, 1000); // КД
      ctx.fillText(user.death.toString(), 225, 1000); // Смерти
      ctx.font = "80pt InterBold";
      ctx.fillText(`${~~user.matches.winrate.toString()}%`, 80, 875); // % Побед
      ctx.fillText(user.kills.toString(), 602, 875); // Убийств

      ctx.font = "32pt InterBold";
      ctx.fillText(`${~~killPerMatch}`, 604, 1000); // Убийств за игру
      ctx.fillText(`${~~vehicleKills}`, 746, 1000); // Убийств на технике
      ctx.fillText(knifeSum, 892, 1000); // Нож

      /////////////////////////////// PROGRESS BAR
      ctx.font = "14pt InterMed";
      ctx.fillText("Текущий ранг", 90, 250);
      await loadImageAndDraw(
        ctx,
        parseIconUrl(currentExpGroup.iconUrl),
        130,
        258,
        80,
        55,
        "contain"
      );
      ctx.textAlign = "right";

      if (isMaxExp) {
        ctx.fillText("Максимальный ранг", 1010, 250);
      } else {
        ctx.fillText("Следующий ранг", 1010, 250);
        await loadImageAndDraw(
          ctx,
          parseIconUrl(nextExpGroup.iconUrl),
          910,
          258,
          80,
          55,
          "contain"
        );
      }

      const x0 = 82;
      const y0 = 170;
      const width1 = 940;
      const height1 = 56;
      const borderRadius = 20; // Радиус закругления углов

      // Рисуем фоновый прямоугольник с закругленными углами
      ctx.fillStyle = "#313338"; // Цвет фона (можно выбрать любой)
      ctx.beginPath();
      ctx.moveTo(x0 + borderRadius, y0);
      ctx.lineTo(x0 + width1 - borderRadius, y0);
      ctx.arcTo(x0 + width1, y0, x0 + width1, y0 + borderRadius, borderRadius);
      ctx.lineTo(x0 + width1, y0 + height1 - borderRadius);
      ctx.arcTo(
        x0 + width1,
        y0 + height1,
        x0 + width1 - borderRadius,
        y0 + height1,
        borderRadius
      );
      ctx.lineTo(x0 + borderRadius, y0 + height1);
      ctx.arcTo(
        x0,
        y0 + height1,
        x0,
        y0 + height1 - borderRadius,
        borderRadius
      );
      ctx.lineTo(x0, y0 + borderRadius);
      ctx.arcTo(x0, y0, x0 + borderRadius, y0, borderRadius);
      ctx.closePath();
      ctx.fill();

      // Создание градиента от темно-жёлтого до оранжевого
      const gradient = ctx.createLinearGradient(x0, y0, x0 + width1, y0);
      gradient.addColorStop(0.0, "#b07d2b"); // Темно-жёлтый цвет
      gradient.addColorStop(1.0, "#ff8c00"); // Оранжевый цвет
      ctx.clip();

      const pct =
        currentExp >= nextExpGroup.needScore
          ? nextExpGroup.needScore / nextExpGroup.needScore
          : currentExp / nextExpGroup.needScore;
      const progressWidth = width1 * pct;

      // Рисуем контур прогресс бара с градиентом от оранжевого к белому
      const progressGradient = ctx.createLinearGradient(
        x0,
        y0,
        x0 + width1,
        y0
      );
      progressGradient.addColorStop(0.0, "white");
      progressGradient.addColorStop(1.0, "orange");

      ctx.strokeStyle = progressGradient;
      ctx.lineWidth = 1;
      ctx.stroke();
      // Рисуем закругленный прямоугольник внутренней заливки
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x0 + borderRadius, y0);
      ctx.lineTo(x0 + progressWidth - borderRadius, y0);
      ctx.arcTo(
        x0 + progressWidth,
        y0,
        x0 + progressWidth,
        y0 + borderRadius,
        borderRadius
      );
      ctx.lineTo(x0 + progressWidth, y0 + height1 - borderRadius);
      ctx.arcTo(
        x0 + progressWidth,
        y0 + height1,
        x0 + progressWidth - borderRadius,
        y0 + height1,
        borderRadius
      );
      ctx.lineTo(x0 + borderRadius, y0 + height1);
      ctx.arcTo(
        x0,
        y0 + height1,
        x0,
        y0 + height1 - borderRadius,
        borderRadius
      );
      ctx.lineTo(x0, y0 + borderRadius);
      ctx.arcTo(x0, y0, x0 + borderRadius, y0, borderRadius);
      ctx.closePath();
      ctx.fill();

      // Наносим текстовую информацию
      ctx.textAlign = "center";
      ctx.font = "20pt InterMed";
      ctx.fillStyle = "#efefef";
      ctx.fillText(
        `${currentExp}/${nextExpGroup.needScore}`,
        x0 + width1 / 2,
        y0 + height1 / 2 + 10
      ); // Положение текста центрально по горизонтали и вертикали
    }

    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync("./stats.png", buffer);
    const imageToSend = new AttachmentBuilder("stats.png");
    interaction.editReply({
      content: `<@${interaction.user.id}>`,
      files: [imageToSend],
    });
  } catch (e) {
    console.log(e);
    await interaction.editReply({
      content: "Сыграно слишком мало игр для отображения статистики.",
      ephemeral: true,
    });
  } finally {
    await clientdb.close();
  }
}

export default getStatsOnDiscord;
