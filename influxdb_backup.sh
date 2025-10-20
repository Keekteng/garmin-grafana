TIMESTAMP=$(date +%F_%H-%M)
BACKUP_DIR="./influxdb_backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
docker exec influxdb influxd backup -portable -db GarminStats /tmp/influxdb_backup
docker cp influxdb:/tmp/influxdb_backup "$BACKUP_DIR"
docker exec influxdb rm -r "/tmp/influxdb_backup"