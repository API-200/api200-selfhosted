const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');
const { EOL } = require('os');
const path = require('path');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// ASCII art banner for welcome message
const welcomeBanner = `
╔═══════════════════════════════════════════════════╗
║                                                   ║
║               API-200 Self-Hosted                 ║
║               Setup Wizard v1.0                   ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`;

console.log(welcomeBanner);
console.log("Welcome to the API-200 self-hosted setup wizard!");
console.log("This script will help you configure your environment files and prepare your system for running API-200.");
console.log("Let's get started!\n");

// Function to get user input
function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

// Function to generate random string
function generateRandomString(length = 32, includeSpecialChars = false) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = includeSpecialChars ? chars + specialChars : chars;
    return Array.from(crypto.randomBytes(length))
        .map(byte => allChars[byte % allChars.length])
        .join('');
}

// Function to generate JWT
function generateJwt(secret, role, expiresIn = 3600) {
    const payload = {
        role: role,
        iss: 'supabase',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + expiresIn,
    };
    return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

// Function to check if running with root/admin privileges
function hasRootPrivileges() {
    try {
        if (process.platform === 'win32') {
            // For Windows, we can't easily check for admin rights in Node.js
            // So we'll assume not admin and provide clear instructions
            return false;
        } else {
            // For Unix-like systems, check if UID is 0 (root)
            return process.getuid() === 0;
        }
    } catch (e) {
        return false;
    }
}

// Function to update hosts file
function updateHostsFile() {
    console.log("\nUpdating hosts file to add Kong entry...");

    let HOSTS_PATH = '';

    if (process.platform === 'linux' || process.platform === 'darwin') {
        HOSTS_PATH = '/etc/hosts';
    } else if (process.platform === 'win32') {
        HOSTS_PATH = path.join(process.env.WINDIR, 'system32', 'drivers', 'etc', 'hosts');
    } else {
        console.error('❌ Unsupported OS for hosts file update');
        return false;
    }

    try {
        // Check if running as root/admin
        if (!hasRootPrivileges()) {
            console.error('\n❌ Error: Host file update requires root privileges.');
            console.log('Please run this script with sudo (Linux/Mac) or as an administrator (Windows).');
            console.log('\nManual Update Required:');
            console.log(`Add the following line to your hosts file (${HOSTS_PATH}):`);
            console.log('127.0.0.1 kong');
            return false;
        }

        const kongHost = '127.0.0.1 kong';
        const hostsContent = fs.readFileSync(HOSTS_PATH).toString();
        const kongExists = hostsContent.includes(kongHost);

        if (kongExists) {
            console.log('✅ Kong host entry already exists in your hosts file.');
            return true;
        }

        fs.appendFileSync(HOSTS_PATH, EOL + kongHost);
        console.log('✅ Successfully added Kong host entry to your hosts file.');
        return true;
    } catch (error) {
        console.error('\n❌ Error updating hosts file:', error.message);
        console.log('Manual Update Required:');
        console.log(`Add the following line to your hosts file (${HOSTS_PATH}):`);
        console.log('127.0.0.1 kong');
        return false;
    }
}

// Function to generate environment files
function generateEnvFiles(hostname) {
    try {
        const JWT_SECRET = generateRandomString(40);
        const SUPABASE_HOST = hostname === 'localhost' ? 'kong' : hostname;

        const randomValues = {
            POSTGRES_PASSWORD: generateRandomString(16),
            JWT_SECRET,
            ANON_KEY: generateJwt(JWT_SECRET, 'anon'),
            SERVICE_ROLE_KEY: generateJwt(JWT_SECRET, 'service_role'),
            DASHBOARD_USERNAME: 'supabase',
            DASHBOARD_PASSWORD: generateRandomString(16),
            SECRET_KEY_BASE: generateRandomString(64),
            VAULT_ENC_KEY: generateRandomString(32),
            LOGFLARE_LOGGER_BACKEND_API_KEY: generateRandomString(64),
            LOGFLARE_API_KEY: generateRandomString(64),
            POOLER_TENANT_ID: generateRandomString(16),
            ENCRYPTION_KEY: generateRandomString(64),
        };

        // Generate Supabase environment file
        const supabaseEnv = `
POSTGRES_PASSWORD=${randomValues.POSTGRES_PASSWORD}
JWT_SECRET=${randomValues.JWT_SECRET}
ANON_KEY=${randomValues.ANON_KEY}
SERVICE_ROLE_KEY=${randomValues.SERVICE_ROLE_KEY}
DASHBOARD_USERNAME=${randomValues.DASHBOARD_USERNAME}
DASHBOARD_PASSWORD=${randomValues.DASHBOARD_PASSWORD}
SECRET_KEY_BASE=${randomValues.SECRET_KEY_BASE}
VAULT_ENC_KEY=${randomValues.VAULT_ENC_KEY}
POOLER_TENANT_ID=${randomValues.POOLER_TENANT_ID}


############
# Database
############

POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432
# default user is postgres


############
# Supavisor -- Database pooler
############
POOLER_PROXY_PORT_TRANSACTION=6543
POOLER_DEFAULT_POOL_SIZE=20
POOLER_MAX_CLIENT_CONN=100


############
# API Proxy - Configuration for the Kong Reverse proxy.
############

KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443


############
# API - Configuration for PostgREST.
############

PGRST_DB_SCHEMAS=public,storage,graphql_public


############
# Auth - Configuration for the GoTrue authentication server.
############

## General
SITE_URL=http://${hostname === 'localhost' ? 'localhost' : hostname}:3000
ADDITIONAL_REDIRECT_URLS=
JWT_EXPIRY=3600
DISABLE_SIGNUP=false
API_EXTERNAL_URL=http://${hostname === 'localhost' ? 'localhost' : hostname}:8000

## Mailer Config
MAILER_URLPATHS_CONFIRMATION="/auth/v1/verify"
MAILER_URLPATHS_INVITE="/auth/v1/verify"
MAILER_URLPATHS_RECOVERY="/auth/v1/verify"
MAILER_URLPATHS_EMAIL_CHANGE="/auth/v1/verify"

## Email auth
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
SMTP_ADMIN_EMAIL=admin@example.com
SMTP_HOST=supabase-mail
SMTP_PORT=2500
SMTP_USER=fake_mail_user
SMTP_PASS=fake_mail_password
SMTP_SENDER_NAME=fake_sender
ENABLE_ANONYMOUS_USERS=false

## Phone auth
ENABLE_PHONE_SIGNUP=true
ENABLE_PHONE_AUTOCONFIRM=true


############
# Studio - Configuration for the Dashboard
############

STUDIO_DEFAULT_ORGANIZATION=Default Organization
STUDIO_DEFAULT_PROJECT=Default Project

STUDIO_PORT=3000
# replace if you intend to use Studio outside of localhost
SUPABASE_PUBLIC_URL=http://${hostname === 'localhost' ? 'localhost' : hostname}:8000

# Enable webp support
IMGPROXY_ENABLE_WEBP_DETECTION=true

# Add your OpenAI API key to enable SQL Editor Assistant
OPENAI_API_KEY=


############
# Functions - Configuration for Functions
############
# NOTE: VERIFY_JWT applies to all functions. Per-function VERIFY_JWT is not supported yet.
FUNCTIONS_VERIFY_JWT=false


############
# Logs - Configuration for Logflare
# Please refer to https://supabase.com/docs/reference/self-hosting-analytics/introduction
############

LOGFLARE_LOGGER_BACKEND_API_KEY=${randomValues.LOGFLARE_LOGGER_BACKEND_API_KEY}

# Change vector.toml sinks to reflect this change
LOGFLARE_API_KEY=${randomValues.LOGFLARE_API_KEY}

# Docker socket location - this value will differ depending on your OS
DOCKER_SOCKET_LOCATION=/var/run/docker.sock

# Google Cloud Project details
GOOGLE_PROJECT_ID=GOOGLE_PROJECT_ID
GOOGLE_PROJECT_NUMBER=GOOGLE_PROJECT_NUMBER
`;

        // Generate Frontend environment file
        const frontendEnv = `
NEXT_PUBLIC_SUPABASE_URL=http://${SUPABASE_HOST}:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=${randomValues.ANON_KEY}
NEXT_PUBLIC_BACKEND_URL=http://${hostname}:8080
NEXT_PUBLIC_IS_SELFHOSTED=true
REDIS_URL=redis://redis:6379
ENCRYPTION_KEY=${randomValues.ENCRYPTION_KEY}
`;

        // Generate Backend environment file
        const backendEnv = `
NODE_ENV=production
PORT=8080
IS_SELFHOSTED=true

SUPABASE_URL=http://${SUPABASE_HOST}:8000
SUPABASE_SERVICE_ROLE_KEY=${randomValues.SERVICE_ROLE_KEY}

ENCRYPTION_KEY=${randomValues.ENCRYPTION_KEY}

POSTGRES_PASSWORD=${randomValues.POSTGRES_PASSWORD}
POOLER_TENANT_ID=${randomValues.POOLER_TENANT_ID}

REDIS_URL=redis://redis:6379
`;

        // Write files
        fs.writeFileSync('.env', supabaseEnv);
        fs.writeFileSync('frontend.env', frontendEnv);
        fs.writeFileSync('backend.env', backendEnv);

        console.log('\n✅ Environment files have been generated successfully!');

        return {
            success: true,
            credentials: {
                username: randomValues.DASHBOARD_USERNAME,
                password: randomValues.DASHBOARD_PASSWORD
            }
        };
    } catch (error) {
        console.error('\n❌ Failed to generate environment files:', error.message);
        return { success: false, error: error.message };
    }
}

// Main function to run the setup
async function runSetup() {
    let setupStatus = {
        envFiles: false,
        hostsFile: true // Default to true, will be set to false if needed and using localhost
    };

    try {
        // Ask if using localhost
        const useLocalhost = await askQuestion("Will you be running docker on localhost for development? (y/n): ");

        let hostname = '';
        if (useLocalhost.toLowerCase() === 'y' || useLocalhost.toLowerCase() === 'yes') {
            hostname = 'localhost';
            console.log('\nConfiguring for localhost development...');
        } else {
            hostname = await askQuestion("Please enter your domain or machine IP address: ");
            hostname = hostname.replace(/^https?:\/\//, '').trim();

            if (!hostname) {
                console.error("\n❌ Error: Domain or IP address cannot be empty.");
                process.exit(1);
            }

            console.log(`\nConfiguring for domain/IP: ${hostname}`);
        }

        // Generate environment files
        const envResult = generateEnvFiles(hostname);
        setupStatus.envFiles = envResult.success;

        // Update hosts file if using localhost
        if (hostname === 'localhost') {
            setupStatus.hostsFile = updateHostsFile();

            if (!setupStatus.hostsFile) {
                console.log('\n⚠️ The hosts file was not updated. You have two options:');
                console.log('   1. Run this script again with administrator privileges:');
                console.log('      $ sudo node setup.js');
                console.log('   2. Manually add this line to your hosts file:');
                console.log('      127.0.0.1 kong');
            }
        }

        // Final status and next steps
        if (setupStatus.envFiles) {
            console.log('\n' + (setupStatus.hostsFile ? '✅' : '⚠️') + ' Setup completed' +
                (setupStatus.hostsFile ? ' successfully!' : ' with warnings!'));

            if (hostname === 'localhost' && !setupStatus.hostsFile) {
                console.log('\n⚠️ IMPORTANT: The Kong host entry is missing from your hosts file.');
                console.log('   You must add it manually before starting the services!');
            }

            console.log('\nTo start the API-200 services, run:');
            console.log('  $ docker-compose up -d');
            console.log('\nTo verify services are running correctly:');
            console.log('  $ docker-compose ps');
            console.log('  or');
            console.log('  $ docker ps');

            console.log('\nYou can access:');
            console.log(`- API-200 Frontend: http://${hostname}:3000`);
            console.log(`- API-200 Api Handler: http://${hostname}:8080`);
        } else {
            console.log('\n❌ Setup failed. Please check the errors above and try again.');
        }
    } catch (error) {
        console.error('\n❌ An error occurred during setup:', error.message);
    } finally {
        rl.close();
    }
}

// Run the setup process
runSetup();
