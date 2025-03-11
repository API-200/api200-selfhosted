const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { EOL } = require("os");

const HOSTNAME = process.argv[2];
const JWT_SECRET = generateRandomString(40);

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

function generateRandomString(length = 32, includeSpecialChars = false) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = includeSpecialChars ? chars + specialChars : chars;
    return Array.from(crypto.randomBytes(length))
        .map(byte => allChars[byte % allChars.length])
        .join('');
}

function generateJwt(secret, role, expiresIn = 3600) {
    const payload = {
        role: role,
        iss: 'supabase',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + expiresIn,
    };
    return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

function generateSupabaseEnv() {
    const template = `
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
SITE_URL=http://localhost:3000
ADDITIONAL_REDIRECT_URLS=
JWT_EXPIRY=3600
DISABLE_SIGNUP=false
API_EXTERNAL_URL=http://localhost:8000

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
SUPABASE_PUBLIC_URL=http://localhost:8000

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
    return template;
}

function generateFrontendEnv() {
    return `
NEXT_PUBLIC_SUPABASE_URL=http://${HOSTNAME}:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=${randomValues.ANON_KEY}
REDIS_URL=redis://redis:6379
BACKEND_URL=http://${HOSTNAME}:8080
`;
}

function generateBackendEnv() {
    return `
NODE_ENV=production
PORT=8080

#SUPABASE
SUPABASE_URL=http://${HOSTNAME}:8000
SUPABASE_SERVICE_ROLE_KEY=${randomValues.SERVICE_ROLE_KEY}
REDIS_URL=redis://redis:6379

ENCRYPTION_KEY=${randomValues.ENCRYPTION_KEY}

POSTGRES_PASSWORD=${randomValues.POSTGRES_PASSWORD}
POOLER_TENANT_ID=${randomValues.POOLER_TENANT_ID}
`;
}

void function () {
    fs.writeFileSync('.env', generateSupabaseEnv());

    fs.writeFileSync('frontend.env', generateFrontendEnv());

    fs.writeFileSync('backend.env', generateBackendEnv());

    if (process.platform === 'linux') {
        const kongExists = fs.readFileSync('/etc/hosts').toString().includes('kong');
        if (!kongExists) {
            fs.appendFileSync('/etc/hosts', EOL + '127.0.0.1 kong');
        }
    }
}()