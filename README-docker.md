# Docker: Build and Run (Windows PowerShell)

This file describes how to build the Docker image and run the `ouhsojvp` container for the Smart Factory project.

Prerequisites
- Docker Desktop installed and running
- (Optional) Docker Compose v1 or v2

Using docker-compose (recommended)
1. Create an environment file or set SESSION_SECRET in your shell. Example PowerShell (set only for current session):

```powershell
$env:SESSION_SECRET = 'a_really_long_session_secret_here';
docker compose up -d --build
```

2. To stop and remove containers:

```powershell
docker compose down
```

Using plain docker build/run
1. Build image and start container (PowerShell):

```powershell
docker build -t ouhsojvp:latest .
docker run -d --name ouhsojvp -p 3000:3000 -e SESSION_SECRET='a_really_long_session_secret_here' -e DB_PATH=/home/node/app/data/smart_factory.db -e SESSION_DIR=/home/node/app/data -v ${PWD}\data:/home/node/app/data ouhsojvp:latest
```

Notes
- The app uses SQLite for the database and will create `smart_factory.db` in the mounted `data` directory. The docker-compose file maps `./data` to `/home/node/app/data` and sets environment variables accordingly.
- The server reads `SESSION_SECRET` from environment variables and will refuse to start without it.
- If you want to use a different port, change the `PORT` env var and the `3000:3000` mapping.

Troubleshooting
- If you see a message about a missing `SESSION_SECRET`, set it with a secure value before launching containers.
- To view logs:

```powershell
docker compose logs -f
# or
docker logs -f ouhsojvp
```

Change image name
- The image is tagged as `ouhsojvp:latest`. Replace the image name in `docker-compose.yml` and build/run commands if you prefer a different name.

Push to a registry (optional)
1. Tag and push to Docker Hub (replace <username> and <tag>):

```powershell
docker tag ouhsojvp:latest <username>/ouhsojvp:latest
docker push <username>/ouhsojvp:latest
```

2. Pull and run from another host:

```powershell
docker run -d --name ouhsojvp -p 3000:3000 -e SESSION_SECRET='...' <username>/ouhsojvp:latest

GitHub Actions
- The repository contains a workflow to automatically build and push an image on push to `main` (or when a tag matching `v*` is created).
- The workflow file: `.github/workflows/docker-build-and-push.yml`

Secrets required by workflow
- `DOCKER_USERNAME` — Username for your container registry (Docker Hub username or username for GHCR as appropriate)
- `DOCKER_PASSWORD` — Password/token for the registry user (for GHCR you can use a Personal Access Token or `GITHUB_TOKEN`)

How it works
- On push to `main` or when creating a version tag like `v1.0.0`, the workflow will build and push image tags `latest`, `<commit-sha>`, and the tag name.
- It uses Docker buildx and caches build layers into the remote registry for faster subsequent builds.

To set secrets
1. In GitHub, go to your repository → Settings → Secrets → Actions → New repository secret
2. Add `DOCKER_USERNAME` and `DOCKER_PASSWORD` (or set `DOCKER_REGISTRY` if using `ghcr.io`)

```
