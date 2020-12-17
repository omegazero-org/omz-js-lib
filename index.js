
let modules = [
	"meta",
	"util",
	"logger",
	"args"
];

for(let s of modules){
	module.exports[s] = require("./" + s);
}
