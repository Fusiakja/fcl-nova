const fs = require('fs-extra');
const fsfiles = require('fs');
var additionalfiles =fsfiles.readdirSync('./docs/');
var additionalfile = [];
additionalfiles.forEach(element => {
    if(element.includes(".js") && !element.includes("scripts.js") && !element.includes('main.js') && !element.includes("polyfills.js") && !element.includes("polyfill-webcomp-es5.js"))
    {
        additionalfile.push(element);
    }
});
console.log(additionalfile);
const concat = require('concat');

concatenate = async () =>{
    const files = [
        './docs/polyfill-webcomp-es5.js',
        './docs/polyfills.js',
        './docs/scripts.js',
        './docs/main.js'
      ];

      await fs.ensureDir('output');
      await concat(files, 'output/fcl-nova.js');
      await fs.copy('./docs/assets/', 'output/assets/' )

      for (const element of additionalfile) {
          await fs.copyFile('./docs/'+element, 'output/'+element);   
      }
     

}
concatenate();