/*
 * We use 'loglevel' (https://github.com/pimterry/loglevel) as a logging library.
 */
import * as loglevel from 'loglevel';

/**
 * the 'rootLogger' export represents the base loglevel logger.
 *
 * We don't expect to use this logger to log to directly, but it can be used by clients to get an own logger (wih 'getLogger'),
 * it can be used to set the log-level to be displayed for all loggers at the same time (with 'setLevel').
 * and some loglevel-plugins need the root logger to attach to.
 */
export const rootLogger = loglevel;

/**
 * compassLog is a loglevel named logger, with the name 'CompassJS'. This logger is used everywhere in the Compass.js
 * library. Clients can use this logger to set log-level for the Compass.js library without affecting other logging,
 * or to attach plugins / change formatting for the Library logging specifically.
 */
export const compassLogger = rootLogger.getLogger("CompassJS");
compassLogger.setLevel(compassLogger.levels.WARN);



