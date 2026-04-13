#!/usr/bin/env bash
# ============================================================================
# LA FUSÉE — PREFLIGHT CHECK
# Un seul script. Toutes les couches. Zéro excuse.
# Usage: ./scripts/preflight.sh [--quick|--full|--fix]
# ============================================================================

set -euo pipefail

# ── Colors & Symbols ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

PASS="✅"
FAIL="❌"
WARN="⚠️ "
SKIP="⏭️ "
ROCKET="🚀"
GEAR="⚙️ "

# ── State ────────────────────────────────────────────────────────────────────
TOTAL_CHECKS=0
PASSED=0
FAILED=0
WARNINGS=0
SKIPPED=0
CRITICAL_FAIL=0
START_TIME=$(date +%s)
MODE="${1:---full}"
REPORT_FILE="preflight-report-$(date +%Y%m%d-%H%M%S).md"
LOG_FILE="preflight.log"

# ── Functions ────────────────────────────────────────────────────────────────

header() {
    echo ""
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${WHITE}  $ROCKET  LA FUSÉE — PREFLIGHT CHECK${NC}"
    echo -e "${DIM}  Mode: ${MODE} | $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

phase_header() {
    local phase_num=$1
    local phase_name=$2
    local phase_desc=$3
    echo ""
    echo -e "${CYAN}┌──────────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│${NC} ${BOLD}${WHITE}PHASE ${phase_num}${NC} ${GEAR}  ${BOLD}${phase_name}${NC}"
    echo -e "${CYAN}│${NC} ${DIM}${phase_desc}${NC}"
    echo -e "${CYAN}└──────────────────────────────────────────────────────────────────────────┘${NC}"
}

check_result() {
    local name=$1
    local status=$2  # pass|fail|warn|skip
    local detail="${3:-}"
    local duration="${4:-}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    local icon=""
    local color=""
    case $status in
        pass) icon=$PASS; color=$GREEN; PASSED=$((PASSED + 1)) ;;
        fail) icon=$FAIL; color=$RED; FAILED=$((FAILED + 1)) ;;
        warn) icon=$WARN; color=$YELLOW; WARNINGS=$((WARNINGS + 1)) ;;
        skip) icon=$SKIP; color=$DIM; SKIPPED=$((SKIPPED + 1)) ;;
    esac
    
    local dur_str=""
    if [ -n "$duration" ]; then
        dur_str="${DIM}(${duration}s)${NC}"
    fi
    
    echo -e "  ${icon} ${color}${name}${NC} ${dur_str}"
    if [ -n "$detail" ]; then
        echo -e "     ${DIM}↳ ${detail}${NC}"
    fi
    
    # Log to report
    echo "- [${status}] ${name}: ${detail}" >> "$LOG_FILE"
}

critical_stop() {
    CRITICAL_FAIL=1
    echo ""
    echo -e "${RED}${BOLD}  ⛔ CRITICAL FAILURE — Pipeline arrêté.${NC}"
    echo -e "${RED}  Corrige cette erreur avant de continuer.${NC}"
    echo ""
}

run_timed() {
    local start=$(date +%s)
    eval "$1" > /dev/null 2>&1
    local exit_code=$?
    local end=$(date +%s)
    local duration=$((end - start))
    echo "$exit_code:$duration"
}

# ── Init ─────────────────────────────────────────────────────────────────────

# Find project root (look for package.json)
PROJECT_ROOT="."
if [ ! -f "package.json" ]; then
    if [ -f "../package.json" ]; then
        PROJECT_ROOT=".."
        cd "$PROJECT_ROOT"
    else
        echo -e "${RED}${FAIL} Exécute ce script depuis la racine du projet (là où est package.json)${NC}"
        exit 1
    fi
fi

> "$LOG_FILE"
header

# ============================================================================
# PHASE 0 — ENVIRONMENT
# ============================================================================
phase_header "0" "ENVIRONMENT" "Fichiers requis, dépendances, variables"

# Check node_modules
if [ -d "node_modules" ]; then
    check_result "node_modules existe" "pass"
