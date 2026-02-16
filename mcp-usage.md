# для запуска Serena MCP Server (Символьная Навигация)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide --project .

# для запуска Context7 MCP Server (Документация Библиотек)

# для запуска Sequential Thinking MCP Server (Структурированное Планирование)
git clone https://github.com/spences10/mcp-sequentialthinking-tools.git
cd mcp-sequentialthinking-tools && npm run build

# для запуска Filesystem MCP Server (Файловые Операции)
npm install -g @modelcontextprotocol/server-filesystem

# для запуска Memory Bank MCP Server (Персистентный Контекст)
npm install -g @modelcontextprotocol/server-memory

# для запуска Puppeteer MCP Server (Браузерная Автоматизация)
npm install -g @modelcontextprotocol/server-puppeteer

# промпт для проверки работы MCP
Выполни следующие проверки:
1. Используй Serena для поиска функции main в текущем проекте
2. Используй Context7 для получения документации React hooks
3. Используй Sequential Thinking для планирования создания REST API
4. Сохрани в Memory Bank: "Тестовая проверка установки MCP-серверов"
5. Используй Filesystem для чтения package.json
6. (Опционально) Используй Puppeteer для скриншота localhost