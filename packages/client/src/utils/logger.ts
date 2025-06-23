interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      return `${baseMessage} ${JSON.stringify(data, null, 2)}`;
    }
    
    return baseMessage;
  }

  error(message: string, data?: any): void {
    const formattedMessage = this.formatMessage(LOG_LEVELS.ERROR, message, data);
    console.error(formattedMessage);
    
    // In production, you might want to send errors to a logging service
    if (!this.isDevelopment) {
      // Send to logging service
    }
  }

  warn(message: string, data?: any): void {
    const formattedMessage = this.formatMessage(LOG_LEVELS.WARN, message, data);
    console.warn(formattedMessage);
  }

  info(message: string, data?: any): void {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage(LOG_LEVELS.INFO, message, data);
      console.info(formattedMessage);
    }
  }

  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage(LOG_LEVELS.DEBUG, message, data);
      console.debug(formattedMessage);
    }
  }
}

export const logger = new Logger();
