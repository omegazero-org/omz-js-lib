
let modules = [
	"meta",
	"util",
	"logger",
	"args",
	"httpapi"
];

for(let s of modules){
	module.exports[s] = require("./" + s);
}
