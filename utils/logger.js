// Imports the Winston logging library
const winston = require('winston');     

// Creates a new logger object and stores it in the variable
const logger = winston.createLogger({
  level: 'info', 

  format: winston.format.combine(                        
    winston.format.timestamp(),   
    // Winston calls this function later and supplies the argument.                      
    winston.format.printf((logData) => {
      return `${logData.timestamp} [${logData.level.toUpperCase()}]: ${logData.message}`;
    }),
  ),
  
  transports: [
    new winston.transports.File({ 
      // Name of the file where error logs are saved.
      filename: 'error.log', 
      // Tell the File transport which log severity level to write to error.log.
      level: 'error' 
    }),
    new winston.transports.Console(),
  ],
});

module.exports = logger;


//Log levels (from most severe to least): error, warn, info, http, verbose, debug, and silly
// Winston Log Levels (Highest Priority to Lowest):
/*
error(0) → Something broke.
warn(1) → Something unexpected happened.
info(2) → Normal important events.
http(3) → Request-level events.
verbose(4) → More detailed internal activity.
debug(5) → Developer-focused troubleshooting.
silly(6) → Extremely granular tracing.
*/

// Lower number = higher severity.