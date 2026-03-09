#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
RESET='\033[0m'

# ─── Header ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}  cf-hono-react-template${RESET}"
echo -e "${DIM}  Cloudflare Workers · Hono · React · TanStack${RESET}"
echo ""

# ─── Default project name from current directory ──────────────────────────────
DEFAULT_NAME="$(basename "$(pwd)")"

# ─── Prompt for project name ──────────────────────────────────────────────────
read -r -p "$(echo -e "  ${BOLD}Project name${RESET} ${DIM}[${DEFAULT_NAME}]${RESET}: ")" INPUT_NAME
PROJECT_NAME="${INPUT_NAME:-$DEFAULT_NAME}"

# ─── Validate: lowercase, alphanumeric + dashes, no leading/trailing dash ─────
if ! echo "$PROJECT_NAME" | grep -qE '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'; then
  echo ""
  echo -e "  ${RED}Error:${RESET} Project name must be lowercase, start and end with a letter or digit,"
  echo -e "         and may only contain letters, digits, and dashes (e.g. ${BOLD}my-app${RESET})."
  echo ""
  exit 1
fi

echo ""
echo -e "  Setting up ${BOLD}${PROJECT_NAME}${RESET}..."
echo ""

# ─── Replace {{PROJECT_NAME}} placeholders across config files ────────────────
FILES=(
  "apps/api/wrangler.jsonc"
  "apps/admin/wrangler.jsonc"
  "apps/app/wrangler.jsonc"
  ".github/workflows/deploy.yml"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    perl -i -pe "s/cf-hr-template/${PROJECT_NAME}/g" "$FILE"
  fi
done

# ─── Remove template-only files ───────────────────────────────────────────────
for F in AGENTS.md CLAUDE.md GEMINI.md bun-create.sh; do
  [ -f "$F" ] && rm -f "$F"
done

# ─── Copy environment variable templates ─────────────────────────────────────
echo -e "  ${CYAN}Copying environment variable templates...${RESET}"
[ -f "apps/api/.dev.vars.example" ] && cp "apps/api/.dev.vars.example" "apps/api/.dev.vars"
[ -f "apps/api/.env.example" ] && cp "apps/api/.env.example" "apps/api/.env"
[ -f "apps/admin/.env.example" ] && cp "apps/admin/.env.example" "apps/admin/.env"
[ -f "apps/app/.env.example" ] && cp "apps/app/.env.example" "apps/app/.env"
echo ""

# ─── Install dependencies ─────────────────────────────────────────────────────
echo -e "  ${CYAN}Installing dependencies...${RESET}"
bun install --frozen-lockfile 2>&1 | sed 's/^/  /'
echo ""

# ─── Generate Prisma client ───────────────────────────────────────────────────
echo -e "  ${CYAN}Generating Prisma client...${RESET}"
bun run db:generate 2>&1 | sed 's/^/  /'
echo ""

# ─── Init git ─────────────────────────────────────────────────────────────────
echo -e "  ${CYAN}Initialising git repository...${RESET}"
git init -q
git add .
git commit -q -m "chore: initial commit"
echo ""

# ─── Next steps ───────────────────────────────────────────────────────────────
echo -e "  ${GREEN}${BOLD}Project ready!${RESET}"
echo ""
echo -e "  ${BOLD}Next steps${RESET}"
echo ""
echo -e "  ${DIM}1.${RESET} Enter your project directory"
echo -e "     ${DIM}\$${RESET} cd ${PROJECT_NAME}"
echo ""
echo -e "  ${DIM}2.${RESET} Fill in environment variables"
echo -e "     ${DIM}  apps/api/.dev.vars, apps/api/.env, apps/admin/.env, and apps/app/.env have been created for you.${RESET}"
echo -e "     ${DIM}  Edit the files and fill in the required values.${RESET}"
echo ""
echo -e "  ${DIM}3.${RESET} Create Cloudflare D1 databases, then copy the ${BOLD}database_id${RESET} values"
echo -e "     ${DIM}  into apps/api/wrangler.jsonc${RESET}"
echo -e "     ${DIM}\$${RESET} bunx wrangler d1 create ${PROJECT_NAME}-dev"
echo -e "     ${DIM}\$${RESET} bunx wrangler d1 create ${PROJECT_NAME}-prod"
echo ""
echo -e "  ${DIM}4.${RESET} Apply DB migrations locally"
echo -e "     ${DIM}\$${RESET} cd apps/api && bunx wrangler d1 migrations apply ${PROJECT_NAME}-dev --local && cd ../"
echo ""
echo -e "  ${DIM}5.${RESET} Start development servers"
echo -e "     ${DIM}\$${RESET} bun run dev"
echo ""
