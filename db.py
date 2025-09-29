# Imports
from questdb.ingress import Sender

# Generate config
address = "localhost:9000"
username = "admin"
password = "quest"

config = f"http::addr={address};username={username};password={password};"

# Insert data
table_name = "telemetry data"

with Sender.from_conf(config) as sender:
    sender.row(
        table_name,
        columns = {
            "hi": 9
        }
    )

    flush()