const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

String.prototype.colorText = function(color) {
  return color + this + '\x1b[0m';
}

function getDirectories(srcPath) {
  return fs.readdirSync(srcPath)
    .filter(file => fs.statSync(path.join(srcPath, file)).isDirectory());
}

const args = process.argv.slice(2); // Remove node and script paths
const inputString = args[0]; // Access the first argument

console.log('Search target:', inputString);
const directories = getDirectories('.');
function combineObjects(arr) {
  return arr.reduce((prv, cur) => {
    cur.forEach(curObj => {
      Object.keys(curObj).forEach(f => {
        prv[f] = prv[f] || [];
        prv[f].push(curObj[f]);
      });
    });
    return prv;
  }, {});
}

const colors = [
  '\x1b[31m', // red
  '\x1b[32m', // green
  '\x1b[33m', // yellow
  '\x1b[34m', // blue
  '\x1b[35m', // magenta
  '\x1b[36m', // cyan
];

Promise.all(directories.map(targetDirectory => checkBranchMatch(inputString, targetDirectory))).then(results => {
  const resObj = combineObjects(results);
  if(args.slice(1).some(item => ['--c', '-checkout', 'c'].includes(item))) {
    Object.keys(resObj).forEach((f, i) => {
      if(f === inputString) {
        console.log(`checkout branch...`.colorText(colors[1]));
        console.log(f.colorText(colors[1]));
        const checkoutTasks = resObj[f].map(directory => {
          return exec(`git checkout ${f}`, { cwd: directory }, (error, stdout, stderr) => {
            if (error) {
              console.log({error});
              return;
            }
            console.log(`success: ${directory}`.colorText(colors[3]));
            exec(`git pull`, { cwd: directory }, (error, stdout, stderr) => {
              if (error) {
                console.log({error});
                return;
              }
            });
          });

        });
        Promise.all(checkoutTasks);
      }
    });
  }

  if(args.slice(1).some(item => ['--o', '-open', 'o'].includes(item))) {
    Object.keys(resObj).forEach((f, i) => {
      if(f === inputString) {
        console.log(`opening...`.colorText(colors[1]));
        const openTasks = resObj[f].map(directory => {
          return exec(`code .`, { cwd: directory }, (error, stdout, stderr) => {
            if (error) {
              console.log({error});
              return;
            }
            console.log(`open success: ${directory}`.colorText(colors[3]));
          });

        });
        Promise.all(openTasks);
      }
    });
  }

  const l = 'Branch: '.length;
  Object.keys(resObj).forEach((f, i) => {
    const color = colors[i % 2 === 0 ? 1 : 3];
    console.log(`<${'-'.repeat(l + f.length)}>`.colorText(colors[2]));
    console.log('Branch: '.colorText(colors[0]) + f.colorText(color));
    console.log(`Folder:`.colorText(colors[0]));
    resObj[f].forEach(directory => console.log(directory.colorText(color)));
  });
});

function checkBranchMatch(targetString, targetDirectory) {
  return new Promise((resolve, reject) => {
    exec('git fetch', { cwd: targetDirectory }, (error, stdout, stderr) => {
        exec('git branch -r --list', { cwd: targetDirectory }, (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }
          
          const branches = stdout.trim().split('\n');
          const matchingBranches = branches.filter(branch => branch.includes(targetString));
    
          if (matchingBranches.length > 0) {
            const result = matchingBranches.map(br => {
              return {
                [br.trim().replace('origin/', '')]: targetDirectory
              };
            });
            resolve(result);
          } else {
            resolve([]);
          }
        });
    });
  });
}