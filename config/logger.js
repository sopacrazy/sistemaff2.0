// config/logger.js
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

// Definir diretório de logs
const logDir = path.join(__dirname, "..", "logs");

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Formato legível para console
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Transporte para logs de erro (apenas erros)
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logDir, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  level: "error",
  maxSize: "20m",
  maxFiles: "30d",
  format: logFormat,
});

// Transporte para logs combinados (todos os níveis)
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logDir, "combined-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  format: logFormat,
});

// Transporte para console (apenas em desenvolvimento)
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
});

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  transports: [errorFileTransport, combinedFileTransport],
  // Não encerra em caso de erro
  exitOnError: false,
});

// Adicionar console apenas em desenvolvimento
if (process.env.NODE_ENV !== "production") {
  logger.add(consoleTransport);
}

// Função helper para log de requisições HTTP
logger.logRequest = (req, statusCode, message = "") => {
  const logData = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection?.remoteAddress,
    statusCode,
    userAgent: req.headers["user-agent"],
    user: req.user?.username || "anonymous",
  };

  if (statusCode >= 500) {
    logger.error(message || "Erro no servidor", logData);
  } else if (statusCode >= 400) {
    logger.warn(message || "Requisição com erro", logData);
  } else {
    logger.info(message || "Requisição processada", logData);
  }
};

// Função helper para log de autenticação
logger.logAuth = (username, success, ip, reason = "") => {
  const logData = {
    username,
    success,
    ip,
    reason,
    timestamp: new Date().toISOString(),
  };

  if (success) {
    logger.info("Login bem-sucedido", logData);
  } else {
    logger.warn("Tentativa de login falhou", logData);
  }
};

// Função helper para log de erros de banco de dados
logger.logDbError = (operation, error, details = {}) => {
  logger.error("Erro no banco de dados", {
    operation,
    errorMessage: error.message,
    errorCode: error.code,
    ...details,
  });
};

module.exports = logger;