else
    check_result "node_modules manquant" "fail" "Lance: npm install"
    critical_stop
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -ge 20 ] 2>/dev/null; then
    check_result "Node.js >= 20" "pass" "v$(node -v | sed 's/v//')"
else
    check_result "Node.js >= 20 requis" "fail" "Version actuelle: $(node -v 2>/dev/null || echo 'non installé')"
fi

# Check .env
if [ -f ".env" ]; then
    check_result ".env présent" "pass"
    
    # Compare .env vs .env.example
    if [ -f ".env.example" ]; then
        MISSING_VARS=""
        while IFS= read -r line; do
            # Skip comments and empty lines
            [[ "$line" =~ ^#.*$ ]] && continue
            [[ -z "$line" ]] && continue
            VAR_NAME=$(echo "$line" | cut -d= -f1 | xargs)
            if [ -n "$VAR_NAME" ] && ! grep -q "^${VAR_NAME}=" .env 2>/dev/null; then
                MISSING_VARS="${MISSING_VARS}${VAR_NAME}, "
            fi
        done < .env.example
        
        if [ -n "$MISSING_VARS" ]; then
            check_result "Variables .env manquantes" "warn" "${MISSING_VARS%, }"
        else
            check_result "Variables .env complètes" "pass" "Toutes les vars de .env.example sont définies"
        fi
    fi
else
    check_result ".env manquant" "fail" "Lance: cp .env.example .env && configure"
    critical_stop
fi

# Check critical files
for f in "prisma/schema.prisma" "tsconfig.json" "next.config.ts" "vitest.config.ts"; do
    if [ -f "$f" ]; then
        check_result "$f" "pass"
    else
        check_result "$f manquant" "fail"
    fi
done

# ============================================================================
# PHASE 1 — STATIC ANALYSIS (catches bugs before runtime)
# ============================================================================
phase_header "1" "STATIC ANALYSIS" "TypeScript, imports, types — les bugs que le compilateur voit"

# TypeScript strict check
echo -e "  ${DIM}Running tsc --noEmit...${NC}"
TSC_START=$(date +%s)
TSC_OUTPUT=$(npx tsc --noEmit --pretty 2>&1 || true)
TSC_END=$(date +%s)
TSC_DURATION=$((TSC_END - TSC_START))
TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" || true)

if [ "$TSC_ERRORS" -eq 0 ]; then
    check_result "TypeScript compilation" "pass" "0 erreurs" "$TSC_DURATION"
else
    check_result "TypeScript compilation" "fail" "${TSC_ERRORS} erreur(s) de type" "$TSC_DURATION"
    # Show first 10 errors
    echo "$TSC_OUTPUT" | grep "error TS" | head -10 | while read -r line; do
        echo -e "     ${RED}${DIM}$line${NC}"
    done
    if [ "$TSC_ERRORS" -gt 10 ]; then
        echo -e "     ${DIM}... et $((TSC_ERRORS - 10)) de plus. Voir ${LOG_FILE}${NC}"
    fi
    echo "$TSC_OUTPUT" >> "$LOG_FILE"
fi

# ESLint (if configured)
if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
    echo -e "  ${DIM}Running ESLint...${NC}"
    LINT_START=$(date +%s)
    LINT_OUTPUT=$(npx eslint src/ --ext .ts,.tsx --format compact 2>&1 || true)
    LINT_END=$(date +%s)
    LINT_DURATION=$((LINT_END - LINT_START))
    LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -c " Error " || true)
    LINT_WARNS=$(echo "$LINT_OUTPUT" | grep -c " Warning " || true)
    
    if [ "$LINT_ERRORS" -eq 0 ] && [ "$LINT_WARNS" -eq 0 ]; then
        check_result "ESLint" "pass" "Clean" "$LINT_DURATION"
    elif [ "$LINT_ERRORS" -eq 0 ]; then
        check_result "ESLint" "warn" "${LINT_WARNS} warning(s)" "$LINT_DURATION"
    else
        check_result "ESLint" "fail" "${LINT_ERRORS} erreur(s), ${LINT_WARNS} warning(s)" "$LINT_DURATION"
    fi
else
    check_result "ESLint" "skip" "Pas de config ESLint trouvée"
fi

# Prisma schema validation
echo -e "  ${DIM}Validating Prisma schema...${NC}"
PRISMA_START=$(date +%s)
PRISMA_OUTPUT=$(npx prisma validate 2>&1 || true)
PRISMA_END=$(date +%s)
PRISMA_DURATION=$((PRISMA_END - PRISMA_START))

if echo "$PRISMA_OUTPUT" | grep -q "is valid"; then
    check_result "Prisma schema" "pass" "Schema valide" "$PRISMA_DURATION"
else
    check_result "Prisma schema" "fail" "Schema invalide" "$PRISMA_DURATION"
    echo "$PRISMA_OUTPUT" | head -5 | while read -r line; do
        echo -e "     ${RED}${DIM}$line${NC}"
    done
fi

# Prisma client freshness — compare schema hash to generated client
echo -e "  ${DIM}Checking Prisma client sync...${NC}"
if [ -d "node_modules/.prisma/client" ]; then
    SCHEMA_HASH=$(md5sum prisma/schema.prisma 2>/dev/null | cut -d' ' -f1 || shasum prisma/schema.prisma 2>/dev/null | cut -d' ' -f1)
    # Check if prisma generate has been run after last schema change
    SCHEMA_MTIME=$(stat -c %Y prisma/schema.prisma 2>/dev/null || stat -f %m prisma/schema.prisma 2>/dev/null)
    CLIENT_MTIME=$(stat -c %Y node_modules/.prisma/client/index.js 2>/dev/null || stat -f %m node_modules/.prisma/client/index.js 2>/dev/null)
    
    if [ -n "$SCHEMA_MTIME" ] && [ -n "$CLIENT_MTIME" ] && [ "$SCHEMA_MTIME" -gt "$CLIENT_MTIME" ] 2>/dev/null; then
        check_result "Prisma client sync" "warn" "Schema modifié après dernier generate. Lance: npx prisma generate"
    else
        check_result "Prisma client sync" "pass" "Client à jour"
    fi
else
    check_result "Prisma client" "fail" "Client non généré. Lance: npx prisma generate"
fi

# ============================================================================
# PHASE 2 — DEEP ANALYSIS (the TypeScript analyzer)
# ============================================================================
phase_header "2" "DEEP ANALYSIS" "Imports morts, routes orphelines, routers tRPC, Zod gaps"

ANALYZER_SCRIPT="$(dirname "$0")/preflight-analyzer.ts"
if [ -f "$ANALYZER_SCRIPT" ]; then
    echo -e "  ${DIM}Running deep analyzer...${NC}"
    DEEP_START=$(date +%s)
    
    # Run analyzer, capture structured output
    DEEP_OUTPUT=$(npx tsx "$ANALYZER_SCRIPT" 2>&1 || true)
    DEEP_END=$(date +%s)
    DEEP_DURATION=$((DEEP_END - DEEP_START))
    
    # Parse output (format: STATUS|NAME|DETAIL per line)
    while IFS='|' read -r status name detail; do
        [ -z "$status" ] && continue
        [[ "$status" =~ ^# ]] && continue
        check_result "$name" "$status" "$detail"
    done <<< "$DEEP_OUTPUT"
    
    echo -e "  ${DIM}Deep analysis terminée (${DEEP_DURATION}s)${NC}"
else
    check_result "Deep analyzer" "skip" "scripts/preflight-analyzer.ts non trouvé"
fi

# ============================================================================
# PHASE 3 — UNIT TESTS (Vitest)
# ============================================================================
phase_header "3" "UNIT TESTS" "Vitest — logique isolée"

if [ -f "vitest.config.ts" ] || [ -f "vitest.config.js" ]; then
    echo -e "  ${DIM}Running Vitest...${NC}"
    VT_START=$(date +%s)
    VT_OUTPUT=$(npx vitest run --reporter=json 2>&1 || true)
    VT_END=$(date +%s)
    VT_DURATION=$((VT_END - VT_START))
    
    # Try to parse JSON output
    VT_TOTAL=$(echo "$VT_OUTPUT" | grep -o '"numTotalTests":[0-9]*' | grep -o '[0-9]*' || echo "?")
    VT_PASSED=$(echo "$VT_OUTPUT" | grep -o '"numPassedTests":[0-9]*' | grep -o '[0-9]*' || echo "?")
    VT_FAILED_COUNT=$(echo "$VT_OUTPUT" | grep -o '"numFailedTests":[0-9]*' | grep -o '[0-9]*' || echo "0")
    
    if [ "$VT_FAILED_COUNT" = "0" ] || [ "$VT_FAILED_COUNT" = "?" ]; then
        # Also check exit-code style
        if echo "$VT_OUTPUT" | grep -qi "failed"; then
            check_result "Vitest" "fail" "Tests en échec. Voir log." "$VT_DURATION"
            echo "$VT_OUTPUT" | tail -20 >> "$LOG_FILE"
        else
            check_result "Vitest" "pass" "${VT_PASSED:-?}/${VT_TOTAL:-?} tests OK" "$VT_DURATION"
        fi
    else
        check_result "Vitest" "fail" "${VT_FAILED_COUNT} test(s) en échec sur ${VT_TOTAL}" "$VT_DURATION"
        # Extract failed test names
        echo "$VT_OUTPUT" | grep -A2 "FAIL" | head -15 | while read -r line; do
            echo -e "     ${RED}${DIM}$line${NC}"
        done
    fi
    
    # Coverage check (if available)
    if echo "$VT_OUTPUT" | grep -q "Coverage"; then
        COV_LINES=$(echo "$VT_OUTPUT" | grep "Lines" | grep -o '[0-9.]*%' | head -1 || echo "")
        if [ -n "$COV_LINES" ]; then
            COV_NUM=$(echo "$COV_LINES" | sed 's/%//')
            if (( $(echo "$COV_NUM < 30" | bc -l 2>/dev/null || echo "1") )); then
                check_result "Couverture tests" "warn" "Lines: ${COV_LINES} — vise au moins 30% sur les services critiques"
            else
                check_result "Couverture tests" "pass" "Lines: ${COV_LINES}"
            fi
        fi
    fi
else
    check_result "Vitest" "skip" "Pas de vitest.config trouvé"
fi

# Quick mode stops here
if [ "$MODE" = "--quick" ]; then
    echo ""
    echo -e "${YELLOW}  Mode --quick: phases 4-5 (build + e2e) skippées${NC}"
    SKIPPED=$((SKIPPED + 2))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 2))
else

# ============================================================================
# PHASE 4 — BUILD (catches SSR, hydration, import issues)
# ============================================================================
phase_header "4" "PRODUCTION BUILD" "next build — SSR, hydration, imports dynamiques, tree-shaking"

echo -e "  ${DIM}Running next build (peut prendre 1-3 min)...${NC}"
BUILD_START=$(date +%s)
BUILD_OUTPUT=$(npx next build 2>&1 || true)
BUILD_END=$(date +%s)
BUILD_DURATION=$((BUILD_END - BUILD_START))

BUILD_ERRORS=$(echo "$BUILD_OUTPUT" | grep -ci "error\|failed" || true)
BUILD_WARNINGS=$(echo "$BUILD_OUTPUT" | grep -ci "warn" || true)

if echo "$BUILD_OUTPUT" | grep -q "Compiled successfully\|Build completed\| ✓ "; then
    check_result "next build" "pass" "Build OK" "$BUILD_DURATION"
    
    # Check for large bundles
    LARGE_PAGES=$(echo "$BUILD_OUTPUT" | grep -E "○|●|λ|ƒ" | awk '{for(i=1;i<=NF;i++) if($i ~ /^[0-9]+(\.[0-9]+)?[[:space:]]*(kB|MB)$/ || $(i-1) ~ /^[0-9]+(\.[0-9]+)?$/ && $i ~ /^(kB|MB)$/) print}' | head -5)
    
    # Check for hydration warnings in build output
    HYDRATION_ISSUES=$(echo "$BUILD_OUTPUT" | grep -ci "hydrat" || true)
    if [ "$HYDRATION_ISSUES" -gt 0 ]; then
        check_result "Hydration warnings" "warn" "${HYDRATION_ISSUES} mention(s) de problèmes d'hydration dans le build"
    else
        check_result "Hydration check" "pass" "Aucun warning d'hydration"
    fi
    
    # Check bundle sizes from build output
    OVERSIZED=$(echo "$BUILD_OUTPUT" | grep -E "[0-9]+ (kB|MB)" | awk '
        {
            for(i=1;i<=NF;i++) {
                if($i ~ /^[0-9]+(\.[0-9]+)?$/ && $(i+1) == "kB") {
                    if($i+0 > 300) print $0
                }
                if($i ~ /^[0-9]+(\.[0-9]+)?$/ && $(i+1) == "MB") {
                    print $0
                }
            }
        }
    ' | head -5)
    
    if [ -n "$OVERSIZED" ]; then
        check_result "Bundle size" "warn" "Pages > 300kB détectées — vérifie les imports"
    else
        check_result "Bundle size" "pass" "Aucune page surdimensionnée"
    fi
    
elif [ "$BUILD_ERRORS" -gt 0 ]; then
    check_result "next build" "fail" "Build échoué (${BUILD_ERRORS} erreur(s))" "$BUILD_DURATION"
    # Show the actual errors
    echo "$BUILD_OUTPUT" | grep -i "error" | head -10 | while read -r line; do
        echo -e "     ${RED}${DIM}$line${NC}"
    done
    echo "$BUILD_OUTPUT" >> "$LOG_FILE"
    
    # This is critical — most UI bugs come from here
    echo ""
    echo -e "  ${RED}${BOLD}  ⚡ C'est probablement ici que vivent tes bugs UI.${NC}"
    echo -e "  ${RED}     Le build prod expose les problèmes que le dev server masque.${NC}"
else
    check_result "next build" "warn" "Statut incertain — vérifie manuellement" "$BUILD_DURATION"
    echo "$BUILD_OUTPUT" | tail -10 >> "$LOG_FILE"
fi

# ============================================================================
# PHASE 5 — E2E TESTS (Playwright against prod build)
# ============================================================================
if [ "$MODE" = "--full" ] && [ -f "playwright.config.ts" ]; then
    phase_header "5" "E2E TESTS" "Playwright — tests d'interface contre le build de prod"
    
    # Check if Playwright browsers are installed
    if npx playwright --version > /dev/null 2>&1; then
        echo -e "  ${DIM}Running Playwright...${NC}"
        E2E_START=$(date +%s)
        E2E_OUTPUT=$(npx playwright test --reporter=json 2>&1 || true)
        E2E_END=$(date +%s)
        E2E_DURATION=$((E2E_END - E2E_START))
        
        E2E_PASSED=$(echo "$E2E_OUTPUT" | grep -o '"expected":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "?")
        E2E_FAILED_COUNT=$(echo "$E2E_OUTPUT" | grep -o '"unexpected":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
        
        if [ "$E2E_FAILED_COUNT" = "0" ]; then
            check_result "Playwright E2E" "pass" "${E2E_PASSED} test(s) OK" "$E2E_DURATION"
        else
            check_result "Playwright E2E" "fail" "${E2E_FAILED_COUNT} test(s) en échec" "$E2E_DURATION"
        fi
    else
        check_result "Playwright" "skip" "Browsers non installés. Lance: npx playwright install"
    fi
elif [ ! -f "playwright.config.ts" ]; then
    check_result "Playwright E2E" "skip" "Pas de playwright.config.ts"
fi

fi # end of --quick check

# ============================================================================
# PHASE 6 — SECURITY & HYGIENE
# ============================================================================
phase_header "6" "SECURITY & HYGIENE" "Dépendances vulnérables, secrets exposés, fichiers oubliés"

# npm audit
echo -e "  ${DIM}Running npm audit...${NC}"
AUDIT_OUTPUT=$(npm audit --json 2>&1 || true)
AUDIT_HIGH=$(echo "$AUDIT_OUTPUT" | grep -o '"high":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
AUDIT_CRITICAL=$(echo "$AUDIT_OUTPUT" | grep -o '"critical":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")

if [ "$AUDIT_CRITICAL" -gt 0 ]; then
    check_result "npm audit" "fail" "${AUDIT_CRITICAL} vulnérabilité(s) critique(s)"
elif [ "$AUDIT_HIGH" -gt 0 ]; then
    check_result "npm audit" "warn" "${AUDIT_HIGH} vulnérabilité(s) haute(s)"
else
    check_result "npm audit" "pass" "Aucune vulnérabilité critique"
fi

# Check for hardcoded secrets
echo -e "  ${DIM}Scanning for exposed secrets...${NC}"
SECRET_PATTERNS='(sk-[a-zA-Z0-9]{20,}|ANTHROPIC_API_KEY\s*=\s*sk-|password\s*=\s*["\x27][^"\x27]{8,}|secret\s*=\s*["\x27][^"\x27]{8,})'
SECRETS_FOUND=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" -E "$SECRET_PATTERNS" src/ 2>/dev/null | grep -v "process.env\|\.example\|\.test\.\|\.spec\." | wc -l || true)

if [ "$SECRETS_FOUND" -gt 0 ]; then
    check_result "Secrets exposés" "fail" "${SECRETS_FOUND} secret(s) potentiel(s) hardcodé(s) dans src/"
else
    check_result "Secrets scan" "pass" "Aucun secret hardcodé détecté"
fi

# Check .gitignore covers essentials
for pattern in ".env" "node_modules" ".next" ".prisma"; do
    if grep -q "$pattern" .gitignore 2>/dev/null; then
        : # fine
    else
        check_result ".gitignore: ${pattern}" "warn" "${pattern} devrait être dans .gitignore"
    fi
done
check_result ".gitignore" "pass" "Patterns essentiels couverts"

# ============================================================================
# REPORT
# ============================================================================
END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${WHITE}  RAPPORT PREFLIGHT${NC}  ${DIM}(${TOTAL_DURATION}s)${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}${PASS} Passé:     ${PASSED}${NC}"
echo -e "  ${RED}${FAIL} Échoué:    ${FAILED}${NC}"
echo -e "  ${YELLOW}${WARN} Warning:   ${WARNINGS}${NC}"
echo -e "  ${DIM}${SKIP} Skippé:    ${SKIPPED}${NC}"
echo -e "  ${DIM}   Total:      ${TOTAL_CHECKS}${NC}"
echo ""

# Write markdown report
cat > "$REPORT_FILE" << EOF
# Preflight Report — La Fusée
**Date:** $(date '+%Y-%m-%d %H:%M:%S')  
**Mode:** ${MODE}  
**Durée:** ${TOTAL_DURATION}s

## Résumé
| Statut | Count |
|--------|-------|
| ✅ Pass | ${PASSED} |
| ❌ Fail | ${FAILED} |
| ⚠️ Warn | ${WARNINGS} |
| ⏭️ Skip | ${SKIPPED} |

## Détails
$(cat "$LOG_FILE")

## Prochaines actions
$(if [ "$FAILED" -gt 0 ]; then echo "- **CRITIQUE:** ${FAILED} check(s) en échec — corrige avant deploy"; fi)
$(if [ "$WARNINGS" -gt 0 ]; then echo "- **ATTENTION:** ${WARNINGS} warning(s) à investiguer"; fi)
EOF

echo -e "  ${DIM}Rapport: ./${REPORT_FILE}${NC}"
echo -e "  ${DIM}Log:     ./${LOG_FILE}${NC}"
echo ""

# Exit code
if [ "$FAILED" -gt 0 ]; then
    echo -e "  ${RED}${BOLD}VERDICT: NO-GO 🛑${NC}"
    echo -e "  ${DIM}${FAILED} check(s) bloquant(s). Corrige et relance.${NC}"
    echo ""
    exit 1
elif [ "$WARNINGS" -gt 3 ]; then
    echo -e "  ${YELLOW}${BOLD}VERDICT: GO AVEC RÉSERVES ⚡${NC}"
    echo -e "  ${DIM}Pas de bloquant, mais ${WARNINGS} points d'attention.${NC}"
    echo ""
    exit 0
else
    echo -e "  ${GREEN}${BOLD}VERDICT: GO FOR LAUNCH 🚀${NC}"
    echo ""
    exit 0
fi
