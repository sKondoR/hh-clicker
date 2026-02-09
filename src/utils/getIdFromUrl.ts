export function getIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part);
    
    // Looking for pattern like /vacancy/<id>
    const vacancyIndex = pathParts.indexOf('vacancy');
    if (vacancyIndex !== -1 && vacancyIndex + 1 < pathParts.length) {
      return pathParts[vacancyIndex + 1];
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}