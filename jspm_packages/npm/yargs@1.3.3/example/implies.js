/* */ 
var argv = require('../index').usage('Usage: $0 -x [num] -y [num]').implies('x', 'y').argv;
if (argv.x) {
  console.log(argv.x / argv.y);
}