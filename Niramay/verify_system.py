import subprocess, os, json, sys

results = []

def run(label, cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    results.append({
        "check": label,
        "output": r.stdout.strip(),
        "error": r.stderr.strip(),
        "code": r.returncode
    })

# Use PowerShell-compatible commands
# FOLDER STRUCTURE
run("simulation folder contents",
    'powershell -Command "Get-ChildItem -Recurse -File backend/app/simulation -Name 2>$null; if(-not $?) { echo NOT_FOUND }"')

run("engines folder contents",
    'powershell -Command "Get-ChildItem -Recurse -File backend/app/detection/engines -Name 2>$null; if(-not $?) { echo NOT_FOUND }"')

run("dead files still present",
    'powershell -Command "foreach($f in @(\'backend/app/observation/store.py\',\'backend/app/observation/schemas.py\',\'backend/app/db/models.py\',\'backend/app/db/session.py\',\'backend/niramay.db\')) { if(Test-Path $f) { echo EXISTS:$f } else { echo GONE:$f } }"')

# ACTIVE SQLITE USAGE  
run("sqlite imports in active code",
    'powershell -Command "Get-ChildItem -Recurse -Include *.py backend/app/api,backend/app/detection,backend/app/healing,backend/app/ingestion | Where-Object { $_.Name -notin @(\'store.py\',\'schemas.py\',\'models.py\',\'session.py\') } | Select-String -Pattern \'from app.db|sqlalchemy|get_db|db.query\' | ForEach-Object { $_.ToString() }; if(-not $?) { echo NONE_FOUND }"')

# Also check middleware specifically
run("sqlite in middleware",
    'powershell -Command "Select-String -Path backend/app/observation/middleware.py -Pattern \'from app.db|sqlalchemy|get_db|db.query\' 2>$null; if(-not $matches) { echo NONE_FOUND }"')

# DETECTION INDEX PURITY
run("detection index side effects check",
    'powershell -Command "Select-String -Path backend/app/detection/index.py -Pattern \'redis|opensearch|sqlite|lpush|rpush|write_\' 2>$null; if(-not $?) { echo PURE_NO_SIDE_EFFECTS }"')

# MIDDLEWARE CHECK
run("middleware uses rabbitmq not store",
    'powershell -Command "Select-String -Path backend/app/observation/middleware.py -Pattern \'observation_store|rabbitmq_publisher|publish\' | ForEach-Object { $_.ToString() }"')

# CONFIG CHECK
run("config no DATABASE_URL",
    'powershell -Command "Select-String -Path backend/app/core/config.py -Pattern \'DATABASE_URL\' | ForEach-Object { $_.ToString() }; if(-not $matches) { echo DATABASE_URL_REMOVED }"')

run("config has RABBITMQ settings",
    'powershell -Command "Select-String -Path backend/app/core/config.py -Pattern \'RABBITMQ|REDIS_HOST|OPENSEARCH|RATE_BASED|SILENCE|DETECTION_\' | ForEach-Object { $_.ToString() }"')

# REDIS CLIENT
run("shared redis client exists",
    'powershell -Command "if(Test-Path backend/app/core/redis_client.py) { echo EXISTS; Select-String -Path backend/app/core/redis_client.py -Pattern \'def get_sync_redis|def get_async_redis|redis_client\' | ForEach-Object { $_.ToString() } } else { echo NOT_FOUND }"')

# RABBITMQ PUBLISHER
run("rabbitmq publisher exists",
    'powershell -Command "if(Test-Path backend/app/ingestion/rabbitmq_publisher.py) { echo EXISTS; Select-String -Path backend/app/ingestion/rabbitmq_publisher.py -Pattern \'def publish|class RabbitMQPublisher|rabbitmq_publisher\' | ForEach-Object { $_.ToString() } } else { echo NOT_FOUND }"')

# DOCKER COMPOSE VOLUME
run("docker compose opensearch volume",
    'powershell -Command "Select-String -Path docker-compose.yml -Pattern \'opensearch_data\' | ForEach-Object { $_.ToString() }"')

run("docker compose full volumes section",
    'powershell -Command "Select-String -Path docker-compose.yml -Pattern \'redis_data|rabbitmq_data|opensearch_data\' | ForEach-Object { $_.ToString() }"')

# OPENSEARCH CLIENT READ METHODS
run("opensearch client read methods",
    'powershell -Command "Select-String -Path backend/app/ingestion/opensearch_client.py -Pattern \'def get_recent_logs|def get_anomaly_history|def get_logs_after_timestamp|def write_healing_record\' | ForEach-Object { $_.ToString() }"')

# API ENDPOINTS NEW ROUTES
run("api new endpoints present",
    'powershell -Command "Select-String -Path backend/app/api/v1/endpoints.py -Pattern \'escalations|logs/history|anomalies/history\' | ForEach-Object { $_.ToString() }"')

# API READS FROM REDIS NOT SQLITE
run("api reads from redis",
    'powershell -Command "Select-String -Path backend/app/api/v1/endpoints.py -Pattern \'lrange|llen|hgetall\' | ForEach-Object { $_.ToString() }"')

# REDIS KEYS IN WORKER
run("detection worker redis keys",
    'powershell -Command "Select-String -Path backend/app/detection/worker.py -Pattern \'observation:anomalies|observation:logs|healing:actions|escalation:alerts|anomaly_stats\' | ForEach-Object { $_.ToString() }"')

# VERIFICATION WORKER USES OPENSEARCH
run("verification worker uses opensearch not sqlite",
    'powershell -Command "Select-String -Path backend/app/healing/verification_worker.py -Pattern \'opensearch|sqlite|db.query|get_logs_after\' | ForEach-Object { $_.ToString() }"')

# FRONTEND TYPE CHECKS
run("frontend designSystem field names",
    'powershell -Command "Select-String -Path frontend/src/designSystem.ts -Pattern \'response_time_ms|failure_tag|requires_llm|healing_action|detection_id\' | ForEach-Object { $_.ToString() }"')

run("frontend old field names still present",
    'powershell -Command "Select-String -Path frontend/src/designSystem.ts -Pattern \'response_time:|failure_type:|requires_llm_analysis\' | ForEach-Object { $_.ToString() }; if(-not $matches) { echo NO_OLD_FIELDS_FOUND }"')

run("frontend livevisualizer crash fixes",
    'powershell -Command "Select-String -Path frontend/src/pages/LiveVisualizer.tsx -Pattern \'anomalyData|response_time_ms|healing_action|anomalies.length\' | ForEach-Object { $_.ToString() }"')

# TEST RESULTS
run("test suite results",
    'cd backend && python test_imports.py 2>&1')

# PROJECT STRUCTURE OVERVIEW
run("full project structure",
    'powershell -Command "Get-ChildItem -Recurse -File -Include *.py backend/app | ForEach-Object { $_.FullName.Replace((Get-Location).Path + \'\\\', \'\') } | Sort-Object"')

# PRINT ALL RESULTS
print("=" * 60)
print("NIRAMAY VERIFICATION REPORT")
print("=" * 60)
for r in results:
    print(f"\n>>> {r['check'].upper()}")
    print("-" * 40)
    if r['output']:
        print(r['output'])
    if r['error']:
        print(f"STDERR: {r['error'][:500]}")
    if not r['output'] and not r['error']:
        print("(no output)")
print("\n" + "=" * 60)
print("END OF REPORT")
print("=" * 60)
