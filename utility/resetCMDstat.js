import { MongoClient } from "mongodb";
import schedule from "node-schedule";
import config from "../config.js";

async function resetPlayerStats() {
  const clientdb = new MongoClient(config.dbLink);
  try {
    await clientdb.connect();
    const db = clientdb.db("SquadJS");
    const collection = db.collection("mainstats");

    await collection.updateMany(
      {},
      { 
        $set: { 
          "matches.cmdmatches": 0,
          "matches.cmdwinrate": 0,
          "matches.cmdwon": 0,
          "matches.cmdlose" : 0
        }
      }
    );

    console.log("Статистика успешно сброшена.");
  } catch (error) {
    console.error("Ошибка при сбросе статистики:", error);
  } finally {
    await clientdb.close();
  }
}

// resetPlayerStats();

function startWeeklyResetTask() {
  // 21:00
  schedule.scheduleJob('0 21 * * 0',() => {
    resetPlayerStats();
  });
  console.log("Задача на еженедельный сброс статистики успешно запущена.");
}


export default startWeeklyResetTask;
