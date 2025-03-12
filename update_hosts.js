const { EOL } = require('os')
const fs = require('fs')
const path = require('path')

let HOSTS_PATH = ''

if (process.platform === 'linux' || process.platform === 'darwin') {
    HOSTS_PATH = '/etc/hosts'
}
else if (process.platform === 'win32') {
    HOSTS_PATH = path.join(process.env.WINDIR, 'system32', 'drivers', 'etc', 'hosts');
}
else {
    console.error('Unsupported OS')
    return
}

const kongHost = '127.0.0.1 kong'
const kongExists = fs.readFileSync(HOSTS_PATH).toString().includes(kongHost)
if (kongExists) {
    console.log('Already exists')
    return
}

fs.appendFileSync(HOSTS_PATH, EOL + kongHost)