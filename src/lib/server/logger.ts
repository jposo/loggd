import winston from "winston";

export const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.metadata({
            fillExcept: ["message", "level", "timestamp"],
        }),
        winston.format.printf(({ level, message, timestamp, metadata }) => {
            const meta =
                metadata && Object.keys(metadata).length
                    ? ` ${JSON.stringify(metadata)}`
                    : "";
            return `[${timestamp}] [${level.toUpperCase()}]: ${message}${meta}`;
        }),
    ),
    transports: [new winston.transports.Console()],
});
