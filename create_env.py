import secrets
import string
import jwt
import sys
import os
from datetime import datetime, timedelta, UTC

HOSTNAME = sys.argv[1]
SUPABASE_HOST = 'kong'

def generate_random_string(length=32, include_special_chars=False):
    chars = string.ascii_letters + string.digits
    if include_special_chars:
        chars += "!@#$%^&*()_+-=[]{}|;:,.<>?"
    return ''.join(secrets.choice(chars) for _ in range(length))

def generate_jwt(secret, role, expires_in=3600):
    payload = {
        "role": role,
        "iss": "supabase",
        "iat": int(datetime.now(UTC).timestamp()),
        "exp": int((datetime.now(UTC) + timedelta(seconds=expires_in)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def generate_random_values():
    jwt_secret = generate_random_string(40)
    return {
        "POSTGRES_PASSWORD": generate_random_string(16),
        "JWT_SECRET": jwt_secret,
        "ANON_KEY": generate_jwt(jwt_secret, "anon"),
        "SERVICE_ROLE_KEY": generate_jwt(jwt_secret, "service_role"),
        "DASHBOARD_USERNAME": "supabase",
        "DASHBOARD_PASSWORD": generate_random_string(16),
        "SECRET_KEY_BASE": generate_random_string(64),
        "VAULT_ENC_KEY": generate_random_string(32),
        "LOGFLARE_LOGGER_BACKEND_API_KEY": generate_random_string(64),
        "LOGFLARE_API_KEY": generate_random_string(64),
        "POOLER_TENANT_ID": generate_random_string(16),
        "ENCRYPTION_KEY": generate_random_string(64),
    }

def generate_supabase_env(random_values):
    template = """
POSTGRES_PASSWORD={POSTGRES_PASSWORD}
JWT_SECRET={JWT_SECRET}
ANON_KEY={ANON_KEY}
SERVICE_ROLE_KEY={SERVICE_ROLE_KEY}
DASHBOARD_USERNAME={DASHBOARD_USERNAME}
DASHBOARD_PASSWORD={DASHBOARD_PASSWORD}
SECRET_KEY_BASE={SECRET_KEY_BASE}
VAULT_ENC_KEY={VAULT_ENC_KEY}
POOLER_TENANT_ID={POOLER_TENANT_ID}


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

LOGFLARE_LOGGER_BACKEND_API_KEY={LOGFLARE_LOGGER_BACKEND_API_KEY}

# Change vector.toml sinks to reflect this change
LOGFLARE_API_KEY={LOGFLARE_API_KEY}

# Docker socket location - this value will differ depending on your OS
DOCKER_SOCKET_LOCATION=/var/run/docker.sock

# Google Cloud Project details
GOOGLE_PROJECT_ID=GOOGLE_PROJECT_ID
GOOGLE_PROJECT_NUMBER=GOOGLE_PROJECT_NUMBER
"""
    # Replace placeholders in the template
    config_string = template.format(**random_values)
    return config_string


def generate_frontend_env(random_values):
    return f"""
NEXT_PUBLIC_SUPABASE_URL=http://{SUPABASE_HOST}:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY={{ANON_KEY}}
REDIS_URL=redis://redis:6379
BACKEND_URL=http://{HOSTNAME}:8080
""".format(**random_values)

def generate_backend_env(random_values):
    return f"""
NODE_ENV=production
PORT=8080

#SUPABASE
SUPABASE_URL=http://{SUPABASE_HOST}:8000
SUPABASE_SERVICE_ROLE_KEY={{SERVICE_ROLE_KEY}}
REDIS_URL=redis://redis:6379

ENCRYPTION_KEY={{ENCRYPTION_KEY}}

POSTGRES_PASSWORD={{POSTGRES_PASSWORD}}
POOLER_TENANT_ID={{POOLER_TENANT_ID}}
""".format(**random_values)

# Main function to generate and print the config
if __name__ == "__main__":
    random_values = generate_random_values()

    # supabase env
    with open('.env', 'w') as f:
        f.write(generate_supabase_env(random_values))
    
    # frontend env
    with open('frontend.env', 'w') as f:
        f.write(generate_frontend_env(random_values))

    # backend env
    with open('backend.env', 'w') as f:
        f.write(generate_backend_env(random_values))

    # add host to /etc/hosts
    with open('/etc/hosts', 'a') as f:
        f.write(os.linesep + '127.0.0.1 kong')
