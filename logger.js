

let fs = require("fs");

let omzutil = require("./util.js");
let meta = require("./meta.json");

let logLevel = 3;


const logSaveIntervalTime = 300000;

let logSaveInterval;
let logCache = "";
let logFile;


let logMessageCallback;


function log(level, str, color){
	let time = Date.now();
	log0(new Date(time).toString().substring(0, 24) + "." + omzutil.pad(time % 1000, 3) + " [" + level + "] " + str, color);
	if(typeof(logMessageCallback) == "function")
		logMessageCallback(str, level);
}

function log0(str, color){
	if(logFile)
		logCache += str + "\n";
	process.stdout.write((color || "") + str + "\x1b[0m\n");
}

let logLevels = [
	{
		"name": "fatal",
		"level": 0,
		"color": "\x1b[0;97m\x1b[41m"
	},
	{
		"name": "error",
		"level": 1,
		"color": "\x1b[0;91m"
	},
	{
		"name": "warn",
		"level": 2,
		"color": "\x1b[0;93m"
	},
	{
		"name": "info",
		"level": 3,
		"color": "\x1b[0;97m"
	},
	{
		"name": "debug",
		"level": 4
	},
	{
		"name": "trace",
		"level": 5
	}
];

function log_save(){
	if(!logCache)
		return;
	try{
		fs.appendFileSync(logFile, logCache);
		logCache = "";
	}catch(e){
		module.exports.error("[logger] Error while saving log to " + logFile + ": " + e);
	}
}

function registerLogFunction(i){
	module.exports[logLevels[i].name] = (...str) => {
		if(logLevel < logLevels[i].level)
			return;
		for(let s of str){
			log(logLevels[i].name, s, logLevels[i].color);
		}
	};
}

for(let i = 0; i < logLevels.length; i++){
	registerLogFunction(i);
}

module.exports.consoleLog = console.log;

module.exports.init = (loglevel, logfile) => {
	let lastSave = 0;

	console.log = (str) => {
		log("stdout", str);
	};
	logFile = logfile;
	if(logFile){
		setInterval(() => {
			let time = Date.now();
			let roundTime = time - time % logSaveIntervalTime;
			if(time - lastSave > logSaveIntervalTime){
				lastSave = roundTime;
				log_save();
			}
		}, 500).unref();
	}
	logLevel = loglevel;
	module.exports.debug("omz-lib version " + meta.version + " (log level " + loglevel + ")");
};

module.exports.close = () => {
	if(logFile){
		module.exports.info("[logger] Saving log to " + logFile);
		log_save();
	}
	clearInterval(logSaveInterval);
};

module.exports.getLogCache = () => {
	return logCache;
};

module.exports.setLogCallback = (handler) => {
	logMessageCallback = handler;
};

