#!/bin/bash

# Проверяем, что Node.js установлен
if ! command -v node &> /dev/null; then
    echo "Node.js не установлен. Установите Node.js перед запуском скрипта."
    exit 1
fi

# Путь к вашему скрипту index.js
SCRIPT_PATH="index.js"

# Запускаем скрипт
node index.js