'use strict';

const fs = require('fs');
const program = require('commander');

program
.version('0.0.1')
.command('usage')
.description('display usage information')
.action(function() {
	console.log('Name\n\tgivemejson - for those times when all you wanted was some nice warm JSON');
	console.log('Usage\n\tgivemejson [options] [notjson] [yayjson]');
});

program
  .option('-s, --separator <sep>', 'Specify the separator used in the input (default is tab)')
	.option('-S, --output-separator <sep>', 'Specify the separtor use in the output (default is tab)')
	.option('-l, --line <line>', 'Specify the line end used (default is \\n)')
	.option('-N, --no-column-names', 'The data will be treated as if the first line were not the column titles')
	.option('-T, --dry-run', 'Just show the output filename and options')
	.option('-c, --columns [title]', 'The column titles to include in the output', list)
	.option('-r, --range <a>..<b>', 'The range (inclusive, row indices start at 1) of row indices to include in the output', range);


program.parse(process.argv);

if (!program.args.length) {
	program.help();
	process.exit(1);
}

// options
const separator = toSpecial(program.separator) || '\t';
const outseparator = toSpecial(program.outputSeparator) || '\t';
const lineend = toSpecial(program.line) || '\n';
const columns = program.columns;
const notitles = !program.columnNames;
const dryrun = program.dryRun;
const rowRange = program.range;

// get input and output file names
let infile = program.args[0];
let outfile = program.args[1] || infile.split('.')[0] + '.json';

// print out the received arguments and options then exit
if (dryrun) {
	console.log(`Separator: ${JSON.stringify(separator)}`);
	console.log(`Output Separator: ${JSON.stringify(outseparator)}`);
	console.log(`Line End: ${JSON.stringify(lineend)}`);
	console.log(`Columns: ${columns ? columns.join(' ') : ''}`);
	console.log(`No Column Names: ${JSON.stringify(!!notitles)}`);
	console.log(`Range: ${rowRange.toString()}`)
	console.log(`Input File: ${infile}`);
	console.log(`Output File: ${outfile}`);
	process.exit(0);
	return;
}

// get input data as string
let data = fs.readFileSync(infile).toString();

// parse into an object
let parsed = parser(data, separator, lineend, columns);

let buffer = new Buffer(JSON.stringify(parsed, null, outseparator));
let out = fs.createWriteStream(`./${outfile}`);
out.write(buffer);
out.end();

/**
 * Parse the input string into an object
 * @param  	{string} data 			- the string to parse
 * @param 	{string} delimiter 	- the delimiter separating fields
 * @param 	{string} lineEnd 		- the end of line representation
 * @return 	{object}      			- the resulting object
 */
function parser (data, delimiter, lineEnd, columnTitles) {
	const fieldRE = new RegExp(delimiter);
	const lineRE = new RegExp(lineEnd);
	// split on end of line
	let lines = data.split(lineRE).filter(line => line && line.trim());
	// get the titles
	let titles = lines.splice(0, 1)[0].split(fieldRE);
	columnTitles = columnTitles || titles;

	lines = lines.map((line, i) => {
		if (rowRange && (i+1 < rowRange[0] || i+1 > rowRange[1])) {
			return;
		}
		// split the line into fields
		let fields = line.split(fieldRE);

		// if no titles, output will be an array of arrays
		if (notitles) {
			return fields;
		}
		// output will be an array of objects
		else {
			let record = Object.create(null);
			// assign the values to the corresponding fields
			titles.forEach((title, j) => {
				if (columnTitles.includes(title)) {
					record[title] = fields[j];
				}
			});
			return record;
		}
	})
	.filter(line => !!line);
	return lines;
}

/**
 * Split a command separated list
 * @param  {string} val comma separated list
 * @return {array}     - array of values in list
 */
function list(val) {
  return val.split(',');
}

/**
 * Split the input on .. and return an array of numbers
 * @param  {string} val - a string in the form of N..N
 * @return {array}     - an array containing numbers
 */
function range(val) {
  return val.split('..').map(Number);
}

/**
 * Spits out special fomatting characters
 * @param  {string} code n, t, s, \x, or unicode u0000
 * @return {string}      - special character interpretation of the input
 */
function toSpecial(code) {
	if (!code) {
		return;
	}

	if (code === 'n') {
		return '\n';
	}
	else if (code === 't') {
		return '\t';
	}
	else if (code === 's') {
		return ' ';
	}
	else if (code.charAt(0) === '\\') {
		return JSON.parse('"' + code + '"');
	}
	else if (code.charAt(0) === 'u') {
		return JSON.parse('"\\' + code + '"');
	}
	else {
		return code;
	}
}
