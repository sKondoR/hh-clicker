import { useEffect } from "react";

// Хук для подключения к SSE для получения реального времени прогресса
export function useSSE(isScraping: boolean, setProgress: (progress: number) => void, setStatus: (status: string) => void) {
  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    if (isScraping) {
      eventSource = new EventSource('/api/progress');
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setProgress(data.progress);
          setStatus(data.status);
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        if (eventSource?.readyState === EventSource.CLOSED) {
          setStatus('Подключение закрыто');
        }
      };
    }
    
    // Очистка при остановке скрапинга или размонтировании компонента
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScraping]);
}