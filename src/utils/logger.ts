type LoggerParams = {
  isDev: boolean;
};

export const createLogger = ({ isDev }: LoggerParams) => {
  const log = (message: string, meta?: Record<string, unknown>) => {
    if (!isDev) {
      return;
    }

    if (meta) {
      console.log(message, meta);
      return;
    }

    console.log(message);
  };

  const error = (message: string, meta?: Record<string, unknown>) => {
    if (meta) {
      console.error(message, meta);
      return;
    }

    console.error(message);
  };

  return { log, error };
};
