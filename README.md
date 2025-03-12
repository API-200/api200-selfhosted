# API-200 Self-Hosted

This repository contains the necessary files and instructions to self-host the API-200 application. Below are the steps to set up and run the application on your local machine or server.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Docker**
- **Docker Compose**
- **Node.js**
- **Npm**

## Setup

```bash
git clone https://github.com/API-200/api200-selfhosted
cd api200-selfhosted
npm i
node create_env.js <MACHINE_PUBLIC_IP / DOMAIN>
docker-compose up -d
```