// Хранилище для SSE-подключений
export class SSEConnection {
  private writer: WritableStreamDefaultWriter;
  private timer: NodeJS.Timeout;
  
  constructor(writer: WritableStreamDefaultWriter) {
    this.writer = writer;
    this.timer = setInterval(() => this.heartbeat(), 15000); // Отправляем heartbeat каждые 15 секунд
  }
  
  send(data: unknown) {
    this.writer.write(`data: ${JSON.stringify(data)}\n\n`);
  }
  
  heartbeat() {
    this.writer.write(`:\n\n`); // Комментарий для поддержания соединения
  }
  
  close() {
    clearInterval(this.timer);
    this.writer.close();
  }
}

export const connections = new Set<SSEConnection>();
// Функция для отправки обновлений всем подключенным клиентам
export function broadcastProgress(progress: number, status: string) {
  console.log('inside broadcastProgress', connections);
  connections.forEach(connection => {
    connection.send({ progress, status, timestamp: new Date().toISOString() });
  });
}