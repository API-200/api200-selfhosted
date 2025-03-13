# API-200 Self-Hosted

This repository contains the necessary files and instructions to self-host the API-200 application.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Docker**
- **Docker Compose**
- **Node.js**
- **npm**

## Setup

1. Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/API-200/api200-selfhosted

# Navigate to the project directory
cd api200-selfhosted

# Install dependencies
npm i
```

2. Run the setup script:

```bash
# For localhost development (recommended to run with admin privileges):
sudo node setup.js

# For non-localhost deployment:
node setup.js
```

> **⚠️ Important Note for localhost development:**
> When developing on localhost, the setup script needs to update your hosts file to add `127.0.0.1 kong`.
> This requires root/administrator privileges. If you don't run the script with these privileges, you'll need to manually update your hosts file.

## Starting the Services

After completing the setup, start the services with:

```bash
docker-compose up -d
```

## Verifying the Installation

To check if all services are running correctly:

```bash
# View all running containers and their status
docker-compose ps

# Or using Docker directly
docker ps
```

## Accessing the Application

Once all services are running, you can access:

- API-200 Frontend: `http://<your-hostname-or-ip>:3000`
- API-200 Api Handler: `http://<your-hostname-or-ip>:8080`

## License

Apache License 2.0
